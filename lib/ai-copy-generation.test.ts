import { beforeEach, describe, expect, it, vi } from "vitest";

const { complete } = vi.hoisted(() => ({ complete: vi.fn() }));
vi.mock("openai", () => ({ default: class { chat = { completions: { create: complete } }; } }));
vi.mock("@/lib/prisma", () => ({ client: { aiProviderConfig: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findMany: vi.fn().mockResolvedValue([{ id: "google", enabled: true, model: "gemini-3.5-flash-lite", encryptedApiKey: "test", benchmarkLatencyMs: 100 }]) } } }));
vi.mock("@/lib/ai-provider-crypto", () => ({ decryptAiProviderSecret: () => "test-only" }));

import { generateAutomationCopy } from "./ai-reply";

describe("AI editor generation boundaries", () => {
  beforeEach(() => complete.mockReset());
  const output = (items: string[]) => complete.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ items }) } }] });
  const base = { mode: "MESSAGE_VARIATIONS" as const, integrationId: "test", text: "Tap below for the guide.", hasButtons: true, linkButtons: [{ label: "Get the guide", url: "https://example.com/guide" }] };
  it("generates only one anonymous manual reply even when the provider adds personalization", async () => {
    for (const token of ["{{username}}", "Username", "@test.creator"]) {
      output([`Thanks ${token}! Check your DMs 😊`, "A second reply"]);
      expect(await generateAutomationCopy({ mode: "COMMENT_REPLIES", integrationId: "test", sendDm: true, instructions: "Always include Username" })).toEqual(["Thanks! Check your DMs 😊"]);
    }
    expect(JSON.parse(complete.mock.calls[0][0].messages[1].content).prompt).toBeUndefined();
    expect(complete.mock.calls[0][0].messages[0].content).toContain("with 1 distinct strings");
  });
  it("generates five initial variations and one additional variation using the link context", async () => {
    const five = ["Your guide is below.", "Open your guide below.", "Get the guide with this button.", "Enjoy the guide below!", "The button opens your guide."];
    output(five);
    expect(await generateAutomationCopy(base)).toEqual(five);
    expect(JSON.parse(complete.mock.calls[0][0].messages[1].content).links).toEqual(base.linkButtons);
    output(["Read the guide with the button below."]);
    expect(await generateAutomationCopy({ ...base, count: 1, existing: five })).toEqual(["Read the guide with the button below."]);
    expect(complete.mock.calls[1][0].messages[0].content).toContain("with 1 distinct strings");
  });
  it("rejects incomplete message and link inputs before invoking AI", async () => {
    expect(await generateAutomationCopy({ ...base, text: " " })).toBeNull();
    expect(await generateAutomationCopy({ ...base, linkButtons: [] })).toBeNull();
    expect(await generateAutomationCopy({ ...base, linkButtons: [{ label: "Guide", url: "" }] })).toBeNull();
    expect(complete).not.toHaveBeenCalled();
  });
  it("rejects duplicates, incomplete batches, lost variables, and altered links", async () => {
    output([base.text]);
    expect(await generateAutomationCopy({ ...base, count: 1 })).toBeNull();
    output(["Only one new draft"]);
    expect(await generateAutomationCopy(base)).toBeNull();
    expect(await generateAutomationCopy({ ...base, count: 1, text: "Hello {{username}}, tap below." })).toBeNull();
    expect(await generateAutomationCopy({ ...base, count: 1, text: "Read https://example.com/guide" })).toBeNull();
    output(["Visit https://invented.example/offer"]);
    expect(await generateAutomationCopy({ ...base, count: 1 })).toBeNull();
  });
  it("allows plain-text variations without a link while preserving authored personalization", async () => {
    output(["Hi {{username}}, welcome aboard!"]);
    expect(await generateAutomationCopy({ ...base, count: 1, hasButtons: false, linkButtons: [], text: "Welcome {{username}}!" })).toEqual(["Hi {{username}}, welcome aboard!"]);
  });
  it("does not save a sample comment as a regenerated AI prompt", async () => {
    complete.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ prompt: "Thank you so much, Username! Check your DMs 😊" }) } }] });
    expect(await generateAutomationCopy({ mode: "COMMENT_PROMPT", integrationId: "test", sendDm: true })).toBeNull();
    complete.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ prompt: "Thank Username briefly and invite them to check their DMs with a happy emoji." }) } }] });
    expect(await generateAutomationCopy({ mode: "COMMENT_PROMPT", integrationId: "test", sendDm: true })).toEqual(["Thank Username briefly and invite them to check their DMs with a happy emoji."]);
  });
  it("keeps the public comment prompt out of DM generation", async () => {
    complete.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ items: ["Hi {{username}}! Visit AP3K using the button below."] }) } }] });
    const result = await generateAutomationCopy({ mode: "MESSAGE", integrationId: "test", text: "Hi {{username}}! Tap below to visit AP3K.", instructions: "Thank Username and tell them to check their DMs.", hasButtons: true });
    expect(result).toEqual(["Hi {{username}}! Visit AP3K using the button below."]);
    const source = JSON.parse(complete.mock.calls[0][0].messages[1].content);
    expect(source.prompt).toBeUndefined();
    expect(source.text).toContain("{{username}}");
  });
});
