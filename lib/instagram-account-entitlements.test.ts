import { describe, expect, it, vi } from "vitest";
import { syncInstagramAccountEntitlements } from "./instagram-account-entitlements";

describe("account access on plan changes", () => {
  it.each([["FREE", 1], ["PRO", 3], ["BUSINESS", 6]] as const)("allows the oldest %s accounts up to %s without deleting data", async (plan, limit) => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: `account-${i}` }));
    const updateMany = vi.fn();
    const tx = { integrations: { findMany: vi.fn(async () => rows), updateMany } };
    await syncInstagramAccountEntitlements(tx as any, "owner", plan);
    expect(updateMany).toHaveBeenNthCalledWith(2, { where: { userId: "owner", name: "INSTAGRAM", status: { not: "DISCONNECTED" } }, data: { planLocked: true } });
    expect(updateMany).toHaveBeenNthCalledWith(3, { where: { userId: "owner", id: { in: rows.slice(0, limit).map(({ id }) => id) } }, data: { planLocked: false } });
  });
});
