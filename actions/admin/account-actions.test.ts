import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireOwnerAdmin = vi.fn();
const mockAuditCreate = vi.fn();
const mockIntegrationsFindUnique = vi.fn();
const mockIntegrationsUpdate = vi.fn();
const mockSnapshotCreate = vi.fn();
const mockSnapshotFindFirst = vi.fn();
const mockAutomationUpdateMany = vi.fn();
const mockRevalidatePath = vi.fn();
const mockGetInstagramBusinessProfile = vi.fn();

vi.mock("@/lib/admin", () => ({
  requireOwnerAdmin: (...args: any[]) => mockRequireOwnerAdmin(...args),
}));
vi.mock("@/lib/fetch", () => ({
  getInstagramBusinessProfile: (...args: any[]) => mockGetInstagramBusinessProfile(...args),
}));
vi.mock("@/lib/prisma", () => ({
  client: {
    adminAuditLog: { create: (...args: any[]) => mockAuditCreate(...args) },
    integrations: {
      findUnique: (...args: any[]) => mockIntegrationsFindUnique(...args),
      update: (...args: any[]) => mockIntegrationsUpdate(...args),
    },
    instagramAccountSnapshot: {
      create: (...args: any[]) => mockSnapshotCreate(...args),
      findFirst: (...args: any[]) => mockSnapshotFindFirst(...args),
    },
    automation: {
      updateMany: (...args: any[]) => mockAutomationUpdateMany(...args),
    },
  },
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}));

import {
  adminRefreshProfileSnapshotAction,
  adminMarkReconnectRequiredAction,
  adminSoftDisconnectAction,
  adminPauseCampaignsForAccountAction,
} from "./account-actions";

const ADMIN = { clerkId: "clerk_admin", email: "admin@example.com" };

function integration(overrides: Record<string, unknown> = {}) {
  return {
    id: "int-1",
    instagramId: "ig-123",
    instagramUsername: "test_user",
    profilePictureUrl: "https://example.com/pic.jpg",
    status: "CONNECTED",
    reconnectRequired: false,
    userId: "user-1",
    token: "EAA_test_token",
    lastAdminNote: null,
    lastAdminActionAt: null,
    ...overrides,
  };
}

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

