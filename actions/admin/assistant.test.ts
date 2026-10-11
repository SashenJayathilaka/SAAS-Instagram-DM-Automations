import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  tx: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  generate: vi.fn(),
  lock: vi.fn(),
  stats: vi.fn(),
  health: vi.fn(),
  analytics: vi.fn(),
}));
vi.mock("@/actions/admin/safe-actions", () => ({
  requireAdminAction: mocks.guard,
}));
vi.mock("@/lib/prisma", () => ({
  client: { $transaction: mocks.tx, adminAuditLog: { update: mocks.update } },
}));
vi.mock("@/lib/ai-reply", () => ({ generateAdminAssistance: mocks.generate }));
vi.mock("@/lib/admin-v2/queries", () => ({
  getAdminV2Stats: mocks.stats,
  getAdminV2SystemHealth: mocks.health,
}));
vi.mock("@/lib/admin-v2/analytics", () => ({
  getAdminAnalytics: mocks.analytics,
}));
import { adminAssistantAction } from "./assistant";

describe("admin AI safeguards", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.guard.mockResolvedValue({
      clerkId: "owner",
      email: "owner@example.test",
    });
    mocks.count.mockResolvedValue(0);
    mocks.create.mockResolvedValue({ id: "request" });
    mocks.generate.mockResolvedValue("Review the failed send attempts first.");
    mocks.tx.mockImplementation(async (callback) =>
      callback({
        $executeRaw: mocks.lock,
        adminAuditLog: { count: mocks.count, create: mocks.create },
      }),
    );
    mocks.stats.mockResolvedValue({ totalUsers: 3 });
    mocks.health.mockResolvedValue({ attentionAccounts: 1 });
    mocks.analytics.mockResolvedValue({ days: 7, totals: { sent: 12 } });
  });
  it("authorizes before reading analytics or calling the provider", async () => {
    mocks.guard.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(adminAssistantAction("operations")).rejects.toThrow(
      "NOT_FOUND",
    );
    expect(mocks.tx).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("enforces the server-side hourly request limit", async () => {
    mocks.count.mockResolvedValue(10);
    const result = await adminAssistantAction("operations");
    expect(result.ok).toBe(false);
    expect(mocks.lock).toHaveBeenCalledOnce();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejects oversized draft reviews before billing a provider", async () => {
    expect(
      (await adminAssistantAction("editorial", "x".repeat(24001))).ok,
    ).toBe(false);
    expect(mocks.tx).not.toHaveBeenCalled();
  });
  it("sends only aggregate operational inputs and records no prompt body in audit metadata", async () => {
    expect((await adminAssistantAction("operations")).ok).toBe(true);
    const context = JSON.parse(mocks.generate.mock.calls[0][1]);
    expect(context).toEqual({
      stats: { totalUsers: 3 },
      health: { attentionAccounts: 1 },
      analytics: { days: 7, totals: { sent: 12 } },
    });
    expect(mocks.update.mock.calls[0][0].data.metadata).toEqual({
      mode: "operations",
      outputLength: "Review the failed send attempts first.".length,
    });
  });
  it("returns a sanitized failure instead of provider credentials or private error bodies", async () => {
    mocks.generate.mockRejectedValue(
      new Error("secret-private-provider-response"),
    );
    const result = await adminAssistantAction(
      "editorial",
      "Public article draft",
    );
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret-private");
    expect(mocks.update.mock.calls[0][0].data.status).toBe("FAILED");
  });
  it("identifies provider quota failures without returning raw error details", async () => {
    mocks.generate.mockRejectedValue(Object.assign(new Error("private-key-and-response"), { status: 429 }));
    const result = await adminAssistantAction("operations");
    expect(result.message).toContain("quota or rate limit");
    expect(result.message).not.toContain("private-key");
    expect(mocks.update.mock.calls[0][0].data.error).toBe("provider: RATE_LIMIT");
  });
});
