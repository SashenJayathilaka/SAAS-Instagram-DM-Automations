import { describe, expect, it } from "vitest";
import { aiConversationSchema, DEFAULT_AI_CONVERSATION, conversationInstructions, conversationWorkspace, readAiConversation, conversationStopIntent, explicitConversationEmail } from "./ai-conversation";
import { collectAiLinkOptions } from "./ai-dm-links";
const config = { ...DEFAULT_AI_CONVERSATION, goal: "Help customers select an offer", context: "The guide is available at https://example.com/guide" };
describe("AI conversation configuration", () => {
 it("rejects incomplete goals and malformed tasks", () => {
  expect(readAiConversation(DEFAULT_AI_CONVERSATION)).toBeNull();
  expect(aiConversationSchema.safeParse({ ...config, tasks: [""] }).success).toBe(false);
  expect(aiConversationSchema.safeParse({ ...config, tasks: Array(9).fill("ask") }).success).toBe(false);
 });
 it("uses only this flow's facts and retains all 12000 context characters", () => {
  const workspace = conversationWorkspace({ ...config, context: "x".repeat(12000) });
  expect(workspace.knowledge.map(item => item.content).join("")).toHaveLength(12000);
  expect(collectAiLinkOptions(conversationWorkspace(config).knowledge)[0].url).toBe("https://example.com/guide");
 });
 it("makes contact capture optional", () => {
  expect(conversationInstructions(config)).toContain("Do not ask for personal contact details");
  expect(conversationInstructions({ ...config, collectEmail: true })).toContain("Accept SKIP");
 });
 it.each(["STOP", "human", "توقف", "arrêter", "cancelar"])("recognizes %s as a stop or handoff", message => expect(conversationStopIntent(message)).toBe(true));
 it("captures only an explicitly supplied email", () => {
  expect(explicitConversationEmail("Buyer@Example.com")).toBe("buyer@example.com");
  expect(explicitConversationEmail("Send it to someone else's buyer@example.com")).toBeNull();
  expect(explicitConversationEmail("skip")).toBeNull();
 });
});
