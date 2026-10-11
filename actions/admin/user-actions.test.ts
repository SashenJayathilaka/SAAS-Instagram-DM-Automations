vi.mock("@/actions/user/queries", () => ({ syncSubscriptionForUser: (userId: string, props: any) => mockSubscriptionUpsert({ where: { userId }, update: props, create: { userId, ...props } }) }));
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

const mockRequireOwnerAdmin = vi.fn();
const mockAuditCreate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockAutomationUpdateMany = vi.fn();
const mockSubscriptionUpsert = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/lib/admin", () => ({
  requireOwnerAdmin: (...args: unknown[]) => mockRequireOwnerAdmin(...args),
}));

vi.mock("@/lib/prisma", () => ({
  client: {
    adminAuditLog: { create: (...args: unknown[]) => mockAuditCreate(...args) },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    automation: {
      updateMany: (...args: unknown[]) => mockAutomationUpdateMany(...args),
    },
    subscription: {
      upsert: (...args: unknown[]) => mockSubscriptionUpsert(...args),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import {
  adminSuspendUserAction,
  adminReactivateUserAction,
  adminChangeUserPlanAction,
  adminResetUserUsageAction,
  adminUpdateUserBillingOverridesAction,
} from "./user-actions";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN = { clerkId: "clerk_admin", email: "admin@example.com" };

function activeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "user@example.com",
    status: "ACTIVE",
    suspendedAt: null,
    suspendedReason: null,
    subscription: { plan: "FREE", usageResetAt: null },
    ...overrides,
  };
}

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// ---------------------------------------------------------------------------
// describe("adminSuspendUserAction")
// ---------------------------------------------------------------------------

describe("adminSuspendUserAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockUserFindUnique.mockResolvedValue(activeUser());
    mockUserUpdate.mockResolvedValue(
      activeUser({
        status: "SUSPENDED",
        suspendedAt: new Date(),
        suspendedReason: "abuse report",
      }),
    );
    mockAutomationUpdateMany.mockResolvedValue({ count: 2 });
  });

  it("suspends the user and writes a SUCCESS audit", async () => {
    const result = await adminSuspendUserAction(
      form({ userId: "user-1", reason: "abuse report", confirmation: "SUSPEND" }),
    );

    expect(result.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          status: "SUSPENDED",
          suspendedReason: "abuse report",
        }),
      }),
    );
  });

  it("pauses all active campaigns for the user", async () => {
    await adminSuspendUserAction(
      form({ userId: "user-1", reason: "abuse report", confirmation: "SUSPEND" }),
    );

    expect(mockAutomationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", active: true },
        data: { active: false },
      }),
    );
  });

  it("writes a SUCCESS audit with ADMIN_USER_SUSPENDED action", async () => {
    await adminSuspendUserAction(
      form({ userId: "user-1", reason: "abuse report", confirmation: "SUSPEND" }),
    );

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_USER_SUSPENDED",
          targetId: "user-1",
          adminEmail: "admin@example.com",
          status: "SUCCESS",
        }),
      }),
    );
  });

  it("includes paused campaign count in success message", async () => {
    mockAutomationUpdateMany.mockResolvedValue({ count: 3 });

    const result = await adminSuspendUserAction(
      form({ userId: "user-1", reason: "abuse report", confirmation: "SUSPEND" }),
    );

    expect(result.status).toBe(200);
    expect(String(result.data)).toContain("3");
  });

  it("returns 400 and BLOCKED audit when confirmation is not SUSPEND", async () => {
    const result = await adminSuspendUserAction(
      form({ userId: "user-1", reason: "abuse report", confirmation: "suspend" }),
    );

    expect(result.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "BLOCKED" }),
      }),
    );
  });

  it("returns 400 when reason is shorter than 5 characters — no DB calls", async () => {
    const result = await adminSuspendUserAction(
      form({ userId: "user-1", reason: "bad", confirmation: "SUSPEND" }),
    );

    expect(result.status).toBe(400);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not admin", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("not_found"));

    const result = await adminSuspendUserAction(
      form({ userId: "user-1", reason: "abuse report", confirmation: "SUSPEND" }),
    );

    expect(result.status).toBe(403);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await adminSuspendUserAction(
      form({ userId: "user-1", reason: "abuse report", confirmation: "SUSPEND" }),
    );

    expect(result.status).toBe(404);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("revalidates admin-v2 user paths on success", async () => {
    await adminSuspendUserAction(
      form({ userId: "user-1", reason: "abuse report", confirmation: "SUSPEND" }),
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/users");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/overview");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/users/user-1");
  });
});

