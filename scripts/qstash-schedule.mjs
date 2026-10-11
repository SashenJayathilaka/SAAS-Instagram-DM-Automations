export const SCHEDULER_DESTINATION = "https://ap3k.com/api/cron/automation-follow-ups";
export const SCHEDULER_ID = "ap3k-automation-follow-ups";

const origins = new Set([
  "https://qstash.upstash.io",
  "https://qstash-eu-central-1.upstash.io",
  "https://qstash-us-east-1.upstash.io",
]);

/**
 * Uses Vercel's linked QStash credentials only after a successful production build.
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetcher
 */
export async function ensureQStashSchedule(env = process.env, fetcher = fetch) {
  if (env.VERCEL_ENV !== "production") return "skipped outside production";
  const names = ["QSTASH_TOKEN", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY"];
  const values = names.map((name) => env[name]?.trim());
  if (values.every((value) => !value)) return "skipped: QStash integration is not configured";
  const missing = names.filter((_, index) => !values[index]);
  if (missing.length) throw new Error(`QStash setup missing: ${missing.join(", ")}`);
  const [token, currentKey, nextKey] = values;
  const origin = (env.QSTASH_URL?.trim() || "https://qstash.upstash.io").replace(/\/$/, "");
  // Never send the integration token to arbitrary hosts or follow API redirects.
  if (!origins.has(origin)) throw new Error("QStash setup: unsupported API origin");

  async function request(path, options = {}) {
    try {
      const response = await fetcher(`${origin}${path}`, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${token}` },
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error();
      return await response.json();
    } catch {
      // Upstream bodies and exception messages can contain credentials. Do not log them.
      throw new Error(`QStash setup: ${options.method || "GET"} API request failed`);
    }
  }

  const keys = await request("/v2/keys");
  if (keys?.current !== currentKey || keys?.next !== nextKey) {
    throw new Error("QStash setup: signing keys do not match the selected region");
  }
  const schedules = await request("/v2/schedules");
  if (!Array.isArray(schedules)) throw new Error("QStash setup: invalid schedules response");
  const sameId = schedules.find((schedule) => schedule.scheduleId === SCHEDULER_ID);
  if (sameId && sameId.destination !== SCHEDULER_DESTINATION) {
    throw new Error("QStash setup: schedule ID belongs to another destination");
  }
  const existing = schedules.filter((schedule) => schedule.destination === SCHEDULER_DESTINATION);
  if (existing.length) {
    // Respect operator edits and pauses; deployment must not reactivate a paused scheduler.
    return existing.some((schedule) => !schedule.isPaused)
      ? "existing schedule preserved"
      : "existing paused schedule preserved";
  }
  const created = await request(`/v2/schedules/${SCHEDULER_DESTINATION}`, {
    method: "POST",
    headers: {
      "Upstash-Schedule-Id": SCHEDULER_ID,
      "Upstash-Cron": "*/5 * * * *",
      "Upstash-Method": "POST",
      "Upstash-Retries": "1",
      "Upstash-Timeout": "60s",
    },
    body: "",
  });
  if (created?.scheduleId !== SCHEDULER_ID) throw new Error("QStash setup: unexpected schedule response");
  return "created five-minute production schedule";
}
