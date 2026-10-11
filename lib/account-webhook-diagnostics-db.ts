import {
  buildCampaignBindingDiagnostics,
  classifyAccountWebhookDelivery,
  compareIntegrationDelivery,
  type IntegrationLike,
} from "@/lib/account-webhook-diagnostics";
import { client } from "@/lib/prisma";

export async function getAccountWebhookDiagnosticsForIntegration(integrationId?: string | null) {
  const integration = integrationId
    ? await client.integrations.findUnique({
        where: { id: integrationId },
        include: {
          User: { select: { id: true, email: true } },
          snapshots: { orderBy: { fetchedAt: "desc" }, take: 1 },
        },
      })
    : await client.integrations.findFirst({
        where: { name: "INSTAGRAM", status: { not: "DISCONNECTED" } },
        orderBy: { createdAt: "desc" },
        include: {
          User: { select: { id: true, email: true } },
          snapshots: { orderBy: { fetchedAt: "desc" }, take: 1 },
        },
      });

  if (!integration) return null;

  const accountIds = [
    integration.instagramId,
    integration.webhookAccountId,
    integration.pageId,
  ].filter((value): value is string => Boolean(value));

  const [events, campaigns] = await Promise.all([
    client.webhookEvent.findMany({
      where: accountIds.length
        ? {
            OR: [
              { igAccountId: { in: accountIds } },
              { automation: { userId: integration.userId, integrationId: integration.id } },
            ],
          }
        : { automation: { userId: integration.userId, integrationId: integration.id } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    client.automation.findMany({
      where: { userId: integration.userId ?? undefined, integrationId: integration.id, archivedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        posts: { select: { postid: true } },
        User: {
          select: {
            integrations: {
              where: { name: "INSTAGRAM" },
              select: {
                id: true,
                userId: true,
                instagramId: true,
                instagramUsername: true,
                webhookAccountId: true,
                pageId: true,
                businessId: true,
                status: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const delivery = classifyAccountWebhookDelivery({
    integration,
    events,
  });
  const campaignDiagnostics = buildCampaignBindingDiagnostics({
    integration,
    campaigns,
  });

  return {
    integration: {
      id: integration.id,
      userId: integration.userId,
      ownerEmail: integration.User?.email ?? null,
      instagramId: integration.instagramId,
      instagramUsername: integration.instagramUsername,
      webhookAccountId: integration.webhookAccountId,
      pageId: integration.pageId,
      pageName: integration.pageName,
      businessId: integration.businessId,
      tokenPresent: Boolean(integration.token),
      expiresAt: integration.expiresAt,
      createdAt: integration.createdAt,
      webhookSubscriptionLastAttemptedAt: integration.webhookSubscriptionLastAttemptedAt,
      status: integration.status,
    },
    profileSnapshot: integration.snapshots[0] ?? null,
    delivery,
    lastCampaignMedia: campaigns[0]?.posts?.[0]?.postid
      ? {
          postid: campaigns[0].posts[0].postid,
          automationId: campaigns[0].id,
          automationName: campaigns[0].name,
          createdAt: campaigns[0].createdAt,
        }
      : null,
    activeCampaignCount: campaigns.filter((campaign) => campaign.active).length,
    campaignDiagnostics,
  };
}

export async function getIntegrationComparisonDiagnostics(failingUsername = "boudofi") {
  const integrations = await client.integrations.findMany({
    where: { name: "INSTAGRAM", status: { not: "DISCONNECTED" } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const failing = integrations.find((item) => item.instagramUsername?.toLowerCase() === failingUsername.toLowerCase());
  const working = integrations.find((item) => item.id !== failing?.id);
  if (!failing || !working) return null;

  const [failingEvents, workingEvents, failingCampaigns, workingCampaigns] = await Promise.all([
    eventsForIntegration(failing),
    eventsForIntegration(working),
    campaignsForIntegration(failing),
    campaignsForIntegration(working),
  ]);

  return compareIntegrationDelivery({
    working: { integration: working, events: workingEvents, campaigns: workingCampaigns },
    failing: { integration: failing, events: failingEvents, campaigns: failingCampaigns },
  });
}

async function eventsForIntegration(integration: IntegrationLike) {
  const ids = [
    integration.instagramId,
    integration.webhookAccountId,
    integration.pageId,
  ].filter((value): value is string => Boolean(value));
  return client.webhookEvent.findMany({
    where: ids.length ? { igAccountId: { in: ids } } : { automation: { userId: integration.userId, integrationId: integration.id } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

async function campaignsForIntegration(integration: IntegrationLike) {
  return client.automation.findMany({
    where: { userId: integration.userId ?? undefined, integrationId: integration.id, archivedAt: null },
    include: { posts: { select: { postid: true } } },
  });
}
