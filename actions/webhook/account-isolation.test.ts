import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ automation: { findMany: vi.fn(), findFirst: vi.fn() }, messageLog: { findMany: vi.fn() }, conversation: { upsert: vi.fn() }, inboxMessage: { create: vi.fn(), findUnique: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ client: db }));
import { findAutomationForDM, findAutomationForStory, findAutomationById, findPendingCommentDmActionForText, upsertInboundInboxMessage, recordOutboundInboxMessage } from "./queries";
beforeEach(() => {
  vi.clearAllMocks(); db.automation.findMany.mockResolvedValue([]); db.automation.findFirst.mockResolvedValue(null); db.messageLog.findMany.mockResolvedValue([]); db.conversation.upsert.mockResolvedValue({ id: "conversation-a" }); db.inboxMessage.create.mockResolvedValue({ id: "message-a" });
});
describe("incoming Instagram events cannot cross account boundaries", () => {
  it.each(["DM", "STORY", "CALLBACK"])("binds %s lookup to the receiving integration, including its plan lock", async (kind) => {
    if (kind === "DM") await findAutomationForDM("hello", "ig-b");
    if (kind === "STORY") await findAutomationForStory("MENTION", "ig-b");
    if (kind === "CALLBACK") await findAutomationById("automation-a", "ig-b");
    const call = kind !== "CALLBACK" ? db.automation.findMany.mock.calls[0][0] : db.automation.findFirst.mock.calls[0][0];
    expect(call.where.integration).toMatchObject({ status: "CONNECTED", planLocked: false, reconnectRequired: false });
    expect(call.where.integration.OR).toContainEqual({ instagramId: "ig-b" });
  });
  it("never resolves pending follow/opening buttons from a sibling account", async () => {
    await findPendingCommentDmActionForText("ig-b", "same-person", "Send link");
    expect(db.messageLog.findMany.mock.calls[0][0].where.automation.integration.OR).toContainEqual({ instagramId: "ig-b" });
  });
  it("keeps the same person's conversations separate on two accounts", async () => {
    await upsertInboundInboxMessage({ userId: "owner", integrationId: "account-a", senderIgId: "person", content: "Message for A" });
    await upsertInboundInboxMessage({ userId: "owner", integrationId: "account-b", senderIgId: "person", content: "Message for B" });
    expect(db.conversation.upsert.mock.calls[0][0].where).toEqual({ integrationId_recipientIgId: { integrationId: "account-a", recipientIgId: "person" } });
    expect(db.conversation.upsert.mock.calls[1][0].where).toEqual({ integrationId_recipientIgId: { integrationId: "account-b", recipientIgId: "person" } });
    expect(db.conversation.upsert.mock.calls[1][0].create.integrationId).toBe("account-b");
  });
  it.each([
    ["Person@Example.com", { email: "person@example.com" }],
    ["+1 (415) 555-0123", { phone: "+14155550123" }],
  ])("saves %s to the exact sender on the receiving account", async (content, fields) => {
    await upsertInboundInboxMessage({ userId: "owner", integrationId: "account-b", senderIgId: "sender-b", content: content as string });
    const write = db.conversation.upsert.mock.calls[0][0];
    expect(write.where).toEqual({ integrationId_recipientIgId: { integrationId: "account-b", recipientIgId: "sender-b" } });
    expect(write.create).toMatchObject(fields);
    expect(write.update).toMatchObject(fields);
  });
  it.each(["STOP", "SKIP", "Email someone@example.com for help", "hello", "123"])("does not turn incidental text or %s into contact details", async content => {
    await upsertInboundInboxMessage({ userId: "owner", integrationId: "account-a", senderIgId: "person", content });
    expect(db.conversation.upsert.mock.calls[0][0].update).not.toHaveProperty("email");
    expect(db.conversation.upsert.mock.calls[0][0].update).not.toHaveProperty("phone");
  });
  it("records outbound messages in the automation's account", async () => {
    await recordOutboundInboxMessage({ userId: "owner", integrationId: "account-b", recipientIgId: "person", automationId: "automation-b", content: "B reply" });
    expect(db.conversation.upsert.mock.calls[0][0].where.integrationId_recipientIgId.integrationId).toBe("account-b");
  });
});
