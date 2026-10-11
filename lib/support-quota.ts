import "server-only";
import { createHash } from "node:crypto";
import { client } from "@/lib/prisma";

export const SUPPORT_DAILY_LIMIT = 25;

/** A durable allowance independent of user-clearable chat history. */
export async function reserveSupportRequest(userId: string, now = new Date()) {
  const windowStart = new Date(now);
  windowStart.setUTCHours(0, 0, 0, 0);
  const key = createHash("sha256").update(`support-assistant:${userId}`).digest("hex");
  // Reuse the existing daily counter store with its two-day retention. Meta's
  // minute counters are unsuitable: their cleanup runs after only two hours.
  const legacyMessages = await client.aiChatMessage.count({
    where: { userId, context: "SUPPORT", role: "user", createdAt: { gte: windowStart } },
  });
  const counter = await client.marketingRateLimit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: legacyMessages + 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  return counter.count <= SUPPORT_DAILY_LIMIT;
}
