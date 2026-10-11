import { client } from "@/lib/prisma";
import {
  getCurrentUsagePeriod,
  getPlanLabel,
  getPlanLimits,
  isUnlimited,
  makeUsageMetric,
  type ProductPlan,
  type UsageSummary,
} from "@/lib/plan-limits";

export async function getUserMonthlyUsage(userId: string, date = new Date()): Promise<UsageSummary> {
  const period = getCurrentUsagePeriod(date);
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      subscription: {
        select: {
          plan: true,
          usageResetAt: true,
        },
      },
    },
  });

  const plan = (user?.subscription?.plan ?? "FREE") as ProductPlan;
  const limits = getPlanLimits(plan);

  // Keep the published plan limits authoritative across billing and enforcement.
  // Historical per-account overrides and launch-trial columns are intentionally
  // ignored so every user sees the same monthly entitlement the product advertises.
  const staticLimit = limits.staticRepliesPerMonth;
  const aiLimit = limits.aiRepliesPerMonth;
  const campaignLimit = limits.activeCampaigns;
  const accountLimit = limits.connectedInstagramAccounts;

  const resetAt = user?.subscription?.usageResetAt;
  const effectiveStart = resetAt && resetAt > period.enforcementStart ? resetAt : period.enforcementStart;
  const effectiveEnd = period.monthEnd;

  const [publicReplyLogs, dmLogs, aiReplies, activeCampaigns, connectedAccounts, starterReplies, deletedReplies] = await Promise.all([
    client.messageLog.count({
      where: {
        status: "SENT",
        messageType: "COMMENT_REPLY",
        createdAt: { gte: effectiveStart, lt: effectiveEnd },
        automation: { userId },
      },
    }),
    client.messageLog.count({
      where: {
        status: "SENT",
        messageType: "DM",
        createdAt: { gte: effectiveStart, lt: effectiveEnd },
        automation: { userId },
      },
    }),
    client.aiUsageEvent.count({
      where: {
        userId,
        createdAt: { gte: effectiveStart, lt: effectiveEnd },
      },
    }),
    client.automation.count({ where: { userId, active: true, archivedAt: null, OR: [{ integration: { planLocked: false } }, { integrationId: null }] } }),
    client.integrations.count({ where: { userId, status: { not: "DISCONNECTED" } } }),
    client.conversationStarterReceipt.count({ where: { status: "SENT", integration: { userId }, createdAt: { gte: effectiveStart, lt: effectiveEnd } } }),
    client.deletedReplyUsage.count({ where: { userId, createdAt: { gte: effectiveStart, lt: effectiveEnd } } }),
  ]);

  const [publicReplyEventFallback, dmEventFallback] = await Promise.all([
    publicReplyLogs > 0
      ? Promise.resolve(0)
      : client.automationEvent.count({
          where: {
            eventType: "PUBLIC_REPLY_SENT",
            createdAt: { gte: effectiveStart, lt: effectiveEnd },
            automation: { userId },
          },
        }),
    dmLogs > 0
      ? Promise.resolve(0)
      : client.automationEvent.count({
          where: {
            eventType: "DM_SENT",
            createdAt: { gte: effectiveStart, lt: effectiveEnd },
            automation: { userId },
          },
        }),
  ]);

  const staticReplies = publicReplyLogs + dmLogs + publicReplyEventFallback + dmEventFallback + deletedReplies + starterReplies;

  return {
    plan,
    planLabel: getPlanLabel(plan),
    periodLabel: period.periodLabel,
    periodStart: effectiveStart,
    periodEnd: effectiveEnd,
    enforcementStart: effectiveStart,
    staticReplies: makeUsageMetric(staticReplies, staticLimit),
    aiReplies: makeUsageMetric(aiReplies, aiLimit),
    activeCampaigns: makeUsageMetric(activeCampaigns, campaignLimit),
    connectedAccounts: makeUsageMetric(connectedAccounts, accountLimit),
  };
}

export async function canSendStaticReply(userId: string, date = new Date()) {
  const usage = await getUserMonthlyUsage(userId, date);
  return {
    ok: !usage.staticReplies.blocked,
    usage,
    reason: usage.staticReplies.blocked ? "static_reply_limit_reached" : undefined,
  };
}

export async function canSendAiReply(userId: string, date = new Date()) {
  const usage = await getUserMonthlyUsage(userId, date);
  return {
    ok: !usage.aiReplies.blocked,
    usage,
    reason: usage.aiReplies.blocked ? "ai_reply_limit_reached" : undefined,
  };
}

