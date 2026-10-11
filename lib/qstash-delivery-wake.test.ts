import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { scheduleDeliveryWake } from "./qstash-delivery-wake";
import { QSTASH_SCHEDULER_URL } from "./qstash-scheduler-auth";
const fetcher = vi.fn();
const job = { id: "job-1", dueAt: new Date("2026-10-01T12:00:30.501Z") };
beforeEach(() => {
  vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("QSTASH_TOKEN", "test-token"); vi.stubEnv("QSTASH_URL", "https://qstash-eu-central-1.upstash.io/");
  vi.stubGlobal("fetch", fetcher); fetcher.mockReset();
  fetcher.mockResolvedValue(Response.json({ messageId: "published-id" }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("schedules an authenticated empty POST at or after the exact saved deadline", async () => {
  expect(await scheduleDeliveryWake(job)).toBe(true);
  expect(fetcher).toHaveBeenCalledWith(`https://qstash-eu-central-1.upstash.io/v2/publish/${QSTASH_SCHEDULER_URL}`, expect.objectContaining({
    method: "POST", body: "", redirect: "error", signal: expect.any(AbortSignal),
    headers: expect.objectContaining({ Authorization: "Bearer test-token", "Upstash-Not-Before": String(Math.ceil(job.dueAt.getTime()/1000)), "Upstash-Deduplication-Id": "delivery-job-1" }),
  }));
});
it("accepts provider-deduplicated messages", async () => {
  fetcher.mockResolvedValue(Response.json({ messageId: "published-id", deduplicated: true }, { status: 202 }));
  expect(await scheduleDeliveryWake(job)).toBe(true);
});
it("never schedules production work from preview deployments or sends tokens to arbitrary origins", async () => {
  vi.stubEnv("VERCEL_ENV", "preview"); expect(await scheduleDeliveryWake(job)).toBe(false);
  vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("QSTASH_URL", "https://attacker.example");
  expect(await scheduleDeliveryWake(job)).toBe(false); expect(fetcher).not.toHaveBeenCalled();
});
it("keeps the durable cron fallback on quota/network failure without logging credentials", async () => {
  const log=vi.spyOn(console,"warn").mockImplementation(()=>{});
  fetcher.mockResolvedValue(new Response("test-token", { status: 429 }));
  expect(await scheduleDeliveryWake(job)).toBe(false);
  fetcher.mockRejectedValue(new Error("test-token")); expect(await scheduleDeliveryWake(job)).toBe(false);
  expect(JSON.stringify(log.mock.calls)).not.toContain("test-token");
});
