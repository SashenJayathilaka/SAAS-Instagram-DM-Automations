import { client } from "@/lib/prisma";
import {
  formatReplyRate,
  getPeriodRange,
  percentChange,
  type ChangeSummary,
  type DashboardMetrics,
  type DashboardPeriod,
  type DashboardPeriodRange,
  type DateRange,
} from "@/lib/dashboard-metrics";

import { userFacingMetricsQuery } from "@/lib/user-facing-metrics-query";

export type UserFacingMetrics = DashboardMetrics;

export type UserFacingStatsComparison = {
  period: DashboardPeriodRange;
  current: UserFacingMetrics;
  previous: UserFacingMetrics;
  changes: {
    commentsReceived: ChangeSummary;
    commentsMatched: ChangeSummary;
    publicRepliesSent: ChangeSummary;
    staticRepliesUsed: ChangeSummary;
    leadsCaptured: ChangeSummary;
  };
};

export async function getUserFacingMetrics(userId: string, range?: DateRange, integrationId?: string): Promise<UserFacingMetrics> {
  // Return one aggregated row instead of transferring thousands of event/meta
  // records and issuing fifteen separate queries for each comparison period.
  const [metrics] = await client.$queryRaw<Array<Omit<UserFacingMetrics, "replyRate" | "staticRepliesUsed" | "aiRepliesUsed">>>(
    userFacingMetricsQuery(userId, range, integrationId)
  );
  return {
    ...metrics,
    replyRate: formatReplyRate(metrics.commentsMatched, metrics.publicRepliesSent),
    staticRepliesUsed: metrics.publicRepliesSent + metrics.dmsSent,
    aiRepliesUsed: 0,
  };
}

export async function getUserFacingStats(
  userId: string,
  period: DashboardPeriod,
  now = new Date(),
  integrationId?: string
): Promise<UserFacingStatsComparison> {
  const periodRange = getPeriodRange(period, now);
  const [current, previous] = await Promise.all([
    getUserFacingMetrics(userId, { gte: periodRange.currentStart, lt: periodRange.currentEnd }, integrationId),
    getUserFacingMetrics(userId, { gte: periodRange.previousStart, lt: periodRange.previousEnd }, integrationId),
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