// ---------------------------------------------------------------------------
describe("adminRefreshProfileSnapshotAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockIntegrationsFindUnique.mockResolvedValue(integration());
    mockSnapshotCreate.mockResolvedValue({ id: "snap-1" });
    mockIntegrationsUpdate.mockResolvedValue({ id: "int-1" });
    mockSnapshotFindFirst.mockResolvedValue(null); // no previous snapshot by default
    // Default: single combined request succeeds with all fields
    mockGetInstagramBusinessProfile.mockResolvedValue({
      data: {
        id: "ig-123",
        username: "test_user",
        profile_picture_url: "https://example.com/newpic.jpg",
        followers_count: 500,
        media_count: 20,
      },
    });
  });

  it("rejects reason shorter than 5 characters", async () => {
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "shor" }));
    expect(result.status).toBe(400);
    expect(mockGetInstagramBusinessProfile).not.toHaveBeenCalled();
  });

  it("blocks non-admin callers", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("Unauthorized"));
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Valid reason" }));
    expect(result.status).toBe(403);
    expect(mockGetInstagramBusinessProfile).not.toHaveBeenCalled();
  });

  it("returns 404 when integration not found", async () => {
    mockIntegrationsFindUnique.mockResolvedValue(null);
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "none", reason: "Valid reason" }));
    expect(result.status).toBe(404);
    expect(mockGetInstagramBusinessProfile).not.toHaveBeenCalled();
  });

  it("calls getInstagramBusinessProfile with combined fields including followers_count and media_count", async () => {
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    expect(result.status).toBe(200);
    const [igId, token, fields] = mockGetInstagramBusinessProfile.mock.calls[0] as [string, string, string];
    expect(igId).toBe("ig-123");
    expect(token).toBe("EAA_test_token");
    expect(fields).toContain("followers_count");
    expect(fields).toContain("media_count");
    expect(fields).toContain("username");
    expect(fields).not.toContain("account_type"); // not in working field set
    expect(mockSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          integrationId: "int-1",
          source: "admin_refresh",
          followersCount: 500,
          mediaCount: 20,
        }),
      })
    );
  });

  it("audit SUCCESS log does not contain the token", async () => {
    await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    const serialized = JSON.stringify(mockAuditCreate.mock.calls);
    expect(serialized).not.toContain("EAA_test_token");
  });

  it("returns 500 with safe Meta error details when API returns non-retryable error", async () => {
    mockGetInstagramBusinessProfile.mockRejectedValue({
      response: { status: 400, data: { error: { code: 190, error_subcode: 463, type: "OAuthException", message: "Error validating access token" } } },
    });
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    expect(result.status).toBe(500);
    expect(String(result.data)).toContain("400");
    expect(String(result.data)).toContain("190");
    expect(String(result.data)).toContain("OAuthException");
    expect(mockSnapshotCreate).not.toHaveBeenCalled();
  });

  it("stores Meta error code, subcode, type, sanitized message in FAILED audit after field", async () => {
    mockGetInstagramBusinessProfile.mockRejectedValue({
      response: { status: 400, data: { error: { code: 190, error_subcode: 463, type: "OAuthException", message: "Session has expired" } } },
    });
    await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          after: expect.objectContaining({ httpStatus: 400, metaCode: 190, metaSubcode: 463, metaType: "OAuthException" }),
        }),
      })
    );
  });

  it("redacts EAA token patterns from Meta error messages in audit log and user response", async () => {
    mockGetInstagramBusinessProfile.mockRejectedValue({
      response: { status: 400, data: { error: { code: 190, type: "OAuthException", message: "Token EAAsecretabc123 is invalid" } } },
    });
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    const serialized = JSON.stringify(mockAuditCreate.mock.calls);
    expect(serialized).not.toContain("EAAsecretabc123");
    expect(String(result.data)).not.toContain("EAAsecretabc123");
    expect(String(result.data)).not.toContain("EAA_test_token");
  });

  it("retries with basic fields when Meta rejects followers_count/media_count as unavailable", async () => {
    // No previous snapshot — source stays admin_refresh (no preserved data exists)
    mockSnapshotFindFirst.mockResolvedValue(null);
    mockGetInstagramBusinessProfile
      .mockRejectedValueOnce({
        response: { data: { error: { message: "Unsupported request for fields: followers_count" } } },
      })
      .mockResolvedValueOnce({
        data: { id: "ig-123", username: "test_user", profile_picture_url: "https://example.com/pic.jpg" },
      });
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    expect(result.status).toBe(200);
    expect(mockGetInstagramBusinessProfile).toHaveBeenCalledTimes(2);
    const secondCall = mockGetInstagramBusinessProfile.mock.calls[1] as [string, string, string];
    // Second call must use basic fields only — followers_count dropped
    expect(secondCall[2]).not.toContain("followers_count");
    expect(secondCall[2]).toContain("username");
    expect(mockSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ username: "test_user" }) })
    );
  });

  it("fallback to basic fields with no previous snapshot writes null counts", async () => {
    mockSnapshotFindFirst.mockResolvedValue(null);
    mockGetInstagramBusinessProfile
      .mockRejectedValueOnce({ response: { data: { error: { message: "Unsupported for fields: followers_count" } } } })
      .mockResolvedValueOnce({ data: { id: "ig-123", username: "test_user", profile_picture_url: "https://example.com/pic.jpg" } });
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    expect(result.status).toBe(200);
    expect(mockSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ followersCount: null, mediaCount: null }) })
    );
  });

  it("fallback to basic fields preserves previous followersCount and mediaCount", async () => {
    mockSnapshotFindFirst.mockResolvedValue({ followersCount: 1200, mediaCount: 45 });
    mockGetInstagramBusinessProfile
      .mockRejectedValueOnce({ response: { data: { error: { message: "Unsupported for fields: followers_count" } } } })
      .mockResolvedValueOnce({ data: { id: "ig-123", username: "test_user", profile_picture_url: "https://example.com/pic.jpg" } });
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    expect(result.status).toBe(200);
    expect(mockSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ followersCount: 1200, mediaCount: 45, source: "admin_refresh_partial" }) })
    );
  });

  it("missing counts in successful response fall back to previous snapshot values", async () => {
    mockSnapshotFindFirst.mockResolvedValue({ followersCount: 800, mediaCount: 30 });
    mockGetInstagramBusinessProfile.mockResolvedValue({
      data: { id: "ig-123", username: "test_user", profile_picture_url: "https://example.com/pic.jpg" },
      // no followers_count or media_count returned
    });
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    expect(result.status).toBe(200);
    expect(mockSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ followersCount: 800, mediaCount: 30 }) })
    );
  });

  it("returns partial-sync warning message when stats are preserved from previous snapshot", async () => {
    mockSnapshotFindFirst.mockResolvedValue({ followersCount: 500, mediaCount: 20 });
    mockGetInstagramBusinessProfile
      .mockRejectedValueOnce({ response: { data: { error: { message: "followers_count unavailable" } } } })
      .mockResolvedValueOnce({ data: { id: "ig-123", username: "test_user", profile_picture_url: "https://example.com/pic.jpg" } });
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    expect(result.status).toBe(200);
    expect(String(result.data).toLowerCase()).toContain("previous");
  });

  it("full success uses source admin_refresh (not partial) when all counts returned live", async () => {
    const result = await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    expect(result.status).toBe(200);
    expect(mockSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: "admin_refresh", followersCount: 500, mediaCount: 20 }) })
    );
  });

  it("does not update integration status or reconnectRequired", async () => {
    await adminRefreshProfileSnapshotAction(form({ integrationId: "int-1", reason: "Refreshing data" }));
    const updateCall = mockIntegrationsUpdate.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("status");
    expect(updateCall.data).not.toHaveProperty("reconnectRequired");
  });
});

