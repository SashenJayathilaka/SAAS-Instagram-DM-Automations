import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ai-routing", () => ({ createProvider: vi.fn(), withAiProvider: vi.fn() }));
import { parsePolicyScanResult } from "./ai-policy-scan";
import { policyScanInputSchema, policyReplacementPreservesTokens } from "./automation-policy";
const input = { integrationId: "ecbcaf2e-7e22-4f78-a82b-066171489842", sections: [{ id: "message", label: "Direct Message", texts: ["Buy now {{username}} https://ap3k.com/go"] }] };
const finding = { sectionId: "message", textIndex: 0, title: "Pressure", reason: "Consider softer wording", quote: "Buy now", replacement: "See details {{username}} https://ap3k.com/go" };
describe("policy scan output", () => {
  it("accepts supported findings and a safe complete rewrite", () => expect(parsePolicyScanResult(JSON.stringify({ findings: [finding] }), input)).toEqual([{ ...finding, quote: input.sections[0].texts[0] }]));
  it("returns the complete reviewed source for stale-draft-safe replacement", () => {
    const result = parsePolicyScanResult(JSON.stringify({ findings: [finding] }), input)[0];
    expect(finding.quote).not.toBe(input.sections[0].texts[0]);
    expect(result.quote).toBe(input.sections[0].texts[0]);
  });
  it("retains the editor Username token", () => {
    expect(policyReplacementPreservesTokens("Hello Username", "Thanks Username")).toBe(true);
    expect(policyReplacementPreservesTokens("Hello Username", "Thanks friend")).toBe(false);
    expect(policyReplacementPreservesTokens("Hello", "Hello Username")).toBe(false);
  });
  it("keeps findings but excludes rewrites for structural or trigger sections", () => {
    for (const sectionId of ["trigger", "links", "node:example:options", "node:example:card:0"]) {
      const structural = { ...input, sections: [{ ...input.sections[0], id: sectionId }] };
      expect(parsePolicyScanResult(JSON.stringify({ findings: [{ ...finding, sectionId }] }), structural)[0].replacement).toBeUndefined();
    }
  });
  it("does not offer a rewrite that exceeds the editor field limit", () => {
    const draft = {...input,sections:[{id:"reply",label:"Auto Reply",texts:["Hello Username"]}]};
    expect(parsePolicyScanResult(JSON.stringify({findings:[{...finding,sectionId:"reply",quote:"Hello",replacement:"x".repeat(221)+" Username"}]}),draft)[0].replacement).toBeUndefined();
  });
  it("accepts no findings without fabricating approval", () => expect(parsePolicyScanResult('{"findings":[]}', input)).toEqual([]));
  it.each([{ textIndex: 9 }, { sectionId: "invented" }, { quote: "not in draft" }, { quote: "" }])("rejects unsupported references %j", override => expect(() => parsePolicyScanResult(JSON.stringify({ findings: [{ ...finding, ...override }] }), input)).toThrow());
  it("removes rewrites that change URLs or template tokens", () => {
    for (const replacement of ["See https://evil.example {{username}}", "See https://ap3k.com/go", "See {{other}} https://ap3k.com/go"]) {
      expect(parsePolicyScanResult(JSON.stringify({ findings: [{ ...finding, replacement }] }), input)[0].replacement).toBeUndefined();
    }
  });
  it("rejects malformed and duplicate model findings", () => {
    expect(() => parsePolicyScanResult("not json", input)).toThrow();
    expect(() => parsePolicyScanResult(JSON.stringify({ findings: [finding, finding] }), input)).toThrow();
  });
  it("checks exact mentions and every duplicate token", () => {
    expect(policyReplacementPreservesTokens("Hi @username {{name}}", "Hello @username {{name}}")).toBe(true);
    expect(policyReplacementPreservesTokens("Hi @username {{name}}", "Hello @different {{name}}")).toBe(false);
    expect(policyReplacementPreservesTokens("{{name}} {{name}}", "{{name}}")).toBe(false);
  });
  it("bounds untrusted draft input and disallows duplicate IDs", () => {
    expect(policyScanInputSchema.safeParse(input).success).toBe(true);
    expect(policyScanInputSchema.safeParse({ ...input, sections: [input.sections[0], input.sections[0]] }).success).toBe(false);
    expect(policyScanInputSchema.safeParse({ ...input, sections: [{ ...input.sections[0], texts: ["x".repeat(8001)] }] }).success).toBe(false);
    expect(policyScanInputSchema.safeParse({ ...input, plan: "BUSINESS" }).success).toBe(false);
  });
});
