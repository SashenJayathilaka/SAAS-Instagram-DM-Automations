import { NextResponse } from "next/server";
import { processMarketingQueue } from "@/lib/marketing/delivery";
import { authorizeMarketingScheduler } from "@/lib/marketing/scheduler-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!await authorizeMarketingScheduler(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await processMarketingQueue()); }
  catch { return NextResponse.json({ error: "Marketing queue unavailable" }, { status: 503 }); }
}