type AiReplyReservationInput = {
  userId: string;
  automationId?: string | null;
  channel?: "COMMENT" | "DM" | "PLAYGROUND";
  allowFreePreview?: boolean;
  igUserId?: string | null;
  mediaId?: string | null;
  commentId?: string | null;
  keyword?: string | null;
  date?: Date;
};

/**
 * Atomically reserves one provider request before the AI call starts.
 *
 * The per-user advisory lock prevents simultaneous webhooks from reading the
 * same remaining balance and both passing the limit. Provider failures can
 * release the reservation; classifications and generated replies count as one
 * AI decision because they both consume a provider request.
 */
export async function reserveAiReplyQuota(input: AiReplyReservationInput) {
  const date = input.date ?? new Date();

  return client.$transaction(async (tx) => {
    // PostgreSQL declares pg_advisory_xact_lock as returning `void`.
    // Prisma cannot deserialize that type, so selecting it without a cast
    // aborts every AI quota reservation before the provider is called.
    // Keep the transaction-scoped lock, but expose its result as text.
    await tx.$queryRaw<Array<{ lockResult: string }>>`
      SELECT pg_advisory_xact_lock(hashtext(${input.userId}))::text AS "lockResult"
    `;

    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { status: true, subscription: { select: { plan: true, usageResetAt: true } } },
    });
    if (!user || user.status === "SUSPENDED") throw new Error("Account unavailable");
    const plan = (user?.subscription?.plan ?? "FREE") as ProductPlan;
    const limit = plan === "FREE" && input.channel === "PLAYGROUND" && input.allowFreePreview ? 20 : getPlanLimits(plan).aiRepliesPerMonth;
    const period = getCurrentUsagePeriod(date);
    const resetAt = user?.subscription?.usageResetAt;
    const effectiveStart = resetAt && resetAt > period.enforcementStart
      ? resetAt
      : period.enforcementStart;

    const used = await tx.aiUsageEvent.count({
      where: {
        userId: input.userId,
        createdAt: { gte: effectiveStart, lt: period.monthEnd },
      },
    });

    if (!isUnlimited(limit) && used >= limit) {
      return {
        ok: false as const,
        reason: "ai_reply_limit_reached" as const,
        plan,
        used,
        limit,
        periodLabel: period.periodLabel,
        reservationId: null,
      };
    }

    const reservation = await tx.aiUsageEvent.create({
      data: {
        userId: input.userId,
        automationId: input.automationId ?? undefined,
        channel: input.channel ?? "COMMENT",
        status: "RESERVED",
        meta: {
          status: "reserved",
          quotaPlan: plan,
          quotaPeriod: period.periodLabel,
          igUserId: input.igUserId ?? null,
          mediaId: input.mediaId ?? null,
          commentId: input.commentId ?? null,
          keyword: input.keyword ?? null,
        },
      },
      select: { id: true },
    });

    return {
      ok: true as const,
      plan,
      used: used + 1,
      limit,
      periodLabel: period.periodLabel,
      reservationId: reservation.id,
    };
  });
}

export async function completeAiReplyReservation(
  reservationId: string,
  meta: Record<string, string | number | boolean | null>
) {
  const completed = await client.aiUsageEvent.updateMany({
    where: { id: reservationId },
    data: { status: "COMPLETED", meta: { status: "completed", ...meta } },
  });
  if (!completed.count) return;
  const usage = await client.aiUsageEvent.findUnique({ where: { id: reservationId }, select: { automationId: true, channel: true } });
  if (usage?.automationId) {
    await client.automationEvent.create({
      data: {
        automationId: usage.automationId,
        eventType: "AI_REPLY_GENERATED",
        meta: { status: "completed", channel: usage.channel, ...meta },
      },
    });
  }
}

export async function releaseAiReplyReservation(reservationId: string) {
  await client.aiUsageEvent.deleteMany({ where: { id: reservationId } });
}

export async function canActivateCampaign(userId: string, automationId?: string) {
  const usage = await getUserMonthlyUsage(userId);
  if (!usage.activeCampaigns.blocked) return { ok: true, usage };

  if (automationId) {
    const existing = await client.automation.findFirst({
      where: { id: automationId, userId, active: true, archivedAt: null },
      select: { id: true },
    });
    if (existing) return { ok: true, usage };
  }

  return {
    ok: false,
    usage,
    reason: "active_campaign_limit_reached",
  };
}
