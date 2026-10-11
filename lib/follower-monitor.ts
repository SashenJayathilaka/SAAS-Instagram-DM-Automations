import { client } from "./prisma";
import { getInstagramRecipientProfile } from "./instagram-dm";
import { observeAutomationFollow, FOLLOW_ATTRIBUTION_DAYS } from "./automation-tracking";
import { resolveIntegrationSendToken } from "./send-token";

/** Read-only profile checks for consented contacts, never a follower scraper or DM sender. */
export async function refreshPendingFollowers(now = new Date()) {
  const before = new Date(now.getTime() - 30 * 60_000);
  const pending = await client.automationFollowerState.findMany({
    where: {
      firstFollowing: false, followedAt: null, automationId: { not: null },
      lastNotFollowingAt: { gte: new Date(now.getTime() - FOLLOW_ATTRIBUTION_DAYS * 86_400_000), lte: now },
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: before } }],
      integration: { status: "CONNECTED", reconnectRequired: false, planLocked: false, User: { status: { not: "SUSPENDED" } } },
      automation: { archivedAt: null },
    },
    orderBy: [{ lastCheckedAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
    take: 20,
    select: { id: true, integrationId: true, automationId: true, recipientIgId: true, integration: { select: { token: true, igAccountSource: true, oauthResolutionDiagnostics: true } } },
  });
  let followersChecked = 0;
  // Four concurrent requests, at most 20 contacts per scheduler invocation.
  for (let offset = 0; offset < pending.length; offset += 4) {
    await Promise.all(pending.slice(offset, offset + 4).map(async row => {
      const claimed = await client.automationFollowerState.updateMany({ where: { id: row.id, followedAt: null, OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: before } }] }, data: { lastCheckedAt: now } });
      if (!claimed.count) return;
      const token = resolveIntegrationSendToken(row.integration);
      if (!token.ok || !row.automationId) return;
      const profile = await getInstagramRecipientProfile({ token: token.token, recipientId: row.recipientIgId });
      followersChecked++;
      // Do not extend the attribution window by repeatedly observing false.
      if (profile?.followsBusiness === true) await observeAutomationFollow({ integrationId: row.integrationId, automationId: row.automationId, recipientIgId: row.recipientIgId, followsBusiness: true }, now);
    }));
  }
  return { followersChecked };
}
