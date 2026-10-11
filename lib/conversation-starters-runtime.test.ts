import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ integration: vi.fn(), session: vi.fn(), cancel: vi.fn(), receipt: vi.fn(), update: vi.fn(), inbox: vi.fn(), quota: vi.fn(), send: vi.fn(), record: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: {
  integrations: { findFirst: m.integration },
  automationFlowSession: { findUnique: m.session, updateMany: m.cancel },
  conversationStarterReceipt: { createMany: m.receipt, updateMany: m.update },
  inboxMessage: { findFirst: m.inbox },
} }));
vi.mock("@/actions/usage/queries", () => ({ canSendStaticReply: m.quota }));
vi.mock("@/actions/webhook/queries", () => ({ recordOutboundInboxMessage: m.record }));
vi.mock("@/lib/fetch", () => ({ sendDm: m.send }));
import { handleConversationStarter } from "./conversation-starters-runtime";
const item = { id: "22345678-1234-4234-8234-123456789012", text: "Help?", reply: "Here is your guide." };
const integration = { id: "i1", userId: "u1", instagramId: "ig1", token: "a".repeat(30), User: { id: "u1", status: "ACTIVE" }, conversationStarters: { version: 1, items: [item] } };
const input = () => ({ integrationId: "i1", recipientIgId: "r1", eventId: "mid1", payload: `AP3K_STARTER:${item.id}`, inboundAt: new Date() });
beforeEach(() => {
  vi.resetAllMocks();
  m.integration.mockResolvedValue(integration);
  m.session.mockResolvedValue(null);
  m.quota.mockResolvedValue({ ok: true });
  m.receipt.mockResolvedValue({ count: 1 });
  m.inbox.mockResolvedValue(null);
  m.send.mockResolvedValue({ data: { message_id: "out1" } });
});
describe("verified conversation starter callbacks", () => {
  it("ignores other payloads and consumes stale or malformed starter buttons safely", async () => {
    expect(await handleConversationStarter({ ...input(), payload: "OTHER" })).toBe(false);
    expect(await handleConversationStarter({ ...input(), payload: "AP3K_STARTER:invalid" })).toBe(true);
    expect(await handleConversationStarter({ ...input(), payload: "AP3K_STARTER:32345678-1234-4234-8234-123456789012" })).toBe(true);
    expect(m.send).not.toHaveBeenCalled();
  });
  it("sends only the configured answer from the receiving account", async () => {
    expect(await handleConversationStarter(input())).toBe(true);
    expect(m.send).toHaveBeenCalledWith("ig1", "r1", item.reply, integration.token);
    expect(m.receipt).toHaveBeenCalledWith({ data: [{ integrationId: "i1", recipientIgId: "r1", eventId: "mid1", status: "PROCESSING" }], skipDuplicates: true });
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "SENT" } }));
    expect(m.record).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", integrationId: "i1", recipientIgId: "r1", content: item.reply }));
  });
  it("does not replay a claimed, delivered or uncertain callback", async () => {
    m.receipt.mockResolvedValue({ count: 0 });
    await handleConversationStarter(input());
    expect(m.send).not.toHaveBeenCalled();
  });
  it("checks the messaging window before touching account data", async () => {
    await handleConversationStarter({ ...input(), inboundAt: new Date(Date.now() - 86400001) });
    expect(m.integration).not.toHaveBeenCalled();
    expect(m.send).not.toHaveBeenCalled();
  });
  it("respects STOP and exhausted quotas", async () => {
    m.session.mockResolvedValue({ status: "STOPPED", expiresAt: new Date(Date.now() + 10000) });
    await handleConversationStarter(input());
    expect(m.quota).not.toHaveBeenCalled();
    m.session.mockResolvedValue(null);
    m.quota.mockResolvedValue({ ok: false });
    await handleConversationStarter(input());
    expect(m.receipt).not.toHaveBeenCalled();
    expect(m.send).not.toHaveBeenCalled();
  });
  it("refuses missing owner relationships and disconnected integrations", async () => {
    m.integration.mockResolvedValue({ ...integration, User: { id: "someone-else" } });
    await handleConversationStarter(input());
    m.integration.mockResolvedValue(null);
    await handleConversationStarter(input());
    expect(m.send).not.toHaveBeenCalled();
    expect(m.receipt).not.toHaveBeenCalled();
  });
  it("cancels pending flow turns and yields to a newer manual reply", async () => {
    m.inbox.mockResolvedValue({ id: "manual" });
    await handleConversationStarter(input());
    expect(m.cancel).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ integrationId: "i1", recipientIgId: "r1" }), data: { status: "CANCELLED", resumeAt: null } }));
    expect(m.send).not.toHaveBeenCalled();
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CANCELLED" } }));
  });
  it("rechecks saved content after claiming before sending", async () => {
    m.integration.mockResolvedValueOnce(integration).mockResolvedValueOnce({ ...integration, conversationStarters: { version: 1, items: [{ ...item, reply: "Changed" }] } });
    await handleConversationStarter(input());
    expect(m.send).not.toHaveBeenCalled();
  });
  it("marks an uncertain send failed without pretending it delivered", async () => {
    m.send.mockRejectedValue(new Error("network timeout"));
    await handleConversationStarter(input());
    expect(m.record).not.toHaveBeenCalled();
    expect(m.update).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "PROCESSING" }), data: { status: "FAILED" } }));
  });
  it("keeps successful usage terminal when secondary inbox bookkeeping fails", async () => {
    m.record.mockRejectedValue(new Error("inbox unavailable"));
    await handleConversationStarter(input());
    expect(m.update.mock.calls[0][0].data.status).toBe("SENT");
    expect(m.update.mock.calls[1][0].where.status).toBe("PROCESSING");
  });
});
