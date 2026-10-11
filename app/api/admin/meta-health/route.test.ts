import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireOwnerAdmin = vi.fn();
const mockGetMetaAdminDiagnostics = vi.fn();

vi.mock("@/lib/admin", () => ({
  requireOwnerAdmin: (...args: unknown[]) => mockRequireOwnerAdmin(...args),
}));

vi.mock("@/lib/meta-admin-diagnostics", () => ({
  getMetaAdminDiagnostics: (...args: unknown[]) => mockGetMetaAdminDiagnostics(...args),
}));

import { GET } from "./route";

describe("owner Meta health diagnostics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_HOST_URL = "https://ap3k.test";
    process.env.META_VERIFY_TOKEN = "configured";
    process.env.META_APP_SECRET = "configured";
    mockRequireOwnerAdmin.mockResolvedValue({ clerkId: "admin", email: "owner@example.com" });
    mockGetMetaAdminDiagnostics.mockResolvedValue({
      lastRawPost: { createdAt: new Date().toISOString() },
      lastRealComment: { createdAt: new Date().toISOString() },
      lastSignatureFailed: null,
      lastRouteError: null,
      lastIntegrationMatchFailed: null,
      lastAutomationMatchFailed: null,
    });
  });

  it("requires owner admin before returning diagnostics", async () => {
    const response = await GET();
    const body = await response.json();

    expect(mockRequireOwnerAdmin).toHaveBeenCalledOnce();
    expect(body).toMatchObject({
      ok: true,
      webhookUrl: "https://ap3k.test/api/webhooks/meta",
      hasMetaVerifyToken: true,
      hasMetaAppSecret: true,
    });
    expect(mockGetMetaAdminDiagnostics).toHaveBeenCalledOnce();
  });

  it("does not fetch diagnostics when owner auth fails", async () => {
    mockRequireOwnerAdmin.mockRejectedValue(new Error("not_found"));

    await expect(GET()).rejects.toThrow("not_found");
    expect(mockGetMetaAdminDiagnostics).not.toHaveBeenCalled();
  });
});