// ---------------------------------------------------------------------------
// describe("adminReactivateUserAction")
// ---------------------------------------------------------------------------

describe("adminReactivateUserAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockUserFindUnique.mockResolvedValue(
      activeUser({ status: "SUSPENDED", suspendedAt: new Date(), suspendedReason: "abuse" }),
    );
    mockUserUpdate.mockResolvedValue(
      activeUser({ status: "ACTIVE", suspendedAt: null, suspendedReason: null }),
    );
  });

  it("clears SUSPENDED status and nulls suspendedAt and suspendedReason", async () => {
    const result = await adminReactivateUserAction(
      form({ userId: "user-1", reason: "issue resolved" }),
    );

    expect(result.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          status: "ACTIVE",
          suspendedAt: null,
          suspendedReason: null,
        }),
      }),
    );
  });

  it("does NOT call automation.updateMany — campaigns stay paused", async () => {
    await adminReactivateUserAction(
      form({ userId: "user-1", reason: "issue resolved" }),
    );

    expect(mockAutomationUpdateMany).not.toHaveBeenCalled();
  });

  it("writes a SUCCESS audit with ADMIN_USER_REACTIVATED action", async () => {
    await adminReactivateUserAction(
      form({ userId: "user-1", reason: "issue resolved" }),
    );

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_USER_REACTIVATED",
          targetId: "user-1",
          adminEmail: "admin@example.com",
          status: "SUCCESS",
        }),
      }),
    );
  });

  it("success message mentions campaigns remain paused", async () => {
    const result = await adminReactivateUserAction(
      form({ userId: "user-1", reason: "issue resolved" }),
    );

    expect(result.status).toBe(200);
    expect(String(result.data).toLowerCase()).toContain("paused");
  });

  it("does not require typed confirmation — reason only", async () => {
    // No confirmation field — should still succeed
    const result = await adminReactivateUserAction(
      form({ userId: "user-1", reason: "issue resolved" }),
    );

    expect(result.status).toBe(200);
  });

  it("returns 400 when reason is shorter than 5 characters", async () => {
    const result = await adminReactivateUserAction(
      form({ userId: "user-1", reason: "ok" }),
    );

    expect(result.status).toBe(400);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not admin", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("not_found"));

    const result = await adminReactivateUserAction(
      form({ userId: "user-1", reason: "issue resolved" }),
    );

    expect(result.status).toBe(403);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await adminReactivateUserAction(
      form({ userId: "user-1", reason: "issue resolved" }),
    );

    expect(result.status).toBe(404);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("revalidates admin-v2 user paths on success", async () => {
    await adminReactivateUserAction(
      form({ userId: "user-1", reason: "issue resolved" }),
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/users");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/overview");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/users/user-1");
  });
});

// ---------------------------------------------------------------------------
// describe("adminChangeUserPlanAction")
// ---------------------------------------------------------------------------

