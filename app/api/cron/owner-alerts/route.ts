import { client } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { enqueueOwnerAlert, processOwnerAlertQueue } from "@/lib/email/owner-alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Retain one extra day beyond the rolling cap. This is ephemeral send state.
  await client.publicReplySlot.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 8 * 86400000) } } }).catch(() => undefined);

  // Persist one owner alert per scheduler outage rather than relying on short-lived platform logs.
  const heartbeat = await client.automationSchedulerHeartbeat.findUnique({
    where: { id: "follow-ups" },
    select: { lastRunAt: true },
  }).catch(() => null);
  const staleForMs = heartbeat ? Date.now() - heartbeat.lastRunAt.getTime() : Number.POSITIVE_INFINITY;
  if (staleForMs > 20 * 60_000) {
    const reference = heartbeat?.lastRunAt.toISOString() ?? "missing";
    await enqueueOwnerAlert({
      kind: "system",
      key: `follow-up-scheduler:${reference}`,
      occurredAt: new Date().toISOString(),
      reference,
      detail: heartbeat
        ? `The automation follow-up scheduler has not reported a heartbeat for ${Math.round(staleForMs / 60_000)} minutes.`
        : "The automation follow-up scheduler has no recorded heartbeat.",
    }).catch(() => undefined);
  }

  try { return NextResponse.json({ ok: true, ...await processOwnerAlertQueue() }); }
  catch { return NextResponse.json({ error: "Owner alert queue unavailable" }, { status: 503 }); }
}
