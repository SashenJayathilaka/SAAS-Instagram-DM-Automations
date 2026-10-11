import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireOwnerAdmin = vi.fn();
const mockAuditCreate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockAutomationUpdateMany = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/lib/admin", () => ({
  requireOwnerAdmin: (...args: any[]) => mockRequireOwnerAdmin(...args),
}));

vi.mock("@/lib/prisma", () => ({
  client: {
    adminAuditLog: { create: (...args: any[]) => mockAuditCreate(...args) },
    user: {
      findUnique: (...args: any[]) => mockUserFindUnique(...args),
      update: (...args: any[]) => mockUserUpdate(...args),
    },
    automation: {
      updateMany: (...args: any[]) => mockAutomationUpdateMany(...args),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/fetch", () => ({
  subscribeInstagramWebhooks: vi.fn(),
  formatSafeMetaError: () => "safe meta error",
}));

vi.mock("@/actions/usage/queries", () => ({
  canActivateCampaign: vi.fn(async () => ({ ok: true })),
}));

import { suspendUserAction } from "./operations";

describe("admin operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue({ clerkId: "clerk_admin", email: "admin@example.com" });
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      status: "ACTIVE",
      suspendedAt: null,
      suspendedReason: null,
    });
    mockUserUpdate.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      status: "SUSPENDED",
      suspendedAt: new Date("2026-05-24T09:30:00Z"),
      suspendedReason: "abuse report",
    });
    mockAutomationUpdateMany.mockResolvedValue({ count: 2 });
  });

  it("suspends a user, pauses campaigns, and writes a SUCCESS audit", async () => {
    const form = new FormData();
    form.set("userId", "user-1");
    form.set("reason", "abuse report");
    form.set("confirmation", "SUSPEND");

    await expect(suspendUserAction(form)).resolves.toMatchObject({ status: 200 });

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ status: "SUSPENDED", suspendedReason: "abuse report" }),
      })
    );
    expect(mockAutomationUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { active: false },
    });
    expect(mockAuditCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "SUSPEND_USER",
          status: "SUCCESS",
          reason: "abuse report",
        }),
      })
    );
  });
});
