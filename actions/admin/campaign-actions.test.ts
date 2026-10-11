import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireOwnerAdmin = vi.fn();
const mockAuditCreate = vi.fn();
const mockAutomationFindUnique = vi.fn();
const mockAutomationUpdate = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/lib/admin", () => ({
  requireOwnerAdmin: (...args: any[]) => mockRequireOwnerAdmin(...args),
}));

vi.mock("@/lib/prisma", () => ({
  client: {
    adminAuditLog: { create: (...args: any[]) => mockAuditCreate(...args) },
    automation: {
      findUnique: (...args: any[]) => mockAutomationFindUnique(...args),
      update: (...args: any[]) => mockAutomationUpdate(...args),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}));

import { adminPauseCampaignAction, adminResumeCampaignAction } from "./campaign-actions";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ADMIN = { clerkId: "clerk_admin", email: "admin@example.com" };

function campaign(overrides: Record<string, unknown> = {}) {
  return {
    id: "camp-1",
    name: "Test Campaign",
    active: true,
    needsReview: false,
    reviewReason: null,
    archivedAt: null,
    ...overrides,
  };
}

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// ---------------------------------------------------------------------------
// describe("adminPauseCampaignAction")
// ---------------------------------------------------------------------------

describe("adminPauseCampaignAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockAutomationFindUnique.mockResolvedValue(campaign({ active: true }));
    mockAutomationUpdate.mockResolvedValue(campaign({ active: false }));
  });

  it("sets active=false and does not write needsReview to the DB", async () => {
    const result = await adminPauseCampaignAction(
      form({ campaignId: "camp-1", reason: "Policy violation" })
    );

    expect(result.status).toBe(200);
    expect(mockAutomationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "camp-1" }, data: { active: false } })
    );
    expect(mockAutomationUpdate.mock.calls[0][0].data).not.toHaveProperty("needsReview");
  });

  it("preserves existing needsReview=true — pause does not clear it", async () => {
    mockAutomationFindUnique.mockResolvedValue(
      campaign({ active: true, needsReview: true, reviewReason: "flagged" })
    );
    mockAutomationUpdate.mockResolvedValue(campaign({ active: false, needsReview: true }));

    const result = await adminPauseCampaignAction(
      form({ campaignId: "camp-1", reason: "Policy violation" })
    );

    expect(result.status).toBe(200);
    expect(mockAutomationUpdate.mock.calls[0][0].data).toStrictEqual({ active: false });
    expect(mockAutomationUpdate.mock.calls[0][0].data).not.toHaveProperty("needsReview");
  });

  it("writes a SUCCESS audit log with ADMIN_PAUSE_CAMPAIGN action", async () => {
    await adminPauseCampaignAction(
      form({ campaignId: "camp-1", reason: "Policy violation" })
    );

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_PAUSE_CAMPAIGN",
          targetId: "camp-1",
          adminEmail: "admin@example.com",
          status: "SUCCESS",
        }),
      })
    );
  });

  it("blocks archived campaigns — returns 400, no DB update", async () => {
    mockAutomationFindUnique.mockResolvedValue(campaign({ archivedAt: new Date() }));

    const result = await adminPauseCampaignAction(
      form({ campaignId: "camp-1", reason: "Policy violation" })
    );

    expect(result.status).toBe(400);
    expect(mockAutomationUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when campaign not found", async () => {
    mockAutomationFindUnique.mockResolvedValue(null);

    const result = await adminPauseCampaignAction(
      form({ campaignId: "camp-1", reason: "Policy violation" })
    );

    expect(result.status).toBe(404);
    expect(mockAutomationUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not admin", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("not_found"));

    const result = await adminPauseCampaignAction(
      form({ campaignId: "camp-1", reason: "Policy violation" })
    );

    expect(result.status).toBe(403);
    expect(mockAutomationUpdate).not.toHaveBeenCalled();
  });

  it("rejects reason shorter than 5 characters — no DB calls", async () => {
    const result = await adminPauseCampaignAction(
      form({ campaignId: "camp-1", reason: "no" })
    );

    expect(result.status).toBe(400);
    expect(mockAutomationFindUnique).not.toHaveBeenCalled();
    expect(mockAutomationUpdate).not.toHaveBeenCalled();
  });

  it("revalidates admin-v2 paths on success", async () => {
    await adminPauseCampaignAction(
      form({ campaignId: "camp-1", reason: "Policy violation" })
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/campaigns");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/overview");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/activity");
  });
});

