import { client } from "@/lib/prisma";

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const DAY = 86_400_000;
export const ANALYTICS_RECENT_LIMIT = 50;

export type AutomationActivity = { id: string; recipient: string; createdAt: string; source?: string; country?: string | null };
export type AutomationAnalytics = {
  automation: { id: string; name: string; active: boolean; createdAt: string; source: string; followGateRequired: boolean; postThumbnail: string | null; responseCount: number; messageType?: string };
  totals: { hits: number; uniqueHitRecipients: number; clicks: number; eligibleNonFollowers: number; newFollowers: number; clickRate: number; followRate: number };
  daily: Array<{ date: string; hits: number; clicks: number }>;
  countries: Array<{ country: string | null; clicks: number }>;
  recent: { hits: AutomationActivity[]; clicks: AutomationActivity[]; follows: AutomationActivity[] };
  links?: Array<{ destination: string; recipients: number; clicks: number }>;
  trackingStartedAt: string | null;
};
type Count = number | bigint;
type Totals = { hits: Count; uniqueHitRecipients: Count; clicks: Count; eligibleNonFollowers: Count; newFollowers: Count; trackingStartedAt: Date | null };
type ActivityRow = { id: string; recipientIgId: string; createdAt: Date; source?: string; country?: string | null };

const percent = (numerator: number, denominator: number) => denominator ? Math.round(numerator / denominator * 1000) / 10 : 0;

