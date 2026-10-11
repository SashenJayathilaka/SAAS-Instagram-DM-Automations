import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeQStashScheduler, QSTASH_SCHEDULER_URL } from "./qstash-scheduler-auth";

const current = "test-current-qstash-signing-key";
const next = "test-next-qstash-signing-key";
async function token(body = "", overrides: Record<string, unknown> = {}, key = current, algorithm = "HS256") {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ iss: "Upstash", sub: QSTASH_SCHEDULER_URL, iat: now, nbf: now, exp: now + 300,
    body: createHash("sha256").update(body).digest("base64url"), ...overrides })
    .setProtectedHeader({ alg: algorithm }).sign(new TextEncoder().encode(key));
}
function request(signature?: string, body = "", url = QSTASH_SCHEDULER_URL) {
  return new Request(url, { method: "POST", body, headers: signature ? { "Upstash-Signature": signature } : {} });
}
beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", current);
  vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", next);
});
afterEach(() => vi.unstubAllEnvs());

describe("QStash scheduler request authentication", () => {
  it("accepts real signatures with either rotating key and padded body hashes", async () => {
    expect(await authorizeQStashScheduler(request(await token()))).toBe(true);
    expect(await authorizeQStashScheduler(request(await token("", {}, next)))).toBe(true);
    const body = '{"check":"✓"}';
    expect(await authorizeQStashScheduler(request(await token(body, { body: createHash("sha256").update(body).digest("base64url") + "=" }), body))).toBe(true);
  });
  it("rejects missing configuration or signatures and untrusted keys", async () => {
    expect(await authorizeQStashScheduler(request())).toBe(false);
    expect(await authorizeQStashScheduler(request("invalid.jwt"))).toBe(false);
    expect(await authorizeQStashScheduler(request(await token("", {}, "another-account")))).toBe(false);
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", ""); vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "");
    expect(await authorizeQStashScheduler(request(await token()))).toBe(false);
  });
  it("binds signatures to the exact production endpoint and POST method", async () => {
    const signed = await token();
    expect(await authorizeQStashScheduler(request(signed, "", QSTASH_SCHEDULER_URL + "?test=1"))).toBe(false);
    expect(await authorizeQStashScheduler(request(signed, "", "https://preview.vercel.app/api/cron/automation-follow-ups"))).toBe(false);
    expect(await authorizeQStashScheduler(new Request(QSTASH_SCHEDULER_URL, { headers: { "Upstash-Signature": signed } }))).toBe(false);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(await authorizeQStashScheduler(request(signed))).toBe(false);
    vi.stubEnv("VERCEL_ENV", "");
    expect(await authorizeQStashScheduler(request(signed))).toBe(false);
  });
  it("rejects expired, future, incomplete, wrong-destination and wrong-algorithm tokens", async () => {
    const now = Math.floor(Date.now() / 1000);
    for (const overrides of [{ exp: now - 60 }, { nbf: now + 60 }, { iat: now - 1000 }, { exp: undefined }, { nbf: undefined }, { iat: undefined }, { body: undefined }, { iss: "Other" }, { sub: "https://example.com" }]) {
      expect(await authorizeQStashScheduler(request(await token("", overrides)))).toBe(false);
    }
    expect(await authorizeQStashScheduler(request(await token("", {}, current, "HS384")))).toBe(false);
  });
  it("rejects body tampering, oversized bodies and malformed digests", async () => {
    expect(await authorizeQStashScheduler(request(await token(), "{}"))).toBe(false);
    const large = "x".repeat(1025);
    expect(await authorizeQStashScheduler(request(await token(large), large))).toBe(false);
    expect(await authorizeQStashScheduler(request(await token("", { body: "wrong" })))).toBe(false);
    expect(await authorizeQStashScheduler(request("x".repeat(16385)))).toBe(false);
  });
});
