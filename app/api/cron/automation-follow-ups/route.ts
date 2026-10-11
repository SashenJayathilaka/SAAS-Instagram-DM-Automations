import { refreshPendingFollowers } from "@/lib/follower-monitor";
import { bindPendingNextStories } from "@/lib/story-automation-runtime";
import { processAutomationDeliveries } from "@/lib/automation-delivery";
import { authorizeAutomationScheduler } from "@/lib/automation-scheduler-auth";
import { authorizeQStashScheduler } from "@/lib/qstash-scheduler-auth";
import { NextResponse } from "next/server";
import { processAutomationFollowUps } from "@/lib/automation-engagement";
import { processScheduledAutomationFlows } from "@/lib/automation-flow/scheduler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!await authorizeAutomationScheduler(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return processQueues();
}
export async function POST(request: Request) {
  if (!await authorizeQStashScheduler(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return processQueues();
}
async function processQueues() {
  try {
    const [followUps, flows, delayed, stories, followers] = await Promise.all([processAutomationFollowUps(), processScheduledAutomationFlows(), processAutomationDeliveries(), bindPendingNextStories().catch(()=>({storyMonitorUnavailable:true})), refreshPendingFollowers().catch(() => ({ followerMonitorUnavailable: true }))]);
    return NextResponse.json({ ok: true, ...followUps, ...flows, ...delayed, ...stories, ...followers });
  }
  catch { return NextResponse.json({ error: "Follow-up queue unavailable" }, { status: 503 }); }
}
