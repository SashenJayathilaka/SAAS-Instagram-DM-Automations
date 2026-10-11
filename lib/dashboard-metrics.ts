import { client } from "@/lib/prisma";

export const MATCHED_EVENT_TYPES = ["KEYWORD_MATCHED"] as const;
export const REAL_COMMENT_WEBHOOK_TYPES = ["REAL_COMMENT_EVENT", "COMMENT_WEBHOOK_RECEIVED"] as const;

export type DateRange = {
  gte?: Date;
  lt?: Date;
};

export type DashboardPeriod = "24h" | "7d" | "month" | "30d";

export type DashboardPeriodRange = {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
};

export type ChangeSummary = {
  label: string;
  tone: "positive" | "negative" | "neutral";
  value: number | null;
};

export type DashboardMetrics = {
  commentsReceived: number;
  commentsMatched: number;
  publicRepliesSent: number;
  dmsSent: number;
  dmsFailed: number;
  dmsSkipped: number;
  leadsCaptured: number;
  replyRate: number;
  staticRepliesUsed: number;
  aiRepliesUsed: number;
  activeCampaigns: number;
  connectedAccounts: number;
  lastRealCommentAt: Date | null;
  lastPublicReplyAt: Date | null;
  lastDmAt: Date | null;
};

export type CampaignTableMetric = {
  automationId: string;
  runs: number;
  leads: number;
};

export type DashboardStatsComparison = {
  period: DashboardPeriodRange;
  current: DashboardMetrics;
  previous: DashboardMetrics;
  changes: {
    commentsReceived: ChangeSummary;
    commentsMatched: ChangeSummary;
    publicRepliesSent: ChangeSummary;
    staticRepliesUsed: ChangeSummary;
    leadsCaptured: ChangeSummary;
  };
};

export function formatReplyRate(commentsMatched: number, repliesSent: number) {
  if (commentsMatched <= 0 || !Number.isFinite(commentsMatched) || !Number.isFinite(repliesSent)) return 0;
  return Math.min(100, Math.max(0, Math.round((repliesSent / commentsMatched) * 100)));
}

export function getDashboardGreeting(input: {
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  clerkId?: string | null;
}) {
  const name = [input.firstname, input.lastname].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (input.email) return input.email.split("@")[0] || "there";
  return "there";
}

export function parseDashboardPeriod(value?: string | null): DashboardPeriod {
  return value === "24h" || value === "7d" || value === "month" || value === "30d" ? value : "month";
}

export function getPeriodRange(period: DashboardPeriod, now = new Date()): DashboardPeriodRange {
  const currentEnd = new Date(now);
  if (period === "24h") {
    const currentStart = new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000);
    return {
      currentStart,
      currentEnd,
      previousStart: new Date(currentStart.getTime() - 24 * 60 * 60 * 1000),
      previousEnd: currentStart,
      label: "Last 24h",
    };
  }
  if (period === "7d") {
    const currentStart = new Date(currentEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      currentStart,
      currentEnd,
      previousStart: new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      previousEnd: currentStart,
      label: "Last 7d",
    };
  }
  if (period === "30d") {
    const currentStart = new Date(currentEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      currentStart,
      currentEnd,
      previousStart: new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000),
      previousEnd: currentStart,
      label: "Last 30d",
    };
  }

  const currentStart = new Date(Date.UTC(currentEnd.getUTCFullYear(), currentEnd.getUTCMonth(), 1));
  const previousStart = new Date(Date.UTC(currentEnd.getUTCFullYear(), currentEnd.getUTCMonth() - 1, 1));
  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd: new Date(Math.min(currentStart.getTime(), previousStart.getTime() + currentEnd.getTime() - currentStart.getTime())),
    label: `${currentStart.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}–${currentEnd.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`,
  };
}

export function percentChange(current: number, previous: number): ChangeSummary {
  if (previous > 0) {
    const value = Math.round(((current - previous) / previous) * 100);
    return {
      value,
      label: `${value > 0 ? "+" : ""}${value}%`,
      tone: value > 0 ? "positive" : value < 0 ? "negative" : "neutral",
    };
  }
  if (current > 0) return { value: null, label: "New", tone: "positive" };
  return { value: null, label: "—", tone: "neutral" };
}

