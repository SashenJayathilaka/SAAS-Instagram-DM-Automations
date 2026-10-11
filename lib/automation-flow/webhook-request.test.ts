import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: m.lookup }));
vi.mock("node:https", () => ({ request: m.request }));
import { executeFlowWebhook } from "./webhook-request";
import { isPublicWebhookAddress, parseWebhookUrl, renderWebhookBody, WEBHOOK_RESPONSE_LIMIT } from "./webhook-contract";
const input = { url: "https://hooks.example.com/catch/secret?key=private", body: '{"email":"{{email}}","name":"{{name}}"}', values: { email: "alex@example.com", name: "Alex" }, idempotencyKey: "a".repeat(64) };
let response: EventEmitter & { statusCode: number; headers: Record<string, string>; destroy: ReturnType<typeof vi.fn> };
let req: EventEmitter & { end: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
let chunks: Buffer[];
beforeEach(() => {
  vi.resetAllMocks();
  chunks = [Buffer.from('{"ok":true}')];
  response = Object.assign(new EventEmitter(), { statusCode: 200, headers: {}, destroy: vi.fn() });
  req = Object.assign(new EventEmitter(), { end: vi.fn(), destroy: vi.fn() });
  m.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  m.request.mockImplementation((_options, callback) => {
    req.end.mockImplementation(() => queueMicrotask(() => {
      callback(response);
      for (const chunk of chunks) response.emit("data", chunk);
      response.emit("end");
    }));
    return req;
  });
});
afterEach(() => vi.useRealTimers());
describe("owner configured external flow requests", () => {
  it("pins a verified address while preserving the TLS hostname and sends one POST", async () => {
    await expect(executeFlowWebhook(input)).resolves.toEqual({ status: 200 });
    expect(m.lookup).toHaveBeenCalledWith("hooks.example.com", { all: true, family: 4, verbatim: true });
    const options = m.request.mock.calls[0][0];
    expect(options).toMatchObject({ hostname: "hooks.example.com", port: 443, method: "POST", path: "/catch/secret?key=private", agent: false, rejectUnauthorized: true, family: 4 });
    expect(options.headers).toMatchObject({ "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey, "Accept-Encoding": "identity" });
    const resolved = vi.fn();
    m.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    options.lookup("hooks.example.com", {}, resolved);
    expect(resolved).toHaveBeenCalledWith(null, "93.184.216.34", 4);
    expect(m.lookup).toHaveBeenCalledTimes(1);
    expect(m.request).toHaveBeenCalledTimes(1);
    expect(JSON.parse(req.end.mock.calls[0][0])).toEqual({ email: "alex@example.com", name: "Alex" });
  });
  it.each(["https://127.0.0.1/x", "https://2130706433/x", "https://0x7f000001/x", "https://169.254.169.254/latest/meta-data", "https://[::1]/x", "https://[::ffff:127.0.0.1]/x", "http://hooks.example.com/x", "https://user:pass@hooks.example.com/x", "https://hooks.example.com:444/x", "https://service.internal/x", "https://localhost./x"])("rejects unsafe destinations before DNS: %s", async url => {
    await expect(executeFlowWebhook({ ...input, url })).rejects.toThrow("webhook_invalid_destination");
    expect(m.lookup).not.toHaveBeenCalled();
    expect(m.request).not.toHaveBeenCalled();
  });
  // PayloadsAllTheThings SSRF parser variants. DNS and HTTPS stay mocked:
  // no request to loopback, metadata or any external service is made.
  it.each([
    "https://127.1/x",
    "https://0177.0.0.1/x",
    "https://0x7f.1/x",
    "https://127.000.000.001/x",
    "https://%31%32%37.0.0.1/x",
    "https://127。0。0。1/x",
    "https://[::ffff:7f00:1]/x",
    "https://hooks.example.com@127.1/x",
    "https://127.1/#@hooks.example.com",
    "https://0xa9fea9fe/latest/meta-data",
    "https://0251.0376.0251.0376/latest/meta-data",
    "https://2852039166/latest/meta-data",
    "https://metadata.google.internal/computeMetadata/v1/",
  ])("rejects encoded and alternate private destinations before DNS: %s", async url => {
    await expect(executeFlowWebhook({ ...input, url })).rejects.toThrow("webhook_invalid_destination");
    expect(m.lookup).not.toHaveBeenCalled();
    expect(m.request).not.toHaveBeenCalled();
  });
  it("rejects a public-looking DNS alias resolving to loopback", async () => {
    m.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    await expect(executeFlowWebhook({ ...input, url: "https://127.0.0.1.nip.io/x" })).rejects.toThrow("webhook_private_destination");
    expect(m.request).not.toHaveBeenCalled();
  });
  it.each([
    [{ address: "10.0.0.1", family: 4 }],
    [{ address: "93.184.216.34", family: 4 }, { address: "192.168.0.1", family: 4 }],
    [{ address: "169.254.169.254", family: 4 }],
    [{ address: "::ffff:127.0.0.1", family: 6 }],
    [],
  ])("fails closed on private, mixed, unsupported or empty DNS answers", async (...records) => {
    // Vitest spreads array test cases; restore the answer list.
    m.lookup.mockResolvedValue(records);
    await expect(executeFlowWebhook(input)).rejects.toThrow("webhook_private_destination");
    expect(m.request).not.toHaveBeenCalled();
  });
  it("rechecks the execution lease after DNS and never posts a cancelled action", async () => {
    const beforeSend = vi.fn().mockResolvedValue(false);
    await expect(executeFlowWebhook({ ...input, beforeSend })).rejects.toThrow("webhook_cancelled");
    expect(m.lookup).toHaveBeenCalledTimes(1);
    expect(beforeSend).toHaveBeenCalledTimes(1);
    expect(m.request).not.toHaveBeenCalled();
  });
  it("rejects redirects and never requests their destinations", async () => {
    response.statusCode = 302;
    response.headers.location = "https://127.0.0.1/admin";
    await expect(executeFlowWebhook(input)).rejects.toThrow("webhook_redirect_blocked");
    expect(m.request).toHaveBeenCalledTimes(1);
    expect(response.destroy).toHaveBeenCalled();
  });
  it("does not retry non-success responses or ambiguous connection errors", async () => {
    response.statusCode = 503;
    await expect(executeFlowWebhook(input)).rejects.toThrow("webhook_http_error");
    expect(m.request).toHaveBeenCalledTimes(1);
    m.request.mockImplementation(() => { req.end.mockImplementation(() => queueMicrotask(() => req.emit("error", new Error("reset")))); return req; });
    await expect(executeFlowWebhook(input)).rejects.toThrow("webhook_request_failed");
    expect(m.request).toHaveBeenCalledTimes(2);
  });
  it("bounds both declared and streamed response bodies without storing their contents", async () => {
    response.headers["content-length"] = String(WEBHOOK_RESPONSE_LIMIT + 1);
    await expect(executeFlowWebhook(input)).rejects.toThrow("webhook_response_too_large");
    delete response.headers["content-length"];
    response.removeAllListeners();
    chunks = [Buffer.alloc(WEBHOOK_RESPONSE_LIMIT), Buffer.from("x")];
    await expect(executeFlowWebhook(input)).rejects.toThrow("webhook_response_too_large");
  });
  it("refuses encoded responses instead of inflating an unbounded compressed body", async () => {
    response.headers["content-encoding"] = "gzip";
    await expect(executeFlowWebhook(input)).rejects.toThrow("webhook_encoded_response");
  });
  it("bounds total time including DNS and cannot send after the timeout", async () => {
    vi.useFakeTimers();
    let finishLookup: (value: unknown) => void = () => {};
    m.lookup.mockReturnValue(new Promise(resolve => { finishLookup = resolve; }));
    const pending = expect(executeFlowWebhook(input)).rejects.toThrow("webhook_timeout");
    await vi.advanceTimersByTimeAsync(5000);
    await pending;
    finishLookup([{ address: "93.184.216.34", family: 4 }]);
    await Promise.resolve();
    expect(m.request).not.toHaveBeenCalled();
  });
  it("destroys a stalled response at the same deadline without retrying", async () => {
    vi.useFakeTimers();
    m.request.mockImplementation(() => req);
    const pending = expect(executeFlowWebhook(input)).rejects.toThrow("webhook_timeout");
    await vi.advanceTimersByTimeAsync(5000);
    await pending;
    expect(req.destroy).toHaveBeenCalled();
    expect(m.request).toHaveBeenCalledTimes(1);
  });
});
describe("external-request body and address contracts", () => {
  it("blocks non-global address ranges, including cloud metadata aliases", () => {
    for (const ip of ["0.1.2.3", "100.64.0.1", "172.16.0.1", "192.0.2.1", "192.88.99.1", "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255", "168.63.129.16", "::1", "1.2.3.999"]) expect(isPublicWebhookAddress(ip), ip).toBe(false);
    expect(isPublicWebhookAddress("8.8.8.8")).toBe(true);
    expect(parseWebhookUrl("https://hooks.zapier.com/hooks/catch/123/abc/")).not.toBeNull();
  });
  it("escapes contact values inside JSON strings without changing the body structure", () => {
    const payload = 'Alex", "admin":true, "tail":"';
    expect(JSON.parse(renderWebhookBody('{"name":"{{name}}","nested":["{{name}}"],"active":true}', { name: payload }))).toEqual({ name: payload, nested: [payload], active: true });
  });
  it("rejects variable property names, unsafe keys, scalar payloads and excessive depth", () => {
    for (const body of ['{"{{name}}":"value"}', '{"__proto__":{"admin":true}}', '{"constructor":{}}', '[]', '"text"', '{invalid']) expect(() => renderWebhookBody(body, {})).toThrow("webhook_invalid_body");
    const deep = JSON.stringify({ nested: Array.from({ length: 10 }).reduce(value => ({ inner: value }), {} as unknown) });
    expect(() => renderWebhookBody(deep, {})).toThrow("webhook_invalid_body");
  });
  it("bounds the interpolated UTF-8 payload and only reads own string values", () => {
    expect(() => renderWebhookBody('{"body":"{{large}}"}', { large: "😀".repeat(5000) })).toThrow("webhook_body_too_large");
    expect(renderWebhookBody('{"a":"{{missing}}","b":"{{constructor}}"}', {})).toBe('{"a":"","b":""}');
    expect(() => renderWebhookBody(JSON.stringify({ text: "a".repeat(8192) }), {})).toThrow("webhook_invalid_body");
  });
});
