import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ automation: { findMany: vi.fn() }, aiConversationSession: { findFirst: vi.fn(), upsert: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ client: db }));
import { findAutomationForDM } from "./queries";
import { DEFAULT_AI_CONVERSATION } from "@/lib/ai-conversation";
const ai = { id: "ai", integrationId: "account-a", listener: { aiConversation: { ...DEFAULT_AI_CONVERSATION, goal: "Help choose the right product", context: "Product descriptions and approved links." } }, keywords: [{ word: "SHOP" }], matchingMode: "CONTAINS", triggerMode: "SPECIFIC_KEYWORD" };
beforeEach(() => { vi.clearAllMocks(); db.automation.findMany.mockResolvedValue([ai]); db.aiConversationSession.findFirst.mockResolvedValue(null); });
describe("AI flow routing", () => {
 it("continues an active session without repeating the trigger keyword", async () => {
  db.aiConversationSession.findFirst.mockResolvedValue({ automationId: "ai", status: "ACTIVE" });
  expect((await findAutomationForDM("My budget is 20", "page-a", "buyer"))?.automation.id).toBe("ai");
  expect(db.aiConversationSession.findFirst.mock.calls[0][0].where.integrationId).toEqual({ in: ["account-a"] });
 });
 it("does not start an unrelated keyword flow", async () => { expect(await findAutomationForDM("hello", "page-a", "buyer")).toBeNull(); });
 it("persists a stop request and sends no reply", async () => {
  expect(await findAutomationForDM("STOP", "page-a", "buyer")).toBeNull();
  expect(db.aiConversationSession.upsert.mock.calls[0][0].create.status).toBe("STOPPED");
 });
 it("does not restart a paused conversation on its keyword", async () => {
  db.aiConversationSession.findFirst.mockResolvedValue({ automationId: "ai", status: "STOPPED" });
  expect(await findAutomationForDM("SHOP", "page-a", "buyer")).toBeNull();
 });
 it("prefers a keyword flow over a newer catch-all", async () => {
  db.automation.findMany.mockResolvedValue([{ ...ai, id: "catch-all", triggerMode: "ANY_MESSAGE" }, ai]);
  expect((await findAutomationForDM("SHOP", "page-a", "buyer"))?.automation.id).toBe("ai");
 });
});