function rangeWhere(range?: DateRange) {
  if (!range?.gte && !range?.lt) return {};
  return { createdAt: { ...(range.gte ? { gte: range.gte } : {}), ...(range.lt ? { lt: range.lt } : {}) } };
}

function automationUserWhere(userId: string, range?: DateRange) {
  return {
    automation: { userId },
    ...rangeWhere(range),
  };
}

export async function getUserDashboardMetrics(userId: string, range?: DateRange): Promise<DashboardMetrics> {
  const whereByUser = automationUserWhere(userId, range);
  const webhookWhere = {
    automation: { userId },
    eventType: { in: [...REAL_COMMENT_WEBHOOK_TYPES] },
    ...rangeWhere(range),
  };

  const [
    commentsReceived,
    commentsMatched,
    publicReplyLogs,
    publicReplyFallbackEvents,
    dmsSent,
    dmsFailed,
    dmsSkippedLogs,
    dmsSkippedEvents,
    leadsCaptured,
    activeCampaigns,
    connectedAccounts,
    lastRealComment,
    lastPublicReplyLog,
    lastPublicReplyEvent,
    lastDm,
  ] = await Promise.all([
    client.webhookEvent.count({ where: webhookWhere }),
    client.automationEvent.count({
      where: { ...whereByUser, eventType: { in: [...MATCHED_EVENT_TYPES] } },
    }),
    client.messageLog.count({
      where: { ...whereByUser, messageType: "COMMENT_REPLY", status: "SENT" },
    }),
    client.automationEvent.count({
      where: { ...whereByUser, eventType: "PUBLIC_REPLY_SENT" },
    }),
    client.messageLog.count({
      where: { ...whereByUser, messageType: "DM", status: "SENT" },
    }),
    client.messageLog.count({
      where: { ...whereByUser, messageType: "DM", status: "FAILED" },
    }),
    client.messageLog.count({
      where: { ...whereByUser, messageType: "DM", status: "SKIPPED" },
    }),
    client.automationEvent.count({
      where: { ...whereByUser, eventType: "DM_SKIPPED" },
    }),
    client.lead.count({ where: { automation: { userId }, ...rangeWhere(range) } }),
    client.automation.count({ where: { userId, active: true } }),
    client.integrations.count({ where: { userId } }),
    client.webhookEvent.findFirst({
      where: webhookWhere,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    client.messageLog.findFirst({
      where: { ...whereByUser, messageType: "COMMENT_REPLY", status: "SENT" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    client.automationEvent.findFirst({
      where: { ...whereByUser, eventType: "PUBLIC_REPLY_SENT" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    client.messageLog.findFirst({
      where: { ...whereByUser, messageType: "DM", status: "SENT" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const publicRepliesSent = publicReplyLogs + (publicReplyLogs > 0 ? 0 : publicReplyFallbackEvents);
  const staticRepliesUsed = publicRepliesSent + dmsSent;
  const lastPublicReplyAt =
    lastPublicReplyLog?.createdAt && lastPublicReplyEvent?.createdAt
      ? lastPublicReplyLog.createdAt > lastPublicReplyEvent.createdAt
        ? lastPublicReplyLog.createdAt
        : lastPublicReplyEvent.createdAt
      : lastPublicReplyLog?.createdAt ?? lastPublicReplyEvent?.createdAt ?? null;

  return {
    commentsReceived,
    commentsMatched,
    publicRepliesSent,
    dmsSent,
    dmsFailed,
    dmsSkipped: dmsSkippedLogs + (dmsSkippedLogs > 0 ? 0 : dmsSkippedEvents),
    leadsCaptured,
    replyRate: formatReplyRate(commentsMatched, publicRepliesSent + dmsSent),
    staticRepliesUsed,
    aiRepliesUsed: 0,
    activeCampaigns,
    connectedAccounts,
    lastRealCommentAt: lastRealComment?.createdAt ?? null,
    lastPublicReplyAt,
    lastDmAt: lastDm?.createdAt ?? null,
  };
}

export async function getUserDashboardStats(
  userId: string,
  period: DashboardPeriod,
  now = new Date()
): Promise<DashboardStatsComparison> {
  const periodRange = getPeriodRange(period, now);
  const [current, previous] = await Promise.all([
    getUserDashboardMetrics(userId, { gte: periodRange.currentStart, lt: periodRange.currentEnd }),
    getUserDashboardMetrics(userId, { gte: periodRange.previousStart, lt: periodRange.previousEnd }),
  ]);

  return {
    period: periodRange,
    current,
    previous,
    changes: {
      commentsReceived: percentChange(current.commentsReceived, previous.commentsReceived),
      commentsMatched: percentChange(current.commentsMatched, previous.commentsMatched),
      publicRepliesSent: percentChange(current.publicRepliesSent, previous.publicRepliesSent),
      staticRepliesUsed: percentChange(current.staticRepliesUsed, previous.staticRepliesUsed),
      leadsCaptured: percentChange(current.leadsCaptured, previous.leadsCaptured),
    },
  };
}

export async function getCampaignTableMetrics(userId: string, integrationId?: string): Promise<Record<string, CampaignTableMetric>> {
  const [runs, leads] = await Promise.all([
    client.automationEvent.groupBy({
      by: ["automationId"],
      where: {
        automation: { userId, ...(integrationId ? { integrationId } : {}) },
        eventType: { in: [...MATCHED_EVENT_TYPES] },
      },
      _count: { _all: true },
    }),
    client.lead.groupBy({
      by: ["automationId"],
      where: { automation: { userId, ...(integrationId ? { integrationId } : {}) } },
      _count: { _all: true },
    }),
  ]);

  const metrics: Record<string, CampaignTableMetric> = {};
  for (const row of runs) {
    metrics[row.automationId] = {
      automationId: row.automationId,
      runs: row._count._all,
      leads: 0,
    };
  }
  for (const row of leads) {
    metrics[row.automationId] = {
      automationId: row.automationId,
      runs: metrics[row.automationId]?.runs ?? 0,
      leads: row._count._all,
    };
  }
  return metrics;
}

export async function getUserUsageSummary(userId: string, range: DateRange) {
  return getUserDashboardMetrics(userId, range);
}

export async function getIntegrationHealth(userId: string) {
  const integration = await client.integrations.findFirst({
    where: { userId },
    select: {
      instagramId: true,
      pageId: true,
      webhookAccountId: true,
      createdAt: true,
      webhookSubscriptionLastAttemptedAt: true,
    },
  });

  const accountIds = [
    integration?.pageId,
    integration?.instagramId,
    integration?.webhookAccountId,
  ].filter(Boolean) as string[];

  const where = {
    eventType: { in: [...REAL_COMMENT_WEBHOOK_TYPES] },
    OR: [
      { automation: { userId } },
      ...(accountIds.length > 0 ? [{ igAccountId: { in: accountIds } }] : []),
    ],
  };

  const lastRealComment = await client.webhookEvent.findFirst({
    where,
    orderBy: { createdAt: "desc" },
    select: { eventType: true, status: true, field: true, errorMessage: true, createdAt: true },
  });

  return {
    lastRealComment,
    commentDeliveryActive: Boolean(lastRealComment),
  };
}

export async function getCampaignDetailMetrics(automationId: string, userId: string) {
  const [runs, leads, publicRepliesSent, dmsSent, dmsFailed, dmsSkipped] = await Promise.all([
    client.automationEvent.count({
      where: { automationId, automation: { userId }, eventType: { in: [...MATCHED_EVENT_TYPES] } },
    }),
    client.lead.count({ where: { automationId, automation: { userId } } }),
    client.messageLog.count({
      where: { automationId, automation: { userId }, messageType: "COMMENT_REPLY", status: "SENT" },
    }),
    client.messageLog.count({
      where: { automationId, automation: { userId }, messageType: "DM", status: "SENT" },
    }),
    client.messageLog.count({
      where: { automationId, automation: { userId }, messageType: "DM", status: "FAILED" },
    }),
    client.messageLog.count({
      where: { automationId, automation: { userId }, messageType: "DM", status: "SKIPPED" },
    }),
  ]);

  return {
    automationId,
    runs,
    leads,
    publicRepliesSent,
    dmsSent,
    dmsFailed,
    dmsSkipped,
    replyRate: formatReplyRate(runs, publicRepliesSent + dmsSent),
  };
}