/** Owner and selected account are checked before any analytics query is issued. */
export async function getAutomationAnalytics(automationId: string, clerkId: string, integrationId: string, now = new Date()): Promise<AutomationAnalytics | null> {
  if (!UUID.test(automationId) || !UUID.test(integrationId) || !clerkId) return null;
  const automation = await client.automation.findFirst({
    where: { id: automationId, integrationId, archivedAt: null, User: { clerkId }, integration: { User: { clerkId } } },
    select: { id: true, name: true, active: true, createdAt: true, source: true, followGateRequired: true,
      posts: { select: { media: true }, take: 1, orderBy: { id: "asc" } }, listener: { select: { dmCount: true, responseFormat: true, ctaLink: true } } },
  });
  if (!automation) return null;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(today.getTime() - 6 * DAY);
  const end = new Date(today.getTime() + DAY);
  // All aggregation happens in Postgres; no unbounded contact/history arrays are loaded.
  // EXISTS excludes forwarded/unmatched link recipients from the conversion denominator.
  const [totalsRows, dailyRows, countries, hits, clicks, follows, links] = await Promise.all([
    client.$queryRaw<Totals[]>`
      SELECT
        (SELECT COUNT(*) FROM "AutomationHit" WHERE "automationId" = ${automationId}::uuid) AS hits,
        (SELECT COUNT(DISTINCT "recipientIgId") FROM "AutomationHit" WHERE "automationId" = ${automationId}::uuid) AS "uniqueHitRecipients",
        (SELECT COUNT(*) FROM "AutomationClick" c WHERE c."automationId" = ${automationId}::uuid
          AND EXISTS (SELECT 1 FROM "AutomationHit" h WHERE h."automationId" = c."automationId" AND h."recipientIgId" = c."recipientIgId")) AS clicks,
        (SELECT COUNT(*) FROM "AutomationFollowerState" WHERE "automationId" = ${automationId}::uuid AND "integrationId" = ${integrationId}::uuid AND NOT "firstFollowing") AS "eligibleNonFollowers",
        (SELECT COUNT(*) FROM "AutomationFollowerState" WHERE "automationId" = ${automationId}::uuid AND "integrationId" = ${integrationId}::uuid AND NOT "firstFollowing" AND "followedAt" IS NOT NULL) AS "newFollowers",
        (SELECT MIN("createdAt") FROM "AutomationHit" WHERE "automationId" = ${automationId}::uuid) AS "trackingStartedAt"`,
    client.$queryRaw<Array<{ date: string; hits: Count; clicks: Count }>>`
      SELECT date, SUM(hits)::bigint AS hits, SUM(clicks)::bigint AS clicks FROM (
        SELECT to_char("createdAt", 'YYYY-MM-DD') AS date, COUNT(*) AS hits, 0::bigint AS clicks
          FROM "AutomationHit" WHERE "automationId" = ${automationId}::uuid AND "createdAt" >= ${start} AND "createdAt" < ${end} GROUP BY 1
        UNION ALL
        SELECT to_char(c."createdAt", 'YYYY-MM-DD') AS date, 0::bigint AS hits, COUNT(*) AS clicks
          FROM "AutomationClick" c WHERE c."automationId" = ${automationId}::uuid AND c."createdAt" >= ${start} AND c."createdAt" < ${end}
          AND EXISTS (SELECT 1 FROM "AutomationHit" h WHERE h."automationId" = c."automationId" AND h."recipientIgId" = c."recipientIgId") GROUP BY 1
      ) daily GROUP BY date ORDER BY date`,
    client.$queryRaw<Array<{ country: string | null; clicks: Count }>>`
      SELECT c.country, COUNT(*) AS clicks FROM "AutomationClick" c WHERE c."automationId" = ${automationId}::uuid
        AND EXISTS (SELECT 1 FROM "AutomationHit" h WHERE h."automationId" = c."automationId" AND h."recipientIgId" = c."recipientIgId")
        GROUP BY c.country ORDER BY clicks DESC, c.country ASC NULLS LAST LIMIT 10`,
    client.automationHit.findMany({ where: { automationId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: ANALYTICS_RECENT_LIMIT, select: { id: true, recipientIgId: true, source: true, createdAt: true } }),
    client.$queryRaw<ActivityRow[]>`
      SELECT c.id, c."recipientIgId", c.country, c."createdAt" FROM "AutomationClick" c WHERE c."automationId" = ${automationId}::uuid
        AND EXISTS (SELECT 1 FROM "AutomationHit" h WHERE h."automationId" = c."automationId" AND h."recipientIgId" = c."recipientIgId")
        ORDER BY c."createdAt" DESC, c.id DESC LIMIT ${ANALYTICS_RECENT_LIMIT}`,
    client.automationFollowerState.findMany({ where: { automationId, integrationId, firstFollowing: false, followedAt: { not: null } }, orderBy: [{ followedAt: "desc" }, { id: "desc" }], take: ANALYTICS_RECENT_LIMIT, select: { id: true, recipientIgId: true, followedAt: true } }),
    client.$queryRaw<Array<{ destination: string; recipients: Count; clicks: Count }>>`
      SELECT c.destination, COUNT(*) AS recipients, COUNT(c."firstClickedAt") AS clicks
      FROM "AutomationTrackedLink" c WHERE c."automationId" = ${automationId}::uuid
      AND EXISTS (SELECT 1 FROM "AutomationHit" h WHERE h."automationId" = c."automationId" AND h."recipientIgId" = c."recipientIgId")
      GROUP BY c.destination ORDER BY clicks DESC, recipients DESC, c.destination ASC LIMIT 25`,
  ]);
  const recipients = Array.from(new Set([...hits, ...clicks, ...follows].map(row => row.recipientIgId)));
  const [contacts, conversations] = recipients.length ? await Promise.all([
    client.lead.findMany({
      where: { igUserId: { in: recipients }, igUsername: { not: null }, automation: { integrationId, User: { clerkId } } },
      distinct: ["igUserId"], orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { igUserId: true, igUsername: true },
    }),
    client.conversation.findMany({
      where: { integrationId, user: { clerkId }, recipientIgId: { in: recipients }, recipientUsername: { not: null } },
      select: { recipientIgId: true, recipientUsername: true },
    }),
  ]) : [[], []];
  const usernames = new Map(contacts.map(contact => [contact.igUserId, contact.igUsername]));
  for (const conversation of conversations) usernames.set(conversation.recipientIgId, conversation.recipientUsername);
  const activity = ({ recipientIgId, createdAt, ...row }: ActivityRow): AutomationActivity => {
    const username = usernames.get(recipientIgId)?.trim().replace(/^@+/, "");
    return { ...row, recipient: username ? `@${username}` : "Instagram user", createdAt: createdAt.toISOString() };
  };
  const raw = totalsRows[0];
  const totals = { hits: Number(raw.hits), uniqueHitRecipients: Number(raw.uniqueHitRecipients), clicks: Number(raw.clicks), eligibleNonFollowers: Number(raw.eligibleNonFollowers), newFollowers: Number(raw.newFollowers) };
  const dayMap = new Map(dailyRows.map(day => [day.date, day]));
  const { posts, listener, ...summary } = automation;
  return {
    automation: { ...summary, createdAt: summary.createdAt.toISOString(), postThumbnail: posts[0]?.media || null, responseCount: listener?.dmCount ?? 0, messageType: listener?.responseFormat === "PRODUCT_CARD" ? "Product Card" : listener?.ctaLink || listener?.responseFormat === "LINK" ? "Button Text" : "Text" },
    totals: { ...totals, clickRate: percent(totals.clicks, totals.uniqueHitRecipients), followRate: percent(totals.newFollowers, totals.eligibleNonFollowers) },
    daily: Array.from({ length: 7 }, (_, index) => { const date = new Date(start.getTime() + index * DAY).toISOString().slice(0, 10); const day = dayMap.get(date); return { date, hits: Number(day?.hits ?? 0), clicks: Number(day?.clicks ?? 0) }; }),
    countries: countries.map(row => ({ country: row.country, clicks: Number(row.clicks) })),
    recent: { hits: hits.map(activity), clicks: clicks.map(activity), follows: follows.map(row => activity({ id: row.id, recipientIgId: row.recipientIgId, createdAt: row.followedAt! })) },
    links: links.map(row => ({ destination: row.destination, recipients: Number(row.recipients), clicks: Number(row.clicks) })),
    trackingStartedAt: raw.trackingStartedAt?.toISOString() ?? null,
  };
}
