import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ current: vi.fn(), scope: vi.fn(), user: vi.fn(), integration: vi.fn(), owned: vi.fn(), update: vi.fn(), lock: vi.fn(), transaction: vi.fn(), post: vi.fn(), remove: vi.fn(), callbacks: vi.fn() }));
vi.mock("axios", () => ({ default: { post: m.post, delete: m.remove } }));
vi.mock("@/actions/user", () => ({ onCurrentUser: m.current }));
vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: m.scope }));
vi.mock("@/lib/instagram-postback-subscription", () => ({ ensureInstagramButtonCallbacks: m.callbacks }));
vi.mock("@/lib/prisma", () => ({ client: { user: { findUnique: m.user }, integrations: { findFirst: m.integration }, $transaction: m.transaction } }));
import { getConversationStarters, saveConversationStarters } from "./starters";
import { conversationStarterProfile, readConversationStarters } from "@/lib/conversation-starters";
const integrationId = "12345678-1234-4234-8234-123456789012";
const item = { id: "22345678-1234-4234-8234-123456789012", text: "How does it work?", reply: "Here is how to get started." };
const integration = { id: integrationId, userId: "owner", status: "CONNECTED", reconnectRequired: false, planLocked: false, igAccountSource: "instagram_login", instagramId: "ig-account", token: "a".repeat(30), conversationStarters: { version: 1, items: [item] } };
beforeEach(() => {
  vi.resetAllMocks();
  m.current.mockResolvedValue({ id: "clerk" });
  m.scope.mockResolvedValue(integrationId);
  m.user.mockResolvedValue({ id: "owner", status: "ACTIVE" });
  m.integration.mockResolvedValue(integration);
  m.owned.mockResolvedValue({ id: integrationId });
  m.callbacks.mockResolvedValue(true);
  m.post.mockResolvedValue({ data: { result: "success" } });
  m.remove.mockResolvedValue({ data: { result: "success" } });
  m.transaction.mockImplementation(async cb => cb({ $queryRaw: m.lock, integrations: { findFirst: m.owned, update: m.update } }));
});
describe("conversation starter settings", () => {
  it("reads only the currently selected owner's account and never exposes tokens", async () => {
    const result = await getConversationStarters(integrationId);
    expect(result).toEqual({ status: 200, data: [item] });
    expect(m.integration).toHaveBeenCalledWith({ where: { id: integrationId, userId: "owner" } });
  });
  it("publishes questions with stable callback IDs, then saves the answers", async () => {
    expect(await saveConversationStarters({ integrationId, items: [item] })).toEqual({ status: 200, data: [item] });
    expect(m.post).toHaveBeenCalledWith(expect.stringContaining("/ig-account/messenger_profile"), conversationStarterProfile([item]), expect.objectContaining({ timeout: 10000 }));
    expect(m.update).toHaveBeenCalledWith({ where: { id: integrationId }, data: { conversationStarters: { version: 1, items: [item] } } });
    expect(m.post.mock.invocationCallOrder[0]).toBeLessThan(m.update.mock.invocationCallOrder[0]);
  });
  it("uses the connected Facebook Page for legacy login profiles", async () => {
    m.integration.mockResolvedValue({ ...integration, igAccountSource: "facebook_login", pageId: "page-account" });
    await saveConversationStarters({ integrationId, items: [item] });
    expect(m.post.mock.calls[0][0]).toContain("graph.facebook.com");
    expect(m.post.mock.calls[0][0]).toContain("/page-account/messenger_profile");
  });
  it("deletes the profile setting when the owner removes all questions", async () => {
    expect(await saveConversationStarters({ integrationId, items: [] })).toMatchObject({ status: 200 });
    expect(m.post).not.toHaveBeenCalled();
    expect(m.remove).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ params: { platform: "instagram", fields: '["ice_breakers"]' } }));
    expect(m.update.mock.calls[0][0].data.conversationStarters.items).toEqual([]);
  });
  it("rejects stale account selection and suspended users before the remote call", async () => {
    m.scope.mockResolvedValue("other");
    expect(await saveConversationStarters({ integrationId, items: [item] })).toMatchObject({ status: 409 });
    m.scope.mockResolvedValue(integrationId);
    m.user.mockResolvedValue({ id: "owner", status: "SUSPENDED" });
    expect(await saveConversationStarters({ integrationId, items: [item] })).toMatchObject({ status: 403 });
    expect(m.post).not.toHaveBeenCalled();
  });
  it("does not publish a question that cannot receive callbacks", async () => {
    m.callbacks.mockResolvedValue(false);
    expect(await saveConversationStarters({ integrationId, items: [item] })).toMatchObject({ status: 400 });
    expect(m.post).not.toHaveBeenCalled();
  });
  it.each([{}, { result: "failure" }])("does not persist unconfirmed Meta results", async data => {
    m.post.mockResolvedValue({ data });
    expect(await saveConversationStarters({ integrationId, items: [item] })).toMatchObject({ status: 502 });
    expect(m.update).not.toHaveBeenCalled();
  });
  it("preserves the saved profile if Meta fails", async () => {
    m.post.mockRejectedValue(new Error("provider unavailable"));
    expect(await saveConversationStarters({ integrationId, items: [item] })).toMatchObject({ status: 502 });
    expect(m.update).not.toHaveBeenCalled();
  });
  it("rechecks connection ownership under the serialization lock", async () => {
    m.owned.mockResolvedValue(null);
    expect(await saveConversationStarters({ integrationId, items: [item] })).toMatchObject({ status: 502 });
    expect(m.lock).toHaveBeenCalled();
    expect(m.post).not.toHaveBeenCalled();
  });
  it("validates all four questions, duplicates and empty replies before updating", async () => {
    for (const items of [[item, item], [{ ...item, text: "x".repeat(81) }], [{ ...item, reply: " " }], Array.from({ length: 5 }, (_, i) => ({ ...item, id: `${i + 3}2345678-1234-4234-8234-123456789012` }))]) {
      expect(await saveConversationStarters({ integrationId, items })).toMatchObject({ status: 400 });
    }
    expect(m.post).not.toHaveBeenCalled();
    expect(readConversationStarters({ version: 1, items: [null] }).items).toEqual([]);
  });
});
