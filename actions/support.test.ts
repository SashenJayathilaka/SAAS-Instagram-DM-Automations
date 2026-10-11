import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), profile: vi.fn(), reserve: vi.fn(), generate: vi.fn(), history: vi.fn(), create: vi.fn(), clear: vi.fn(), usage: vi.fn() }));
vi.mock("@/actions/usage/queries", () => ({ getUserMonthlyUsage: mocks.usage }));
vi.mock("@/actions/user", () => ({ onCurrentUser: mocks.auth }));
vi.mock("@/actions/user/queries", () => ({ findUser: mocks.profile }));
vi.mock("@/lib/support-quota", () => ({ reserveSupportRequest: mocks.reserve }));
vi.mock("@/lib/ai-reply", () => ({ generateAiSupportReply: mocks.generate }));
vi.mock("@/lib/prisma", () => ({ client: { aiChatMessage: { findMany: mocks.history, create: mocks.create, deleteMany: mocks.clear } } }));
import { askSupportAssistantAction, clearSupportHistoryAction } from "./support";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: "clerk-owner" });
  mocks.profile.mockResolvedValue({ id: "owner", status: "ACTIVE" });
  mocks.reserve.mockResolvedValue(true);
  mocks.history.mockResolvedValue([]);
  mocks.create.mockResolvedValue({ id: "message" });
  mocks.generate.mockResolvedValue({ ok: true, reply: "Answer" });
});
it("denies requests before generating a reply when the allowance is exhausted", async () => {
  mocks.reserve.mockResolvedValue(false);
  expect((await askSupportAssistantAction("Help")).status).toBe(429);
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
it("blocks suspended and unauthenticated callers before quota or provider access", async () => {
  mocks.profile.mockResolvedValue({ id: "owner", status: "SUSPENDED" });
  expect((await askSupportAssistantAction("Help")).status).toBe(503);
  mocks.auth.mockRejectedValue(new Error("unauthenticated"));
  expect((await askSupportAssistantAction("Help")).status).toBe(503);
  expect(mocks.reserve).not.toHaveBeenCalled();
  expect(mocks.generate).not.toHaveBeenCalled();
});
it("reserves against the authenticated owner and preserves normal replies", async () => {
  expect((await askSupportAssistantAction("Help")).status).toBe(200);
  expect(mocks.reserve).toHaveBeenCalledWith("owner");
  expect(mocks.generate).toHaveBeenCalledOnce();
});
it("clearing history removes only this owner's messages", async () => {
  expect((await clearSupportHistoryAction()).status).toBe(200);
  expect(mocks.clear).toHaveBeenCalledWith({ where: { userId: "owner", context: "SUPPORT" } });
  expect(mocks.reserve).not.toHaveBeenCalled();
});

it("sends only server-owned plan and aggregate counts to the model", async () => {
  mocks.profile.mockResolvedValue({ id: "owner", status: "ACTIVE", email: "private@example.com", subscription: { plan: "PRO", customerId: "cus_secret" }, integrations: [{ token: "secret_token" }] });
  mocks.usage.mockResolvedValue({ periodLabel: "October 2026", staticReplies: { used: 120 }, aiReplies: { used: 3 }, activeCampaigns: { used: 2 }, connectedAccounts: { used: 1 } });
  expect((await askSupportAssistantAction("Which plan fits me?")).status).toBe(200);
  expect(mocks.usage).toHaveBeenCalledWith("owner");
  expect(mocks.generate.mock.calls[0][0].account).toEqual({ plan: "PRO", usage: { period: "October 2026", actions: 120, aiReplies: 3, activeAutomations: 2, connectedAccounts: 1 } });
  const context = JSON.stringify(mocks.generate.mock.calls[0][0].account);
  expect(context).not.toMatch(/private|secret|customerId|token/);
});
it("keeps support available when account usage cannot be loaded", async () => {
  mocks.usage.mockRejectedValue(new Error("unavailable"));
  expect((await askSupportAssistantAction("What are my plan limits?")).status).toBe(200);
  expect(mocks.generate.mock.calls[0][0].account).toEqual({ plan: "FREE" });
});