// ---------------------------------------------------------------------------
// describe("adminResumeCampaignAction")
// ---------------------------------------------------------------------------

describe("adminResumeCampaignAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockAutomationFindUnique.mockResolvedValue(campaign({ active: false, needsReview: false }));
    mockAutomationUpdate.mockResolvedValue(campaign({ active: true }));
  });

  it("sets active=true when needsReview=false", async () => {
    const result = await adminResumeCampaignAction(
      form({ campaignId: "camp-1", reason: "Issue resolved" })
    );

    expect(result.status).toBe(200);
    expect(mockAutomationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "camp-1" }, data: { active: true } })
    );
  });

  it("does not set needsReview=false on successful resume", async () => {
    await adminResumeCampaignAction(
      form({ campaignId: "camp-1", reason: "Issue resolved" })
    );

    expect(mockAutomationUpdate.mock.calls[0][0].data).toStrictEqual({ active: true });
    expect(mockAutomationUpdate.mock.calls[0][0].data).not.toHaveProperty("needsReview");
  });

  it("blocks resume when needsReview=true — returns 400, no DB update", async () => {
    mockAutomationFindUnique.mockResolvedValue(
      campaign({ active: false, needsReview: true, reviewReason: "flagged" })
    );

    const result = await adminResumeCampaignAction(
      form({ campaignId: "camp-1", reason: "Issue resolved" })
    );

    expect(result.status).toBe(400);
    expect(String(result.data ?? "")).toMatch(/review/i);
    expect(mockAutomationUpdate).not.toHaveBeenCalled();
  });

  it("writes a BLOCKED audit log when needsReview=true", async () => {
    mockAutomationFindUnique.mockResolvedValue(
      campaign({ active: false, needsReview: true })
    );

    await adminResumeCampaignAction(
      form({ campaignId: "camp-1", reason: "Issue resolved" })
    );

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_RESUME_CAMPAIGN",
          status: "BLOCKED",
        }),
      })
    );
  });

  it("writes a SUCCESS audit log with ADMIN_RESUME_CAMPAIGN action", async () => {
    await adminResumeCampaignAction(
      form({ campaignId: "camp-1", reason: "Issue resolved" })
    );

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_RESUME_CAMPAIGN",
          targetId: "camp-1",
          adminEmail: "admin@example.com",
          status: "SUCCESS",
        }),
      })
    );
  });

  it("blocks archived campaigns — returns 400, no DB update", async () => {
    mockAutomationFindUnique.mockResolvedValue(
      campaign({ active: false, archivedAt: new Date() })
    );

    const result = await adminResumeCampaignAction(
      form({ campaignId: "camp-1", reason: "Issue resolved" })
    );

    expect(result.status).toBe(400);
    expect(mockAutomationUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when caller is not admin", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("not_found"));

    const result = await adminResumeCampaignAction(
      form({ campaignId: "camp-1", reason: "Issue resolved" })
    );

    expect(result.status).toBe(403);
    expect(mockAutomationUpdate).not.toHaveBeenCalled();
  });

  it("rejects reason shorter than 5 characters — no DB calls", async () => {
    const result = await adminResumeCampaignAction(
      form({ campaignId: "camp-1", reason: "ok" })
    );

    expect(result.status).toBe(400);
    expect(mockAutomationFindUnique).not.toHaveBeenCalled();
    expect(mockAutomationUpdate).not.toHaveBeenCalled();
  });

  it("revalidates admin-v2 paths on success", async () => {
    await adminResumeCampaignAction(
      form({ campaignId: "camp-1", reason: "Issue resolved" })
    );

    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/campaigns");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/overview");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/activity");
  });
});
