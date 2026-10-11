import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuditCreate = vi.fn();
const mockRequireOwnerAdmin = vi.fn();

vi.mock("@/lib/prisma", () => ({
  client: {
    adminAuditLog: {
      create: (...args: any[]) => mockAuditCreate(...args),
    },
  },
}));

vi.mock("@/lib/admin", () => ({
  requireOwnerAdmin: (...args: any[]) => mockRequireOwnerAdmin(...args),
}));

import {
  createAdminAuditLog,
  requireAdminAction,
  requireTypedConfirmation,
} from "./safe-actions";

describe("safe admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockRequireOwnerAdmin.mockResolvedValue({
      clerkId: "clerk_admin",
      email: "admin@example.com",
    });
  });

  it("requires owner admin identity", async () => {
    await expect(requireAdminAction()).resolves.toMatchObject({
      clerkId: "clerk_admin",
      email: "admin@example.com",
    });
  });

  it("sanitizes secrets before writing audit logs", async () => {
    await createAdminAuditLog({
      admin: { clerkId: "clerk_admin", email: "admin@example.com" },
      action: "TEST",
      targetType: "Integration",
      targetId: "integration-1",
      before: { accessToken: "secret-token", safeId: "1784" },
      metadata: { nested: { META_APP_SECRET: "secret" } },
    });

    const data = mockAuditCreate.mock.calls[0][0].data;
    expect(JSON.stringify(data)).not.toContain("secret-token");
    expect(JSON.stringify(data)).not.toContain("secret\"");
    expect(data.before).toMatchObject({ accessToken: "[redacted]", safeId: "1784" });
    expect(data.metadata).toMatchObject({ nested: { META_APP_SECRET: "[redacted]" } });
  });

  it("creates a BLOCKED audit log for confirmation mismatch", async () => {
    await expect(
      requireTypedConfirmation({
        admin: { clerkId: "clerk_admin", email: "admin@example.com" },
        action: "ARCHIVE_CAMPAIGN",
        targetType: "Automation",
        targetId: "campaign-1",
        reason: "cleanup",
        confirmation: "DELETE",
        expected: "ARCHIVE",
      })
    ).rejects.toThrow("Type ARCHIVE");

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "BLOCKED",
          action: "ARCHIVE_CAMPAIGN",
          confirmation: "DELETE",
        }),
      })
    );
  });
});
