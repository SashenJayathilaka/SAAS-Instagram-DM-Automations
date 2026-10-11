import "server-only";
import type { Prisma } from "@prisma/client";
import { client } from "@/lib/prisma";
import { automationsToPause, PLAN_PAUSE_MESSAGES, PLAN_PAUSE_PREFIX, usesPaidAutomationFeatures } from "@/lib/automation-plan-policy";
import { getPlanLimits, isUnlimited, type ProductPlan } from "@/lib/plan-limits";

export class AutomationPlanError extends Error {}

/** Caller holds the owner's User row lock, shared with publication and billing. */
export async function syncAutomationPlanEntitlements(tx: Prisma.TransactionClient, userId: string, plan: ProductPlan) {
  const active = await tx.automation.findMany({
    where: { userId, active: true, archivedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: { listener: true, integration: { select: { planLocked: true } } },
  });
  const paused = automationsToPause(active, plan);
  if (!paused.length) return;
  const ids = paused.map(row => row.id);
  await tx.automation.updateMany({ where: { userId, id: { in: ids } }, data: { active: false } });
  for (const reason of ["account", "features", "limit"] as const) {
    const group = paused.filter(row => row.reason === reason).map(row => row.id);
    if (group.length) await tx.automation.updateMany({
      // Do not overwrite an existing security/account-repair warning.
      where: { userId, id: { in: group }, needsReview: false },
      data: { reviewReason: PLAN_PAUSE_MESSAGES[reason] },
    });
  }
  await tx.automationDeliveryJob.updateMany({
    where: { automationId: { in: ids }, status: "PENDING" }, data: { status: "CANCELLED", payload: {} },
  });
  await tx.automationEngagementJob.updateMany({
    where: { automationId: { in: ids }, status: { in: ["PENDING", "WAITING"] } }, data: { status: "CANCELLED" },
  });
  await tx.automationFlowSession.updateMany({
    where: { automationId: { in: ids }, status: { in: ["READY", "WAITING", "RUNNING", "SCHEDULED"] } }, data: { status: "CANCELLED", resumeAt: null },
  });
  await tx.aiConversationSession.updateMany({
    where: { automationId: { in: ids }, status: "ACTIVE" }, data: { status: "CANCELLED" },
  });
}

/** Validate persisted settings in the SAME transaction as the write. An outside
 * preflight alone races simultaneous publishes and subscription downgrades. */
export async function assertAutomationPlan(tx: Prisma.TransactionClient, userId: string, automationId: string) {
  const row = await tx.automation.findFirst({
    where: { id: automationId, userId },
    include: { listener: true, integration: true, User: { select: { status: true, subscription: true } } },
  });
  if (!row) throw new AutomationPlanError("Automation not found in your account.");
  if (!row.active) return;
  if (row.archivedAt || row.needsReview || row.User?.status === "SUSPENDED") throw new AutomationPlanError("Review this automation and your account before activating it.");
  if (!row.integration || row.integration.userId !== userId || row.integration.planLocked || row.integration.status !== "CONNECTED" || row.integration.reconnectRequired) throw new AutomationPlanError("Connect or unlock this Instagram account before activating automations.");
  const plan = row.User?.subscription?.plan ?? "FREE";
  if (plan === "FREE" && usesPaidAutomationFeatures(row)) throw new AutomationPlanError("This automation uses paid features. Upgrade to Pro or Business, or remove those features before activating.");
  const limit = getPlanLimits(plan).activeCampaigns;
  if (!isUnlimited(limit)) {
    const count = await tx.automation.count({ where: { userId, active: true, archivedAt: null, OR: [{ integration: { planLocked: false } }, { integrationId: null }] } });
    if (count > limit) throw new AutomationPlanError(`Your plan allows ${limit} active automations. Pause another automation or upgrade.`);
  }
  await tx.automation.updateMany({ where: { id: automationId, userId, reviewReason: { startsWith: PLAN_PAUSE_PREFIX }, needsReview: false }, data: { reviewReason: null } });
}

export async function withAutomationPlanWrite<T>(clerkId: string, write: (tx: Prisma.TransactionClient) => Promise<T>, idOf: (result: T) => string | undefined) {
  return client.$transaction(async tx => {
    const owners = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE "clerkId" = ${clerkId} FOR UPDATE`;
    if (!owners[0]) throw new AutomationPlanError("Your account is unavailable. Reload and try again.");
    const result = await write(tx);
    const id = idOf(result);
    if (id) await assertAutomationPlan(tx, owners[0].id, id);
    return result;
  }, { isolationLevel: "ReadCommitted", timeout: 15000 });
}
