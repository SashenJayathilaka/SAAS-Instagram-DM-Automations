import { describe, expect, it, vi } from "vitest";
import { previewFlowAction } from "./action-preview";
import { validateFlow, type Flow, type FlowNode } from "./definition";
const base = { id: "step", label: "Action", x: 0, y: 0, next: null };
describe("action preview and schema parity", () => {
  it("adds tags compatibly and removes them without mutating the input contact", () => {
    const contact = { tag_vip: "true", name: "Alex" };
    expect(previewFlowAction({ ...base, kind: "tag", tag: "vip", action: "remove" }, contact)?.values).toEqual({ name: "Alex" });
    expect(contact.tag_vip).toBe("true");
    expect(previewFlowAction({ ...base, kind: "tag", tag: "vip" }, {})?.values).toEqual({ tag_vip: "true" });
  });
  it("simulates webhooks without network calls or leaking the endpoint secret", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const result = previewFlowAction({ ...base, kind: "webhook", url: "https://hooks.zapier.com/hooks/catch/private-secret/?token=hidden", body: '{"email":"{{email}}"}' }, { email: "alex@example.com" });
    expect(result).toMatchObject({ values: { email: "alex@example.com" }, next: null, notice: expect.stringContaining("No request is sent") });
    expect(result?.notice).not.toContain("private-secret");
    expect(result?.notice).not.toContain("hidden");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("reports unconfigured draft requests instead of pretending to execute them", () => {
    expect(previewFlowAction({ ...base, kind: "webhook", url: "", body: "{}" }, {})?.error).toContain("Configure");
  });
  it("validates configured public HTTPS requests and rejects variable property names", () => {
    const node: FlowNode = { ...base, kind: "webhook", url: "https://hooks.zapier.com/hooks/catch/example", body: '{"email":"{{email}}"}' };
    const flow: Flow = { version: 1, oncePerContact: false, entry: "step", nodes: [node] };
    expect(validateFlow(flow).errors).toEqual([]);
    expect(validateFlow({ ...flow, nodes: [{ ...node, body: '{"{{field}}":"value"}' }] }).flow).toBeNull();
    expect(validateFlow({ ...flow, nodes: [{ ...node, url: "https://127.0.0.1/" }] }).flow).toBeNull();
  });
  it("bounds external-request bursts between customer responses or delays", () => {
    const nodes: FlowNode[] = Array.from({ length: 4 }, (_, index) => ({ ...base, id: `hook${index}`, kind: "webhook", url: "https://hooks.zapier.com/hooks/catch/example", body: "{}", next: index === 3 ? null : `hook${index + 1}` }));
    expect(validateFlow({ version: 1, oncePerContact: false, entry: "hook0", nodes }).errors.join()).toContain("three external requests");
  });
});
