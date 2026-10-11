import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { $transaction: m.transaction } }));
import { assertAutomationPlan, AutomationPlanError, syncAutomationPlanEntitlements, withAutomationPlanWrite } from "./automation-plan-entitlements";
import { PLAN_PAUSE_MESSAGES } from "./automation-plan-policy";
function txFixture(plan = "FREE") {
  const row = { id: "a", userId: "owner", active: true, archivedAt: null, needsReview: false, integration: { userId: "owner", planLocked: false, status: "CONNECTED", reconnectRequired: false }, User: { status: "ACTIVE", subscription: { plan } }, listener: {} };
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "owner" }]),
    automation: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(row), count: vi.fn().mockResolvedValue(5), updateMany: vi.fn() },
    automationDeliveryJob: { updateMany: vi.fn() }, automationEngagementJob: { updateMany: vi.fn() }, automationFlowSession: { updateMany: vi.fn() }, aiConversationSession: { updateMany: vi.fn() },
  };
  return { tx, row };
}
beforeEach(() => vi.clearAllMocks());
describe("billing reconciliation", () => {
  it("pauses excess, cancels stale queued work, and preserves repair warnings", async () => {
    const { tx } = txFixture();
    tx.automation.findMany.mockResolvedValue(Array.from({ length: 60 }, (_, i) => ({ id: String(i) })));
    await syncAutomationPlanEntitlements(tx as any, "owner", "FREE");
    const ids = Array.from({ length: 55 }, (_, i) => String(i + 5));
    expect(tx.automation.updateMany).toHaveBeenCalledWith({ where: { userId: "owner", id: { in: ids } }, data: { active: false } });
    expect(tx.automation.updateMany).toHaveBeenCalledWith({ where: { userId: "owner", id: { in: ids }, needsReview: false }, data: { reviewReason: PLAN_PAUSE_MESSAGES.limit } });
    expect(tx.automationDeliveryJob.updateMany).toHaveBeenCalledWith({ where: { automationId: { in: ids }, status: "PENDING" }, data: { status: "CANCELLED", payload: {} } });
    expect(tx.automationFlowSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CANCELLED", resumeAt: null } }));
    expect(tx.aiConversationSession.updateMany).toHaveBeenCalled();
    // Retry is idempotent: already paused records are excluded; upgrades don't restart them.
    tx.automation.findMany.mockResolvedValue(Array.from({ length: 5 }, (_, i) => ({ id: String(i) })));
    tx.automation.updateMany.mockClear();
    await syncAutomationPlanEntitlements(tx as any, "owner", "FREE");
    await syncAutomationPlanEntitlements(tx as any, "owner", "BUSINESS");
    expect(tx.automation.updateMany).not.toHaveBeenCalled();
  });
});
describe("transactional publishing guard", () => {
  it("accepts the fifth, rejects the sixth, and still permits pausing", async () => {
    const { tx, row } = txFixture();
    await expect(assertAutomationPlan(tx as any, "owner", "a")).resolves.toBeUndefined();
    tx.automation.count.mockResolvedValue(6);
    await expect(assertAutomationPlan(tx as any, "owner", "a")).rejects.toThrow("5 active automations");
    row.active = false;
    await expect(assertAutomationPlan(tx as any, "owner", "a")).resolves.toBeUndefined();
  });
  it("checks current paid settings, account ownership and locks", async () => {
    const { tx, row } = txFixture();
    row.listener = { followUpEnabled: true };
    await expect(assertAutomationPlan(tx as any, "owner", "a")).rejects.toThrow("paid features");
    row.User.subscription.plan = "PRO";
    await expect(assertAutomationPlan(tx as any, "owner", "a")).resolves.toBeUndefined();
    row.integration.userId = "other";
    await expect(assertAutomationPlan(tx as any, "owner", "a")).rejects.toThrow("Instagram account");
    row.integration.userId = "owner";
    row.integration.planLocked = true;
    await expect(assertAutomationPlan(tx as any, "owner", "a")).rejects.toThrow("Instagram account");
  });
  it("holds the shared owner lock before writing and validates before commit", async () => {
    const { tx } = txFixture();
    m.transaction.mockImplementation(async callback => callback(tx));
    const order: string[] = [];
    tx.$queryRaw.mockImplementation(async () => { order.push("lock"); return [{ id: "owner" }]; });
    tx.automation.count.mockImplementation(async () => { order.push("check"); return 6; });
    await expect(withAutomationPlanWrite("clerk", async () => { order.push("write"); return { id: "a" }; }, r => r.id)).rejects.toBeInstanceOf(AutomationPlanError);
    expect(order).toEqual(["lock", "write", "check"]);
    expect(m.transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "ReadCommitted" }));
  });
  it("does not write when the owner does not exist", async () => {
    const { tx } = txFixture(); tx.$queryRaw.mockResolvedValue([]);
    m.transaction.mockImplementation(async callback => callback(tx));
    const write = vi.fn();
    await expect(withAutomationPlanWrite("missing", write, () => "a")).rejects.toThrow("unavailable");
    expect(write).not.toHaveBeenCalled();
  });
});
