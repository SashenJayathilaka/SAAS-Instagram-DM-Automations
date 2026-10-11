import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ count: vi.fn(), authorize: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ client: { user: { count: mocks.count } } }));
vi.mock("@/lib/admin", () => ({ requireOwnerAdmin: mocks.authorize }));
import { getLaunchMetrics } from "./launch-metrics";

describe("launch measurement access and semantics", () => {
  beforeEach(() => vi.resetAllMocks());
  it("never queries customer records when owner authorization fails", async () => {
    mocks.authorize.mockRejectedValue(new Error("Forbidden"));
    await expect(getLaunchMetrics()).rejects.toThrow("Forbidden");
    expect(mocks.count).not.toHaveBeenCalled();
  });
  it("counts users with accepted sends, with a bounded signup cohort and recent-use window", async () => {
    mocks.authorize.mockResolvedValue({});
    mocks.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8).mockResolvedValueOnce(6).mockResolvedValueOnce(4);
    const now = new Date("2026-09-19T12:00:00Z");
    expect(await getLaunchMetrics(now)).toEqual({ signups: 10, connected: 8, firstSend: 6, usedThisWeek: 4 });
    for (const [query] of mocks.count.mock.calls) {
      expect(query.where.createdAt).toEqual({ gte: new Date("2026-08-20T12:00:00Z"), lte: now });
    }
    expect(mocks.count.mock.calls[2][0].where.automations.some.messageLogs.some.status).toBe("SENT");
    expect(mocks.count.mock.calls[3][0].where.automations.some.messageLogs.some).toEqual({
      status: "SENT", createdAt: { gte: new Date("2026-09-12T12:00:00Z"), lte: now },
    });
  });
});
