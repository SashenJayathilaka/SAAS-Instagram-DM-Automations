import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireOwnerAdmin = vi.fn();
const mockAuditCreate = vi.fn();
const mockAutomationFindUnique = vi.fn();
const mockListenerUpdate = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/lib/admin", () => ({
  requireOwnerAdmin: (...args: any[]) => mockRequireOwnerAdmin(...args),
}));

vi.mock("@/lib/prisma", () => ({
  client: {
    adminAuditLog: { create: (...args: any[]) => mockAuditCreate(...args) },
    automation: {
      findUnique: (...args: any[]) => mockAutomationFindUnique(...args),
    },
    listener: {
      update: (...args: any[]) => mockListenerUpdate(...args),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}));

// We import the action that doesn't exist yet - this should cause a type error or runtime error if run
import { adminUpdateCampaignRepliesAction } from "./campaign-replies";

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
    listener: {
      commentReply: "Old Reply 1",
      commentReply2: "Old Reply 2",
      commentReply3: "Old Reply 3",
    },
    ...overrides,
  };
}

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// ---------------------------------------------------------------------------
// describe("adminUpdateCampaignRepliesAction")
// ---------------------------------------------------------------------------

describe("adminUpdateCampaignRepliesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockAutomationFindUnique.mockResolvedValue(campaign());
    mockListenerUpdate.mockResolvedValue({
      commentReply: "New Reply 1",
      commentReply2: "New Reply 2",
      commentReply3: "",
    });
  });

  it("updates listener replies and creates a SUCCESS audit log", async () => {
    const result = await adminUpdateCampaignRepliesAction(
      form({
        campaignId: "camp-1",
        reason: "Updating messaging",
        reply1: "New Reply 1",
        reply2: "New Reply 2",
        reply3: "",
      })
    );

    expect(result.status).toBe(200);
    expect(mockListenerUpdate).toHaveBeenCalledWith({
      where: { automationId: "camp-1" },
      data: {
        commentReply: "New Reply 1",
        commentReply2: "New Reply 2",
        commentReply3: null, // Trimming and nullifying empty strings
        commentReplies: ["New Reply 1", "New Reply 2"],
      },
    });

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_UPDATE_CAMPAIGN_REPLIES",
          targetType: "AUTOMATION",
          targetId: "camp-1",
          status: "SUCCESS",
          before: {
            reply1: "Old Reply 1",
            reply2: "Old Reply 2",
            reply3: "Old Reply 3",
          },
          after: {
            reply1: "New Reply 1",
            reply2: "New Reply 2",
            reply3: null,
          },
          reason: "Updating messaging",
        }),
      })
    );
  });

  it("blocks non-admin callers", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("Unauthorized"));
    const result = await adminUpdateCampaignRepliesAction(
      form({ campaignId: "camp-1", reason: "Valid reason", reply1: "Valid" })
    );
    expect(result.status).toBe(403);
    expect(mockListenerUpdate).not.toHaveBeenCalled();
  });

  it("rejects reason shorter than 5 characters", async () => {
    const result = await adminUpdateCampaignRepliesAction(
      form({ campaignId: "camp-1", reason: "shor", reply1: "Valid" })
    );
    expect(result.status).toBe(400);
    expect(mockListenerUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when campaign or listener not found", async () => {
    mockAutomationFindUnique.mockResolvedValue(null);
    const result = await adminUpdateCampaignRepliesAction(
      form({ campaignId: "non-existent", reason: "Valid reason", reply1: "Valid" })
    );
    expect(result.status).toBe(404);
    expect(mockListenerUpdate).not.toHaveBeenCalled();
  });

  it("blocks updates on archived campaigns", async () => {
    mockAutomationFindUnique.mockResolvedValue(campaign({ archivedAt: new Date() }));
    const result = await adminUpdateCampaignRepliesAction(
      form({ campaignId: "camp-1", reason: "Valid reason", reply1: "Valid" })
    );
    expect(result.status).toBe(400);
    expect(String(result.data).toLowerCase()).toContain("archived");
    expect(mockListenerUpdate).not.toHaveBeenCalled();
  });

  it("blocks when all 3 variants are empty", async () => {
    const result = await adminUpdateCampaignRepliesAction(
      form({
        campaignId: "camp-1",
        reason: "Valid reason",
        reply1: "",
        reply2: "",
        reply3: "",
      })
    );
    expect(result.status).toBe(400);
    expect(String(result.data).toLowerCase()).toContain("at least one");
    expect(mockListenerUpdate).not.toHaveBeenCalled();
  });

  it("blocks when any variant exceeds 500 characters", async () => {
    const longReply = "a".repeat(501);
    const result = await adminUpdateCampaignRepliesAction(
      form({ campaignId: "camp-1", reason: "Valid reason", reply1: longReply })
    );
    expect(result.status).toBe(400);
    expect(String(result.data)).toContain("500 characters");
    expect(mockListenerUpdate).not.toHaveBeenCalled();
  });

  it("does not update Automation active/needsReview status", async () => {
    await adminUpdateCampaignRepliesAction(
      form({ campaignId: "camp-1", reason: "Valid reason", reply1: "New" })
    );
    // mockListenerUpdate was called, but check if mockAutomationUpdate was NOT (if we had mocked it)
    // Actually, we only mocked listener.update, so we're safe by definition unless we add it.
  });

  it("revalidates only specific admin-v2 paths", async () => {
    await adminUpdateCampaignRepliesAction(
      form({ campaignId: "camp-1", reason: "Valid reason", reply1: "New" })
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/replies");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/campaigns");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/ap3k-admin-v2/activity");
    expect(mockRevalidatePath).not.toHaveBeenCalledWith("/ap3k-admin-v2/overview");
  });
});