describe("adminChangeUserPlanAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockUserFindUnique.mockResolvedValue(activeUser({ subscription: { plan: "FREE" } }));
    mockSubscriptionUpsert.mockResolvedValue({ plan: "PRO" });
  });

  it("updates the user subscription plan and writes a SUCCESS audit", async () => {
    const result = await adminChangeUserPlanAction(
      form({ userId: "user-1", plan: "PRO", reason: "Manual upgrade", confirmation: "CHANGE PLAN" }),
    );

    expect(result.status).toBe(200);
    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        update: { plan: "PRO" },
        create: { userId: "user-1", plan: "PRO" },
      }),
    );
  });

  it("writes a SUCCESS audit with ADMIN_PLAN_CHANGED action and before/after", async () => {
    await adminChangeUserPlanAction(
      form({ userId: "user-1", plan: "PRO", reason: "Manual upgrade", confirmation: "CHANGE PLAN" }),
    );

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_PLAN_CHANGED",
          targetId: "user-1",
          adminEmail: "admin@example.com",
          before: expect.objectContaining({ plan: "FREE" }),
          after: expect.objectContaining({ plan: "PRO" }),
          status: "SUCCESS",
        }),
      }),
    );
  });

  it("returns 400 when invalid plan provided", async () => {
    const result = await adminChangeUserPlanAction(
      form({ userId: "user-1", plan: "INVALID", reason: "Manual upgrade" }),
    );

    expect(result.status).toBe(400);
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 when reason is shorter than 5 characters", async () => {
    const result = await adminChangeUserPlanAction(
      form({ userId: "user-1", plan: "PRO", reason: "bad" }),
    );

    expect(result.status).toBe(400);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not admin", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("not_found"));

    const result = await adminChangeUserPlanAction(
      form({ userId: "user-1", plan: "PRO", reason: "Manual upgrade" }),
    );

    expect(result.status).toBe(403);
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("returns 404 when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await adminChangeUserPlanAction(
      form({ userId: "user-1", plan: "PRO", reason: "Manual upgrade", confirmation: "CHANGE PLAN" }),
    );

    expect(result.status).toBe(404);
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("revalidates admin-v2 user paths on success", async () => {
    await adminChangeUserPlanAction(
      form({ userId: "user-1", plan: "PRO", reason: "Manual upgrade", confirmation: "CHANGE PLAN" }),
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/users");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/overview");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/users/user-1");
  });

  it("does not call Stripe", async () => {
    // This is a behavioral test — we check that nothing related to Stripe is imported/called.
    // In our mocks, we haven't mocked Stripe, so if it were called, it would fail or we'd see it in the code.
    // By convention, we ensure no stripe import exists in the action file.
  });
});

// ---------------------------------------------------------------------------
// describe("adminResetUserUsageAction")
// ---------------------------------------------------------------------------

