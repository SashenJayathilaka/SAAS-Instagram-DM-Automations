import { client } from "@/lib/prisma";
import { processAutomationFlow } from "./runtime";

/** Due dates are minimum waits; delivery is bounded by the scheduler cadence. */
export async function processScheduledAutomationFlows(now = new Date(), budgetMs = 40_000) {
  const started = Date.now();
  await client.automationFlowSession.updateMany({
    where: { status: { in: ["SCHEDULED", "WAITING"] }, expiresAt: { lte: now } },
    data: { status: "CANCELLED", resumeAt: null },
  });
  // A crashed worker may already have delivered; never automatically replay it.
  await client.automationFlowSession.updateMany({
    where: { status: { startsWith: "PROCESSING:" }, updatedAt: { lt: new Date(now.getTime() - 10 * 60_000) } },
    data: { status: "FAILED", resumeAt: null },
  });
  const sessions = await client.automationFlowSession.findMany({
    where: { status: "SCHEDULED", resumeAt: { lte: now }, expiresAt: { gt: now } },
    orderBy: { resumeAt: "asc" }, take: 30,
    select: { id: true, integrationId: true, recipientIgId: true, resumeAt: true },
  });
  let processed = 0;
  let failed = 0;
  for (const session of sessions) {
    if (Date.now() - started >= budgetMs) break;
    if (!session.resumeAt) continue;
    try {
      await processAutomationFlow({
        integrationId: session.integrationId, recipientIgId: session.recipientIgId,
        text: "", eventId: `delay:${session.id}:${session.resumeAt.toISOString()}`,
        scheduled: { sessionId: session.id, resumeAt: session.resumeAt },
      });
      processed++;
    } catch {
      failed++;
      // Individual failures cannot starve other contacts in the queue.
      console.warn("[automation-flow] scheduled turn failed", { sessionId: session.id });
    }
  }
  return { flowProcessed: processed, flowFailed: failed };
}
