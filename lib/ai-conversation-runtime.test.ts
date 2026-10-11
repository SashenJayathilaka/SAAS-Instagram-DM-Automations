import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ upsert: vi.fn(), update: vi.fn(), lead: vi.fn(), generate: vi.fn(), reserve: vi.fn(), complete: vi.fn(), release: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { aiConversationSession: { upsert: m.upsert, updateMany: m.update }, lead: { upsert: m.lead } } }));
vi.mock("@/lib/ai-reply", () => ({ generateAiDmReply: m.generate }));
vi.mock("@/actions/usage/queries", () => ({ reserveAiReplyQuota: m.reserve, completeAiReplyReservation: m.complete, releaseAiReplyReservation: m.release }));
import { DEFAULT_AI_CONVERSATION } from "./ai-conversation";
import { prepareAiConversationTurn, finishAiConversationTurn } from "./ai-conversation-runtime";
const input = () => ({ automationId: "auto-a", userId: "owner", integrationId: "ig-a", recipientIgId: "buyer", message: "hello", inboundAt: new Date(), config: { ...DEFAULT_AI_CONVERSATION, goal: "Recommend a relevant offer", context: "A factual description of our offer." } });
beforeEach(() => {
 vi.clearAllMocks();
 m.upsert.mockResolvedValue({ id: "session-a", automationId: "auto-a", status: "ACTIVE", expiresAt: new Date(Date.now() + 86400000), updatedAt: new Date(), history: [{ role: "user", content: "My budget is 20" }, { role: "assistant", content: "What do you need?" }] });
 m.update.mockResolvedValue({ count: 1 }); m.reserve.mockResolvedValue({ ok: true, reservationId: "quota" }); m.generate.mockResolvedValue({ ok: true, reply: "Here is an option." });
});
describe("live AI conversation turns", () => {
 it("continues with prior answers, scoped to account and recipient", async () => {
  const turn = await prepareAiConversationTurn(input());
  expect(m.upsert.mock.calls[0][0].where).toEqual({ integrationId_recipientIgId: { integrationId: "ig-a", recipientIgId: "buyer" } });
  expect(m.generate.mock.calls[0][0].history[0].content).toBe("My budget is 20");
  expect(turn?.reply).toBe("Here is an option.");
 });
 it("never generates outside the messaging window", async () => {
  expect(await prepareAiConversationTurn({ ...input(), inboundAt: new Date(Date.now() - 86400001) })).toBeNull(); expect(m.reserve).not.toHaveBeenCalled();
 });
 it("honors a lost claim without consuming AI quota", async () => {
  m.update.mockResolvedValue({ count: 0 }); expect(await prepareAiConversationTurn(input())).toBeNull(); expect(m.generate).not.toHaveBeenCalled();
 });
 it("rechecks ownership after generation so a stop request prevents delivery", async () => {
  m.update.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
  expect(await prepareAiConversationTurn(input())).toBeNull();
 });
 it("releases quota and uses the configured fallback on provider failure", async () => {
  m.generate.mockResolvedValue({ ok: false }); const turn = await prepareAiConversationTurn(input());
  expect(m.release).toHaveBeenCalledWith("quota"); expect(turn?.reply).toBe(input().config.fallback);
 });
 it("does not append an undelivered response or capture its email", async () => {
  const turn = await prepareAiConversationTurn({ ...input(), message: "buyer@example.com", config: { ...input().config, collectEmail: true } });
  await finishAiConversationTurn(turn!, { message: "buyer@example.com", sent: false, automationId: "auto-a", recipientIgId: "buyer" });
  expect(m.update.mock.calls.at(-1)?.[0].data.history).toBeUndefined(); expect(m.lead).not.toHaveBeenCalled();
 });
 it("saves voluntarily supplied email against the correct automation and contact", async () => {
  const turn = await prepareAiConversationTurn({ ...input(), message: "buyer@example.com", config: { ...input().config, collectEmail: true } });
  await finishAiConversationTurn(turn!, { message: "buyer@example.com", sent: true, automationId: "auto-a", recipientIgId: "buyer" });
  expect(m.lead.mock.calls[0][0].where).toEqual({ automationId_igUserId: { automationId: "auto-a", igUserId: "buyer" } });
 });
});
