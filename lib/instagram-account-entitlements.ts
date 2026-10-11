import type { Prisma } from "@prisma/client";
import { getPlanLimits, isUnlimited, type ProductPlan } from "@/lib/plan-limits";

export async function syncInstagramAccountEntitlements(tx: Prisma.TransactionClient, userId: string, plan: ProductPlan) {
  await tx.integrations.updateMany({ where: { userId, name: "INSTAGRAM", status: "DISCONNECTED" }, data: { planLocked: false } });
  const accounts = await tx.integrations.findMany({
    where: { userId, name: "INSTAGRAM", status: { not: "DISCONNECTED" } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  const limit = getPlanLimits(plan).connectedInstagramAccounts;
  const allowed = accounts.slice(0, isUnlimited(limit) ? accounts.length : limit).map(({ id }) => id);
  await tx.integrations.updateMany({ where: { userId, name: "INSTAGRAM", status: { not: "DISCONNECTED" } }, data: { planLocked: true } });
  await tx.integrations.updateMany({ where: { userId, id: { in: allowed } }, data: { planLocked: false } });
}
