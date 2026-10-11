import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consumeWebhookAccountRateLimit,
  webhookAccountRateLimit,
  webhookRateLimitKey,
} from "@/lib/webhook-rate-limit";

afterEach(() => {
  delete process.env.META_WEBHOOK_MAX_REQUESTS_PER_ACCOUNT_MINUTE;
});

describe("distributed Meta webhook rate limiting", () => {
  it("uses a stable non-reversible account key", () => {
    expect(webhookRateLimitKey("17841400000000000")).toMatch(/^[a-f0-9]{64}$/);
    expect(webhookRateLimitKey("17841400000000000")).toBe(webhookRateLimitKey("17841400000000000"));
    expect(webhookRateLimitKey("17841400000000000")).not.toContain("17841400000000000");
  });

  it("bounds configuration to a safe range", () => {
    process.env.META_WEBHOOK_MAX_REQUESTS_PER_ACCOUNT_MINUTE = "10";
    expect(webhookAccountRateLimit()).toBe(60);
    process.env.META_WEBHOOK_MAX_REQUESTS_PER_ACCOUNT_MINUTE = "999999";
    expect(webhookAccountRateLimit()).toBe(10_000);
  });

  it("atomically increments one bucket per unique Instagram account", async () => {
    const upsert = vi.fn().mockResolvedValueOnce({ count: 7 }).mockResolvedValueOnce({ count: 11 });
    const result = await consumeWebhookAccountRateLimit(
      ["ig-a", "ig-a", "ig-b"],
      {
        now: new Date("2026-09-12T01:23:45.000Z"),
        limit: 10,
        store: { webhookRateLimitBucket: { upsert, deleteMany: vi.fn() } } as never,
      }
    );

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0].where.key_windowStart.windowStart).toEqual(
      new Date("2026-09-12T01:23:00.000Z")
    );
    expect(result).toEqual({ allowed: false, limit: 10, highestCount: 11 });
  });
});
