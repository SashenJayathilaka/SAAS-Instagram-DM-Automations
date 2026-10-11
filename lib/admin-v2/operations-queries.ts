// Read-only operational queries for the canonical AP3K admin dashboard.
// SECURITY: never select Integrations.token or any secret-bearing field here.
import { client } from "@/lib/prisma";

const BILLING_LIMIT = 100;

export type AdminV2BillingRow = {
  id: string;
  userId: string | null;
  email: string | null;
  userStatus: string | null;
  plan: string;
  customerId: string | null;
  updatedAt: Date;
  hasOverrides: boolean;
  overrideReason: string | null;
  overrideExpiresAt: Date | null;
};

export async function getAdminV2BillingOverview() {
  const [total, pro, business, free, stripeLinked, subscriptions] = await Promise.all([
    client.subscription.count(),
    client.subscription.count({ where: { plan: "PRO" } }),
    client.subscription.count({ where: { plan: "BUSINESS" } }),
    client.subscription.count({ where: { plan: "FREE" } }),
    client.subscription.count({ where: { customerId: { not: null } } }),
    client.subscription.findMany({
      take: BILLING_LIMIT,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        plan: true,
        customerId: true,
        updatedAt: true,
        monthlyReplyLimitOverride: true,
        activeCampaignLimitOverride: true,
        connectedAccountLimitOverride: true,
        aiReplyLimitOverride: true,
        overrideReason: true,
        overrideExpiresAt: true,
        User: { select: { id: true, email: true, status: true } },
      },
    }),
  ]);

  const rows: AdminV2BillingRow[] = subscriptions.map((subscription) => ({
    id: subscription.id,
    userId: subscription.User?.id ?? null,
    email: subscription.User?.email ?? null,
    userStatus: subscription.User?.status ?? null,
    plan: subscription.plan,
    customerId: subscription.customerId,
    updatedAt: subscription.updatedAt,
    hasOverrides: [
      subscription.monthlyReplyLimitOverride,
      subscription.activeCampaignLimitOverride,
      subscription.connectedAccountLimitOverride,
      subscription.aiReplyLimitOverride,
    ].some((value) => value !== null),
    overrideReason: subscription.overrideReason,
    overrideExpiresAt: subscription.overrideExpiresAt,
  }));

  return { stats: { total, pro, business, free, stripeLinked }, rows };
}

export async function getAdminV2SystemSnapshot() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [realMetaEvents24h, signatureFailures24h, failedMessages24h, loopGuardEvents24h, reconnectRequired, adminActions24h, lastRealWebhook] = await Promise.all([
    client.webhookEvent.count({ where: { eventSource: "META_REAL", createdAt: { gte: since } } }),
    client.webhookEvent.count({ where: { eventType: "SIGNATURE_FAILED", createdAt: { gte: since } } }),
    client.messageLog.count({ where: { status: "FAILED", createdAt: { gte: since } } }),
    client.automationEvent.count({ where: { eventType: { in: ["LOOP_GUARD_TRIGGERED", "LOOP_GUARD_PAUSED_CAMPAIGN"] }, createdAt: { gte: since } } }),
    client.integrations.count({ where: { OR: [{ reconnectRequired: true }, { status: "DISCONNECTED" }, { expiresAt: { lt: new Date() } }] } }),
    client.adminAuditLog.count({ where: { createdAt: { gte: since } } }),
    client.webhookEvent.findFirst({ where: { eventSource: "META_REAL" }, orderBy: { createdAt: "desc" }, select: { createdAt: true, eventType: true, status: true } }),
  ]);

  return { realMetaEvents24h, signatureFailures24h, failedMessages24h, loopGuardEvents24h, reconnectRequired, adminActions24h, lastRealWebhook };
}
