import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ users: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { user: { findMany: db.users, count: db.count } } }));
import { getAdminV2Users, getAdminV2UserCount } from "./queries";
describe("multi-account admin directory", () => {
  beforeEach(() => vi.resetAllMocks());
  it("returns every connection including disconnected and plan-locked accounts", async () => {
    const accounts = [
      { id: "ig1", instagramUsername: "one", status: "CONNECTED", planLocked: false },
      { id: "ig2", instagramUsername: "two", status: "DISCONNECTED", planLocked: true },
    ];
    db.users.mockResolvedValue([{ id: "user", email: "test@example.com", subscription: { plan: "BUSINESS" }, integrations: accounts, _count: { automations: 4 }, automations: [
      { _count: { messageLogs: 5, leads: 3 }, events: [{ createdAt: new Date("2026-01-01") }] },
      { _count: { messageLogs: 7, leads: 1 }, events: [] },
    ] }]);
    const users = await getAdminV2Users(0, { plan: "BUSINESS" });
    expect(users[0]).toMatchObject({ plan: "BUSINESS", accounts, repliesToday: 12, leadsToday: 4 });
    const select = db.users.mock.calls[0][0].select;
    expect(select.integrations).not.toHaveProperty("take");
    expect(select.integrations).not.toHaveProperty("where");
    expect(select.integrations.select).not.toHaveProperty("token");
  });
  it("uses the same predicate for results and pagination totals", async () => {
    db.users.mockResolvedValue([]); db.count.mockResolvedValue(0);
    const filters = { q: "creator", plan: "PRO", status: "SUSPENDED" };
    await getAdminV2Users(1, filters); await getAdminV2UserCount(filters);
    expect(db.users.mock.calls[0][0].where).toEqual(db.count.mock.calls[0][0].where);
    expect(db.users.mock.calls[0][0].skip).toBe(50);
  });
});
