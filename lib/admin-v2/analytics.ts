import "server-only";
import { client } from "@/lib/prisma";
import { requireOwnerAdmin } from "@/lib/admin";

export type DailyMetric = {
  date: string;
  signups: number;
  sent: number;
  failed: number;
  leads: number;
};
export async function getAdminAnalytics(days: 7 | 30 = 30) {
  await requireOwnerAdmin();
  if (days !== 7 && days !== 30)
    throw new Error("Unsupported reporting period.");
  const end = new Date();
  const start = new Date(end);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const [events, users, leads, plans] = await Promise.all([
    client.$queryRaw<
      { day: Date; status: string; count: bigint }[]
    >`SELECT date_trunc('day', "createdAt") AS day, status, count(*) AS count FROM "MessageLog" WHERE "createdAt" >= ${start} AND "createdAt" <= ${end} GROUP BY 1,2 ORDER BY 1`,
    client.$queryRaw<
      { day: Date; count: bigint }[]
    >`SELECT date_trunc('day', "createdAt") AS day, count(*) AS count FROM "User" WHERE "createdAt" >= ${start} AND "createdAt" <= ${end} GROUP BY 1 ORDER BY 1`,
    client.$queryRaw<
      { day: Date; count: bigint }[]
    >`SELECT date_trunc('day', "createdAt") AS day, count(*) AS count FROM "Lead" WHERE "createdAt" >= ${start} AND "createdAt" <= ${end} GROUP BY 1 ORDER BY 1`,
    client.subscription.groupBy({ by: ["plan"], _count: { _all: true } }),
  ]);
  const series: DailyMetric[] = Array.from({ length: days }, (_, i) => ({
    date: new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10),
    signups: 0,
    sent: 0,
    failed: 0,
    leads: 0,
  }));
  const byDay = new Map(series.map((d) => [d.date, d]));
  events.forEach((r) => {
    const d = byDay.get(r.day.toISOString().slice(0, 10));
    if (d && r.status === "SENT") d.sent += Number(r.count);
    if (d && r.status === "FAILED") d.failed += Number(r.count);
  });
  users.forEach((r) => {
    const d = byDay.get(r.day.toISOString().slice(0, 10));
    if (d) d.signups = Number(r.count);
  });
  leads.forEach((r) => {
    const d = byDay.get(r.day.toISOString().slice(0, 10));
    if (d) d.leads = Number(r.count);
  });
  const totals = series.reduce(
    (a, d) => ({
      signups: a.signups + d.signups,
      sent: a.sent + d.sent,
      failed: a.failed + d.failed,
      leads: a.leads + d.leads,
    }),
    { signups: 0, sent: 0, failed: 0, leads: 0 },
  );
  return {
    days,
    series,
    totals,
    plans: plans.map((p) => ({ plan: p.plan, count: p._count._all })),
    updatedAt: end.toISOString(),
  };
}
