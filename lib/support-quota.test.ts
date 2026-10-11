import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ count: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { aiChatMessage: { count: mocks.count }, marketingRateLimit: { upsert: mocks.upsert } } }));
import { reserveSupportRequest } from "./support-quota";

describe("support allowance", () => {
  let counters: Map<string, number>;
  beforeEach(() => {
    vi.clearAllMocks();
    counters = new Map();
    mocks.count.mockResolvedValue(0);
    mocks.upsert.mockImplementation(async ({ create, update }: any) => {
      const key = `${create.key}:${create.windowStart.toISOString()}`;
      const count = counters.has(key) ? counters.get(key)! + update.count.increment : create.count;
      counters.set(key, count);
      return { count };
    });
  });
  it("allows only 25 simultaneous requests even before chat messages exist", async () => {
    const results = await Promise.all(Array.from({ length: 35 }, () => reserveSupportRequest("owner", new Date("2026-10-09T12:00:00Z"))));
    expect(results.filter(Boolean)).toHaveLength(25);
  });
  it("clearing chat cannot reset an existing counter", async () => {
    mocks.count.mockResolvedValue(24);
    expect(await reserveSupportRequest("owner")).toBe(true);
    mocks.count.mockResolvedValue(0);
    expect(await reserveSupportRequest("owner")).toBe(false);
  });
  it("isolates owners and resets at UTC midnight", async () => {
    mocks.count.mockResolvedValue(25);
    expect(await reserveSupportRequest("owner", new Date("2026-10-09T23:59:00Z"))).toBe(false);
    mocks.count.mockResolvedValue(0);
    expect(await reserveSupportRequest("another", new Date("2026-10-09T23:59:00Z"))).toBe(true);
    expect(await reserveSupportRequest("owner", new Date("2026-10-10T00:00:00Z"))).toBe(true);
  });
  it("fails closed when the counter database is unavailable", async () => {
    mocks.upsert.mockRejectedValue(new Error("unavailable"));
    await expect(reserveSupportRequest("owner")).rejects.toThrow("unavailable");
  });
});
