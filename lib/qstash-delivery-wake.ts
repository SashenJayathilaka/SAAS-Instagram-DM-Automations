import { QSTASH_SCHEDULER_URL } from "./qstash-scheduler-auth";

const origins = new Set([
  "https://qstash.upstash.io",
  "https://qstash-eu-central-1.upstash.io",
  "https://qstash-us-east-1.upstash.io",
]);

/** Publish a signed, empty wake-up. Recipients and payloads remain in our database.
 * https://upstash.com/docs/qstash/api-reference/messages/publish-a-message
 * The recurring scheduler remains a fallback if publishing is unavailable.
 */
export async function scheduleDeliveryWake(job: { id: string; dueAt: Date }) {
  if (process.env.VERCEL_ENV !== "production") return false;
  const token = process.env.QSTASH_TOKEN?.trim();
  const origin = (process.env.QSTASH_URL?.trim() || "https://qstash.upstash.io").replace(/\/$/, "");
  if (!token || !origins.has(origin) || !Number.isFinite(job.dueAt.getTime())) return false;
  try {
    const response = await fetch(`${origin}/v2/publish/${QSTASH_SCHEDULER_URL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
        "Upstash-Method": "POST",
        // Round up so the worker cannot arrive before the persisted deadline.
        "Upstash-Not-Before": String(Math.ceil(job.dueAt.getTime() / 1000)),
        "Upstash-Deduplication-Id": `delivery-${job.id}`,
        "Upstash-Retries": "2",
        "Upstash-Timeout": "60s",
        "Upstash-Label": "ap3k-delivery-delay",
      },
      body: "",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("publish failed");
    const result = await response.json();
    if (typeof result.messageId !== "string" || !result.messageId) throw new Error("invalid publish response");
    return true;
  } catch {
    // Upstream exception text/bodies may contain credentials; never log them.
    console.warn("[automation-delay] timed wake unavailable; periodic scheduler will retry", { jobId: job.id });
    return false;
  }
}
