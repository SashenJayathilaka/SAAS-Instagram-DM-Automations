import "server-only";
import { client } from "@/lib/prisma";
import { requireOwnerAdmin } from "@/lib/admin";

/** Read-only cohort counters from operational records, not browser analytics. */
export async function getLaunchMetrics(now = new Date()) {
  await requireOwnerAdmin();
  const since = new Date(now.getTime() - 30 * 86400000);
  const lastWeek = new Date(now.getTime() - 7 * 86400000);
  const cohort = { createdAt: { gte: since, lte: now } };
  const sent = { messageLogs: { some: { status: "SENT" as const } } };
  const [signups, connected, firstSend, usedThisWeek] = await Promise.all([
    client.user.count({ where: cohort }),
    client.user.count({ where: { ...cohort, integrations: { some: { status: "CONNECTED" } } } }),
    client.user.count({ where: { ...cohort, automations: { some: sent } } }),
    client.user.count({ where: { ...cohort, automations: { some: {
      messageLogs: { some: { status: "SENT", createdAt: { gte: lastWeek, lte: now } } },
    } } } }),
  ]);
  return { signups, connected, firstSend, usedThisWeek };
}
