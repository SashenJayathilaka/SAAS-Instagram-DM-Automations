import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  identity: vi.fn(),
  user: { findUnique: vi.fn() },
  conversation: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  inboxMessage: { findMany: vi.fn(), create: vi.fn() },
  lead: { findMany: vi.fn() },
  aiConversationSession: { updateMany: vi.fn() },
  automationFlowSession: { updateMany: vi.fn() },
  transaction: vi.fn(), send: vi.fn(),
}));
vi.mock("@/actions/user", () => ({ onCurrentUser: m.identity }));
vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: async () => "account" }));
vi.mock("@/lib/prisma", () => ({ client: { ...m, $transaction: m.transaction } }));
vi.mock("@/lib/instagram-dm", () => ({ sendInstagramDirectResponse: m.send }));
import { sendInboxReply, getInboxConversations, getInboxMessages, markConversationRead, getInstagramContacts, exportInstagramContacts } from "./index";

const integration = { id: "account", name: "INSTAGRAM", instagramId: "business", status: "CONNECTED", token: "synthetic-test-token-only", reconnectRequired: false, planLocked: false };
beforeEach(() => {
  vi.resetAllMocks();
  m.identity.mockResolvedValue({ id: "clerk-owner" });
  m.user.findUnique.mockResolvedValue({ id: "owner", status: "ACTIVE", subscription: { plan: "PRO" }, integrations: [integration] });
  m.conversation.findFirst.mockResolvedValue({ id: "thread", recipientIgId: "recipient", lastInboundAt: new Date() });
  m.send.mockResolvedValue({ ok: true, messageIds: ["sent"] });
});

it("blocks suspended sessions before reading contacts or sending and taking over a conversation", async () => {
  m.user.findUnique.mockResolvedValue({ id: "owner", status: "SUSPENDED", subscription: { plan: "BUSINESS" }, integrations: [integration] });
  for (const action of [
    () => sendInboxReply("thread", "Hello"), getInboxConversations,
    () => getInboxMessages("thread"), () => markConversationRead("thread"),
    getInstagramContacts, () => exportInstagramContacts(),
  ]) expect((await action()).status).toBe(404);
  expect(m.conversation.findFirst).not.toHaveBeenCalled();
  expect(m.conversation.findMany).not.toHaveBeenCalled();
  expect(m.lead.findMany).not.toHaveBeenCalled();
  expect(m.aiConversationSession.updateMany).not.toHaveBeenCalled();
  expect(m.automationFlowSession.updateMany).not.toHaveBeenCalled();
  expect(m.send).not.toHaveBeenCalled();
});

it.each([
  { status: "DISCONNECTED" }, { reconnectRequired: true }, { planLocked: true },
  { expiresAt: new Date(0) }, { token: null },
])("prevents replies through an unavailable integration: %j", async unavailable => {
  m.user.findUnique.mockResolvedValue({ id: "owner", status: "ACTIVE", integrations: [{ ...integration, ...unavailable }] });
  expect((await sendInboxReply("thread", "Hello")).status).toBe(403);
  expect(m.send).not.toHaveBeenCalled();
  expect(m.aiConversationSession.updateMany).not.toHaveBeenCalled();
});

it("does not send to a foreign conversation or outside the reply window", async () => {
  m.conversation.findFirst.mockResolvedValueOnce(null);
  expect((await sendInboxReply("foreign", "Hello")).status).toBe(404);
  expect(m.conversation.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", userId: "owner", integrationId: "account" } });
  m.conversation.findFirst.mockResolvedValue({ id: "thread", lastInboundAt: new Date(Date.now() - 25 * 3600000) });
  expect((await sendInboxReply("thread", "Hello")).status).toBe(403);
  expect(m.send).not.toHaveBeenCalled();
});

it("preserves a valid manual reply and its local delivery record", async () => {
  expect((await sendInboxReply("thread", " Hello ")).status).toBe(200);
  expect(m.send).toHaveBeenCalledWith(expect.objectContaining({ recipientId: "recipient", igBusinessAccountId: "business", message: "Hello" }));
  expect(m.inboxMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ conversationId: "thread", content: "Hello", status: "SENT" }) }));
});
