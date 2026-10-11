import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ add: vi.fn(), test: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/providers/i18n-provider", () => ({ useI18n: () => ({ locale: "en" }) }));
vi.mock("@/actions/ai-workspace", () => ({ addAiKnowledgeAction: mocks.add, testAiWorkspaceAction: mocks.test, saveAiWorkspaceAction: vi.fn(), clearAiPlaygroundAction: vi.fn(), deleteAiKnowledgeAction: vi.fn(), savePlaygroundMessageAsKnowledgeAction: vi.fn() }));
import Ap3kAiConsole from "./ap3k-ai-console";
const initial = { aiRepliesEnabled: false, aiCommentsEnabled: false, role: "Help customers", brandVoice: "", guardrails: "", defaultTone: "FRIENDLY" as const, protectionRules: { INSULTS_HATE: "SKIP", CRITIQUE_NEGATIVE: "SKIP", UNANSWERABLE: "SKIP", BEGGING_SOLICITATION: "SKIP" } as const, knowledge: [] };
let tree: ReactTestRenderer;
function text(node: any): string { return typeof node === "string" ? node : (node?.children || []).map(text).join(""); }
async function click(label: string) { await act(async () => { tree.root.findAllByType("button").find(button => text(button).trim() === label)!.props.onClick(); }); }
beforeEach(async () => { vi.clearAllMocks(); mocks.add.mockResolvedValue({ status: 200, data: "Knowledge added.", knowledge: [{ id: "note", title: "Returns", content: "Return within 30 days." }] }); await act(async () => { tree = create(<Ap3kAiConsole slug="owner" integrationId="ig" initial={initial} plan="PRO" />); }); });
afterEach(async () => { await act(async () => tree.unmount()); });
it("updates setup immediately after saving knowledge and requires a successful test for the third step", async () => {
  expect(text(tree.toJSON())).toContain("1 of 3 setup steps complete");
  await click("Knowledge");
  await act(async () => { tree.root.findByProps({ id: "ai-knowledge-topic" }).props.onChange({ target: { value: "Returns" } }); tree.root.findByProps({ id: "ai-knowledge-facts" }).props.onChange({ target: { value: "Return within 30 days." } }); });
  await click("Add knowledge");
  await click("Overview");
  expect(text(tree.toJSON())).toContain("2 of 3 setup steps complete");
  mocks.test.mockResolvedValue({ status: 200, data: "OK", userMessage: { id: "q", role: "user", content: "Returns?" }, assistantMessage: { id: "a", role: "assistant", content: "Return within 30 days." } });
  await click("Playground");
  await act(async () => tree.root.findByProps({ placeholder: "Ask a customer question…" }).props.onChange({ target: { value: "Returns?" } }));
  await act(async () => tree.root.findByProps({ "aria-label": "Send test" }).props.onClick());
  await click("Overview");
  expect(text(tree.toJSON())).toContain("3 of 3 setup steps complete");
  await click("Playground");
  expect(text(tree.toJSON())).toContain("Return within 30 days.");
});
it("does not mark failed provider tests complete and preserves the question for retry", async () => {
  mocks.test.mockRejectedValue(new Error("Network failure"));
  await click("Playground");
  await act(async () => tree.root.findByProps({ placeholder: "Ask a customer question…" }).props.onChange({ target: { value: "Returns?" } }));
  await act(async () => tree.root.findByProps({ "aria-label": "Send test" }).props.onClick());
  expect(tree.root.findByProps({ placeholder: "Ask a customer question…" }).props.value).toBe("Returns?");
  expect(text(tree.toJSON())).toContain("The test could not be completed");
  await click("Overview");
  expect(text(tree.toJSON())).toContain("1 of 3 setup steps complete");
});

it("does not count an old test after saved business configuration changed", async () => {
  await act(async () => { tree.unmount(); tree = create(<Ap3kAiConsole slug="owner" initial={initial} plan="PRO" lastConfiguredAt="2026-10-11T12:00:00Z" initialPlaygroundMessages={[{ id: "old", role: "assistant", content: "Old answer", createdAt: "2026-10-10T12:00:00Z" }]} />); });
  expect(text(tree.toJSON())).toContain("1 of 3 setup steps complete");
});
