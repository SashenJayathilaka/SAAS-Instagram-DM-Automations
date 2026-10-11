import { Prisma } from "@prisma/client";
import type { DateRange } from "@/lib/dashboard-metrics";

// Same characters as String.trim(), including Unicode whitespace in legacy IDs.
const whitespace = "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff";

export function userFacingMetricsQuery(userId: string, range?: DateRange, integrationId?: string) {
  const dateFilter = Prisma.sql`TRUE
    ${range?.gte ? Prisma.sql`AND e."createdAt" >= ${range.gte}` : Prisma.empty}
    ${range?.lt ? Prisma.sql`AND e."createdAt" < ${range.lt}` : Prisma.empty}`;
  // All facts join the authenticated owner's campaigns; the account filter is
  // applied before aggregation. Parameters stay bound, never interpolated SQL.
  return Prisma.sql`
    WITH campaigns AS MATERIALIZED (
      SELECT id, active FROM "Automation" WHERE "userId" = ${userId}::uuid
      ${integrationId ? Prisma.sql`AND "integrationId" = ${integrationId}::uuid` : Prisma.empty}
    ), comments AS (
      SELECT (COUNT(DISTINCT NULLIF(e."commentId", '')) FILTER (WHERE ${dateFilter})
        + COUNT(*) FILTER (WHERE e."commentId" = '' AND ${dateFilter}))::int AS "commentsReceived",
        MAX(e."createdAt") AS "lastRealCommentAt"
      FROM "WebhookEvent" e JOIN campaigns a ON a.id = e."automationId"
      WHERE e."commentId" IS NOT NULL
        AND e."eventType" IN ('REAL_COMMENT_EVENT', 'COMMENT_WEBHOOK_RECEIVED', 'COMMENT_RECEIVED')
    ), event_rows AS (
      SELECT e."eventType", e."createdAt",
        COALESCE(
          CASE WHEN jsonb_typeof(e.meta->'sourceCommentId') = 'string'
            THEN NULLIF(btrim(e.meta->>'sourceCommentId', ${whitespace}), '') END,
          NULLIF(btrim(e."commentId", ${whitespace}), '')
        ) AS source_id,
        CASE WHEN jsonb_typeof(e.meta->'publicReplyCommentId') = 'string'
          THEN NULLIF(btrim(e.meta->>'publicReplyCommentId', ${whitespace}), '') END AS reply_id
      FROM "AutomationEvent" e JOIN campaigns a ON a.id = e."automationId"
      WHERE e."eventType" IN ('KEYWORD_MATCHED', 'PUBLIC_REPLY_SENT', 'DM_SKIPPED') AND ${dateFilter}
    ), events AS (
      SELECT (COUNT(DISTINCT source_id) FILTER (WHERE "eventType" = 'KEYWORD_MATCHED')
        + COUNT(*) FILTER (WHERE "eventType" = 'KEYWORD_MATCHED' AND source_id IS NULL))::int AS "commentsMatched",
        COUNT(DISTINCT reply_id) FILTER (WHERE "eventType" = 'PUBLIC_REPLY_SENT')::int AS "replyEvents",
        (COUNT(DISTINCT source_id) FILTER (WHERE "eventType" = 'DM_SKIPPED')
        + COUNT(*) FILTER (WHERE "eventType" = 'DM_SKIPPED' AND source_id IS NULL))::int AS "skippedEvents",
        MAX("createdAt") FILTER (WHERE "eventType" = 'PUBLIC_REPLY_SENT') AS "lastReplyEventAt"
      FROM event_rows
    ), messages AS (
      SELECT (COUNT(DISTINCT NULLIF(e."commentId", '')) FILTER (WHERE e."messageType" = 'COMMENT_REPLY' AND e.status = 'SENT')
        + COUNT(*) FILTER (WHERE e."messageType" = 'COMMENT_REPLY' AND e.status = 'SENT' AND COALESCE(e."commentId", '') = ''))::int AS "replyLogs",
        COUNT(*) FILTER (WHERE e."messageType" = 'DM' AND e.status = 'SENT')::int AS "dmsSent",
        COUNT(*) FILTER (WHERE e."messageType" = 'DM' AND e.status = 'FAILED')::int AS "dmsFailed",
        COUNT(*) FILTER (WHERE e."messageType" = 'DM' AND e.status = 'SKIPPED')::int AS "skippedLogs",
        MAX(e."createdAt") FILTER (WHERE e."messageType" = 'COMMENT_REPLY' AND e.status = 'SENT') AS "lastReplyLogAt",
        MAX(e."createdAt") FILTER (WHERE e."messageType" = 'DM' AND e.status = 'SENT') AS "lastDmAt"
      FROM "MessageLog" e JOIN campaigns a ON a.id = e."automationId" WHERE ${dateFilter}
    ), leads AS (
      SELECT COUNT(*)::int AS "leadsCaptured" FROM "Lead" e JOIN campaigns a ON a.id = e."automationId" WHERE ${dateFilter}
    )
    SELECT comments.*, events."commentsMatched", messages."dmsSent", messages."dmsFailed", messages."lastDmAt", leads.*,
      CASE WHEN messages."replyLogs" > 0 THEN messages."replyLogs" ELSE events."replyEvents" END AS "publicRepliesSent",
      CASE WHEN messages."skippedLogs" > 0 THEN messages."skippedLogs" ELSE events."skippedEvents" END AS "dmsSkipped",
      GREATEST(messages."lastReplyLogAt", events."lastReplyEventAt") AS "lastPublicReplyAt",
      (SELECT COUNT(*)::int FROM campaigns WHERE active) AS "activeCampaigns",
      (SELECT COUNT(*)::int FROM "Integrations" WHERE "userId" = ${userId}::uuid
        ${integrationId ? Prisma.sql`AND id = ${integrationId}::uuid` : Prisma.empty}) AS "connectedAccounts"
    FROM comments CROSS JOIN events CROSS JOIN messages CROSS JOIN leads
  `;
}
