import { client } from "@/lib/prisma";
import { createHash } from "crypto";

const DEFAULT_MAX_REQUESTS_PER_ACCOUNT_MINUTE = 1_800;
const MIN_LIMIT = 60;
const MAX_LIMIT = 10_000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const RETENTION_MS = 2 * 60 * 60 * 1000;

let nextCleanupAt = 0;

type RateLimitStore = Pick<typeof client, "webhookRateLimitBucket">;

export function webhookAccountRateLimit() {
  const configured = Number.parseInt(
    process.env.META_WEBHOOK_MAX_REQUESTS_PER_ACCOUNT_MINUTE ?? "",
    10
  );
  if (!Number.isFinite(configured)) return DEFAULT_MAX_REQUESTS_PER_ACCOUNT_MINUTE;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, configured));
}

export function webhookRateLimitKey(accountId: string) {
  return createHash("sha256").update(`meta:${accountId}`).digest("hex");
}

export async function consumeWebhookAccountRateLimit(
  accountIds: string[],
  options: { now?: Date; store?: RateLimitStore; limit?: number } = {}
) {
  const now = options.now ?? new Date();
  const store = options.store ?? client;
  const limit = options.limit ?? webhookAccountRateLimit();
  const windowStart = new Date(now);
  windowStart.setUTCSeconds(0, 0);

  const keys = Array.from(
    new Set(accountIds.map((value) => value.trim()).filter(Boolean).map(webhookRateLimitKey))
  );
  if (keys.length === 0) return { allowed: true as const, limit, highestCount: 0 };

  const buckets = await Promise.all(
    keys.map((key) =>
      store.webhookRateLimitBucket.upsert({
        where: { key_windowStart: { key, windowStart } },
        create: { key, windowStart, count: 1 },
        update: { count: { increment: 1 } },
        select: { count: true },
      })
    )
  );
  const highestCount = Math.max(...buckets.map((bucket) => bucket.count));
  return { allowed: highestCount <= limit, limit, highestCount };
}

export async function cleanupWebhookRateLimitBuckets(
  options: { now?: Date; store?: RateLimitStore } = {}
) {
  const now = options.now ?? new Date();
  if (now.getTime() < nextCleanupAt) return 0;
  nextCleanupAt = now.getTime() + CLEANUP_INTERVAL_MS;

  const result = await (options.store ?? client).webhookRateLimitBucket.deleteMany({
    where: { updatedAt: { lt: new Date(now.getTime() - RETENTION_MS) } },
  });
  return result.count;
}