// ---------------------------------------------------------------------------
describe("adminMarkReconnectRequiredAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockIntegrationsFindUnique.mockResolvedValue(integration());
    mockIntegrationsUpdate.mockResolvedValue({ id: "int-1", reconnectRequired: true });
  });

  it("rejects reason shorter than 5 characters", async () => {
    const result = await adminMarkReconnectRequiredAction(form({ integrationId: "int-1", reason: "shor" }));
    expect(result.status).toBe(400);
    expect(mockIntegrationsUpdate).not.toHaveBeenCalled();
  });

  it("blocks non-admin callers", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("Unauthorized"));
    const result = await adminMarkReconnectRequiredAction(form({ integrationId: "int-1", reason: "Valid reason" }));
    expect(result.status).toBe(403);
    expect(mockIntegrationsUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when integration not found", async () => {
    mockIntegrationsFindUnique.mockResolvedValue(null);
    const result = await adminMarkReconnectRequiredAction(form({ integrationId: "none", reason: "Valid reason" }));
    expect(result.status).toBe(404);
  });

  it("returns 400 when already marked for reconnect", async () => {
    mockIntegrationsFindUnique.mockResolvedValue(integration({ reconnectRequired: true }));
    const result = await adminMarkReconnectRequiredAction(form({ integrationId: "int-1", reason: "Valid reason" }));
    expect(result.status).toBe(400);
    expect(String(result.data).toLowerCase()).toContain("already");
    expect(mockIntegrationsUpdate).not.toHaveBeenCalled();
  });

  it("sets reconnectRequired=true and writes SUCCESS audit log", async () => {
    const result = await adminMarkReconnectRequiredAction(form({ integrationId: "int-1", reason: "Token expired" }));
    expect(result.status).toBe(200);
    expect(mockIntegrationsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reconnectRequired: true }) })
    );
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "ADMIN_MARK_RECONNECT_REQUIRED", status: "SUCCESS" }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
describe("adminSoftDisconnectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockIntegrationsFindUnique.mockResolvedValue(integration());
    mockIntegrationsUpdate.mockResolvedValue({ id: "int-1", status: "DISCONNECTED" });
  });

  it("rejects reason shorter than 5 characters", async () => {
    const result = await adminSoftDisconnectAction(form({ integrationId: "int-1", reason: "shor", confirmation: "DISCONNECT" }));
    expect(result.status).toBe(400);
    expect(mockIntegrationsUpdate).not.toHaveBeenCalled();
  });

  it("blocks non-admin callers", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("Unauthorized"));
    const result = await adminSoftDisconnectAction(form({ integrationId: "int-1", reason: "Valid reason", confirmation: "DISCONNECT" }));
    expect(result.status).toBe(403);
  });

  it("returns 404 when integration not found", async () => {
    mockIntegrationsFindUnique.mockResolvedValue(null);
    const result = await adminSoftDisconnectAction(form({ integrationId: "none", reason: "Valid reason", confirmation: "DISCONNECT" }));
    expect(result.status).toBe(404);
  });

  it("returns 400 when already disconnected", async () => {
    mockIntegrationsFindUnique.mockResolvedValue(integration({ status: "DISCONNECTED" }));
    const result = await adminSoftDisconnectAction(form({ integrationId: "int-1", reason: "Valid reason", confirmation: "DISCONNECT" }));
    expect(result.status).toBe(400);
    expect(String(result.data).toLowerCase()).toContain("already");
    expect(mockIntegrationsUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when typed confirmation is wrong (case-sensitive)", async () => {
    const result = await adminSoftDisconnectAction(form({ integrationId: "int-1", reason: "Valid reason", confirmation: "disconnect" }));
    expect(result.status).toBe(400);
    expect(String(result.data)).toContain("DISCONNECT");
    expect(mockIntegrationsUpdate).not.toHaveBeenCalled();
  });

  it("sets status=DISCONNECTED on correct confirmation and writes SUCCESS audit log", async () => {
    const result = await adminSoftDisconnectAction(form({ integrationId: "int-1", reason: "Policy violation", confirmation: "DISCONNECT" }));
    expect(result.status).toBe(200);
    expect(mockIntegrationsUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DISCONNECTED",
          disconnectedAt: expect.any(Date),
          disconnectedReason: "Policy violation",
        }),
      })
    );
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "ADMIN_SOFT_DISCONNECT_ACCOUNT", status: "SUCCESS" }),
      })
    );
  });

  it("does not touch Automation table (campaigns paused separately)", async () => {
    await adminSoftDisconnectAction(form({ integrationId: "int-1", reason: "Policy violation", confirmation: "DISCONNECT" }));
    expect(mockAutomationUpdateMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("adminPauseCampaignsForAccountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwnerAdmin.mockResolvedValue(ADMIN);
    mockAuditCreate.mockResolvedValue({ id: "audit-1" });
    mockIntegrationsFindUnique.mockResolvedValue(integration());
    mockAutomationUpdateMany.mockResolvedValue({ count: 3 });
    mockIntegrationsUpdate.mockResolvedValue({ id: "int-1" });
  });

  it("rejects reason shorter than 5 characters", async () => {
    const result = await adminPauseCampaignsForAccountAction(form({ integrationId: "int-1", reason: "shor" }));
    expect(result.status).toBe(400);
    expect(mockAutomationUpdateMany).not.toHaveBeenCalled();
  });

  it("blocks non-admin callers", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("Unauthorized"));
    const result = await adminPauseCampaignsForAccountAction(form({ integrationId: "int-1", reason: "Valid reason", confirmation: "PAUSE" }));
    expect(result.status).toBe(403);
  });

  it("returns 400 when typed confirmation is wrong (case-sensitive)", async () => {
    const result = await adminPauseCampaignsForAccountAction(form({ integrationId: "int-1", reason: "Valid reason", confirmation: "pause" }));
    expect(result.status).toBe(400);
    expect(String(result.data)).toContain("PAUSE");
    expect(mockAutomationUpdateMany).not.toHaveBeenCalled();
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "ADMIN_PAUSE_ACCOUNT_CAMPAIGNS", status: "BLOCKED" }),
      })
    );
  });

  it("returns 404 when integration not found", async () => {
    mockIntegrationsFindUnique.mockResolvedValue(null);
    const result = await adminPauseCampaignsForAccountAction(form({ integrationId: "none", reason: "Valid reason", confirmation: "PAUSE" }));
    expect(result.status).toBe(404);
  });

  it("returns 400 when integration has no userId", async () => {
    mockIntegrationsFindUnique.mockResolvedValue(integration({ userId: null }));
    const result = await adminPauseCampaignsForAccountAction(form({ integrationId: "int-1", reason: "Valid reason", confirmation: "PAUSE" }));
    expect(result.status).toBe(400);
  });

  it("returns 400 when no active campaigns found", async () => {
    mockAutomationUpdateMany.mockResolvedValue({ count: 0 });
    const result = await adminPauseCampaignsForAccountAction(form({ integrationId: "int-1", reason: "Valid reason", confirmation: "PAUSE" }));
    expect(result.status).toBe(400);
    expect(String(result.data).toLowerCase()).toContain("no active");
  });

  it("pauses all active non-archived campaigns and writes SUCCESS audit log with count", async () => {
    const result = await adminPauseCampaignsForAccountAction(form({ integrationId: "int-1", reason: "Health review", confirmation: "PAUSE" }));
    expect(result.status).toBe(200);
    expect(mockAutomationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", active: true, archivedAt: null }),
        data: expect.objectContaining({ active: false, needsReview: true }),
      })
    );
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_PAUSE_ACCOUNT_CAMPAIGNS",
          status: "SUCCESS",
          after: expect.objectContaining({ pausedCount: 3 }),
        }),
      })
    );
  });
});