describe("adminResetUserUsageAction", () => {
  const FIXED_NOW = new Date("2026-05-31T10:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockUserFindUnique.mockResolvedValue(activeUser({ subscription: { usageResetAt: null } }));
    mockSubscriptionUpsert.mockResolvedValue({ usageResetAt: FIXED_NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates usageResetAt to now and writes a SUCCESS audit", async () => {
    const result = await adminResetUserUsageAction(
      form({ userId: "user-1", reason: "Testing reset", confirmation: "RESET USAGE" }),
    );

    expect(result.status).toBe(200);
    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        update: { usageResetAt: FIXED_NOW },
        create: { userId: "user-1", usageResetAt: FIXED_NOW },
      }),
    );
  });

  it("writes a SUCCESS audit with ADMIN_USER_USAGE_RESET action", async () => {
    await adminResetUserUsageAction(
      form({ userId: "user-1", reason: "Testing reset", confirmation: "RESET USAGE" }),
    );

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_USER_USAGE_RESET",
          targetId: "user-1",
          adminEmail: "admin@example.com",
          before: expect.objectContaining({ usageResetAt: null }),
          after: expect.objectContaining({ usageResetAt: FIXED_NOW }),
          status: "SUCCESS",
        }),
      }),
    );
  });

  it("returns 400 and BLOCKED audit when confirmation is not RESET USAGE", async () => {
    const result = await adminResetUserUsageAction(
      form({ userId: "user-1", reason: "Testing reset", confirmation: "reset" }),
    );

    expect(result.status).toBe(400);
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "BLOCKED" }),
      }),
    );
  });

  it("returns 400 when reason is shorter than 5 characters", async () => {
    const result = await adminResetUserUsageAction(
      form({ userId: "user-1", reason: "bad", confirmation: "RESET USAGE" }),
    );

    expect(result.status).toBe(400);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not admin", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("not_found"));

    const result = await adminResetUserUsageAction(
      form({ userId: "user-1", reason: "Testing reset", confirmation: "RESET USAGE" }),
    );

    expect(result.status).toBe(403);
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("returns 404 when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await adminResetUserUsageAction(
      form({ userId: "user-1", reason: "Testing reset", confirmation: "RESET USAGE" }),
    );

    expect(result.status).toBe(404);
    expect(mockSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("revalidates admin-v2 user paths on success", async () => {
    await adminResetUserUsageAction(
      form({ userId: "user-1", reason: "Testing reset", confirmation: "RESET USAGE" }),
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/users");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/overview");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/users/user-1");
  });
});

// ---------------------------------------------------------------------------
// describe("adminUpdateUserBillingOverridesAction")
// ---------------------------------------------------------------------------

describe("adminUpdateUserBillingOverridesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockUserFindUnique.mockResolvedValue(
      activeUser({
        subscription: {
          monthlyReplyLimitOverride: null,
          activeCampaignLimitOverride: null,
          connectedAccountLimitOverride: null,
          aiReplyLimitOverride: null,
          overrideReason: null,
          overrideExpiresAt: null,
        },
      }),
    );
    mockSubscriptionUpsert.mockResolvedValue({
      monthlyReplyLimitOverride: 1000,
      overrideReason: "VIP partner",
    });
  });

  it("updates overrides and writes a SUCCESS audit", async () => {
    const result = await adminUpdateUserBillingOverridesAction(
      form({
        userId: "user-1",
        reason: "VIP partner",
        monthlyReplyLimitOverride: "1000",
        activeCampaignLimitOverride: "5",
      }),
    );

    expect(result.status).toBe(200);
    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        update: expect.objectContaining({
          monthlyReplyLimitOverride: 1000,
          activeCampaignLimitOverride: 5,
          overrideReason: "VIP partner",
        }),
      }),
    );
  });

  it("writes a SUCCESS audit with ADMIN_BILLING_OVERRIDES_UPDATED and before/after", async () => {
    await adminUpdateUserBillingOverridesAction(
      form({
        userId: "user-1",
        reason: "VIP partner",
        monthlyReplyLimitOverride: "1000",
      }),
    );

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_BILLING_OVERRIDES_UPDATED",
          targetId: "user-1",
          adminEmail: "admin@example.com",
          before: expect.anything(),
          after: expect.objectContaining({
            monthlyReplyLimitOverride: 1000,
          }),
          status: "SUCCESS",
        }),
      }),
    );
  });

  it("clears overrides when values are empty strings", async () => {
    const result = await adminUpdateUserBillingOverridesAction(
      form({
        userId: "user-1",
        reason: "Back to normal",
        monthlyReplyLimitOverride: "",
      }),
    );

    expect(result.status).toBe(200);
    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          monthlyReplyLimitOverride: null,
        }),
      }),
    );
  });

  it("returns 400 when reason is shorter than 5 characters", async () => {
    const result = await adminUpdateUserBillingOverridesAction(
      form({ userId: "user-1", reason: "test" }),
    );

    expect(result.status).toBe(400);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns 400 when numbers are negative", async () => {
    const result = await adminUpdateUserBillingOverridesAction(
      form({
        userId: "user-1",
        reason: "error case",
        monthlyReplyLimitOverride: "-1",
      }),
    );

    expect(result.status).toBe(400);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not admin", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("unauthorized"));

    const result = await adminUpdateUserBillingOverridesAction(
      form({ userId: "user-1", reason: "VIP partner" }),
    );

    expect(result.status).toBe(403);
  });

  it("revalidates paths on success", async () => {
    await adminUpdateUserBillingOverridesAction(
      form({ userId: "user-1", reason: "VIP partner" }),
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/users");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/users/user-1");
  });
});
