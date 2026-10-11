import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  conversation: { findFirst: vi.fn(), updateMany: vi.fn() },
  inboxMessage: { findMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ client: db }));
vi.mock("@/actions/user", () => ({ onCurrentUser: async () => ({ id: "clerk-owner" }) }));
vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: async () => "account-b" }));
vi.mock("@/lib/instagram-dm", () => ({ sendInstagramDirectResponse: vi.fn() }));
import { getInboxMessages } from "./index";
const timestamp = new Date("2026-10-02T00:00:00Z");
beforeEach(() => {
  vi.resetAllMocks();
  db.user.findUnique.mockResolvedValue({ id: "owner", integrations: [] });
  db.conversation.findFirst.mockResolvedValue({ id: "thread", unreadCount: 0, lastMessageAt: timestamp });
  db.inboxMessage.findMany.mockResolvedValue([{ id: "message" }]);
  db.conversation.updateMany.mockResolvedValue({ count: 1 });
});
it("refreshes already-read messages without a database write", async () => {
  expect(await getInboxMessages("thread")).toEqual({ status: 200, data: [{ id: "message" }] });
  expect(db.conversation.updateMany).not.toHaveBeenCalled();
});
it("marks only the owned account and observed unread snapshot as read", async () => {
  db.conversation.findFirst.mockResolvedValue({ id: "thread", unreadCount: 2, lastMessageAt: timestamp });
  await getInboxMessages("thread");
  expect(db.conversation.findFirst.mock.calls[0][0].where).toEqual({ id: "thread", userId: "owner", integrationId: "account-b" });
  expect(db.conversation.updateMany).toHaveBeenCalledWith({ where: { id: "thread", userId: "owner", integrationId: "account-b", unreadCount: 2, lastMessageAt: timestamp }, data: { unreadCount: 0 } });
});
it("does not retry an obsolete read marker when new messages arrive", async () => {
  db.conversation.findFirst.mockResolvedValue({ id: "thread", unreadCount: 2, lastMessageAt: timestamp });
  db.conversation.updateMany.mockResolvedValue({ count: 0 });
  expect((await getInboxMessages("thread")).status).toBe(200);
  expect(db.conversation.updateMany).toHaveBeenCalledTimes(1);
});
it("does not read or update another account's conversation", async () => {
  db.conversation.findFirst.mockResolvedValue(null);
  expect((await getInboxMessages("foreign")).status).toBe(404);
  expect(db.inboxMessage.findMany).not.toHaveBeenCalled();
  expect(db.conversation.updateMany).not.toHaveBeenCalled();
});
