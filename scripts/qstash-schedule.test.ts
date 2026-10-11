import { describe, expect, it, vi } from "vitest";
import { ensureQStashSchedule, SCHEDULER_DESTINATION, SCHEDULER_ID } from "./qstash-schedule.mjs";

const env = {
  VERCEL_ENV: "production",
  QSTASH_TOKEN: "test-token",
  QSTASH_CURRENT_SIGNING_KEY: "test-current",
  QSTASH_NEXT_SIGNING_KEY: "test-next",
};
const keys = { current: env.QSTASH_CURRENT_SIGNING_KEY, next: env.QSTASH_NEXT_SIGNING_KEY };
const response = (data: unknown) => ({ ok: true, json: async () => data });
function api(schedules: unknown = []) {
  return vi.fn()
    .mockResolvedValueOnce(response(keys))
    .mockResolvedValueOnce(response(schedules))
    .mockResolvedValueOnce(response({ scheduleId: SCHEDULER_ID }));
}

describe("production QStash schedule setup", () => {
  it("never makes API calls for preview or unconfigured projects", async () => {
    const fetcher = vi.fn();
    expect(await ensureQStashSchedule({ ...env, VERCEL_ENV: "preview" }, fetcher)).toContain("skipped");
    expect(await ensureQStashSchedule({ VERCEL_ENV: "production" }, fetcher)).toContain("not configured");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects partial integration configuration before making requests", async () => {
    const fetcher = vi.fn();
    await expect(ensureQStashSchedule({ ...env, QSTASH_TOKEN: "" }, fetcher)).rejects.toThrow("missing: QSTASH_TOKEN");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["https://attacker.example", "http://qstash.upstash.io", "https://qstash.upstash.io@attacker.example", "https://qstash.upstash.io/other"])("rejects unsafe API origin %s before transmitting credentials", async (QSTASH_URL) => {
    const fetcher = vi.fn();
    await expect(ensureQStashSchedule({ ...env, QSTASH_URL }, fetcher)).rejects.toThrow("unsupported API origin");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["https://qstash.upstash.io", "https://qstash-eu-central-1.upstash.io", "https://qstash-us-east-1.upstash.io"])("creates one bounded five-minute schedule through %s", async (QSTASH_URL) => {
    const fetcher = api();
    expect(await ensureQStashSchedule({ ...env, QSTASH_URL: QSTASH_URL + "/" }, fetcher)).toContain("created");
    expect(fetcher).toHaveBeenNthCalledWith(1, `${QSTASH_URL}/v2/keys`, expect.objectContaining({ redirect: "error", signal: expect.any(AbortSignal) }));
    expect(fetcher).toHaveBeenNthCalledWith(3, `${QSTASH_URL}/v2/schedules/${SCHEDULER_DESTINATION}`, expect.objectContaining({
      method: "POST", body: "", redirect: "error", signal: expect.any(AbortSignal),
      headers: {
        Authorization: "Bearer test-token",
        "Upstash-Schedule-Id": SCHEDULER_ID,
        "Upstash-Cron": "*/5 * * * *",
        "Upstash-Method": "POST",
        "Upstash-Retries": "1",
        "Upstash-Timeout": "60s",
      },
    }));
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("rejects mismatched regional signing keys before creating a schedule", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ ...keys, next: "different-region" }));
    await expect(ensureQStashSchedule(env, fetcher)).rejects.toThrow("signing keys do not match");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("preserves existing schedules including paused=%s", async (isPaused) => {
    const fetcher = api([{ scheduleId: "manually-created", destination: SCHEDULER_DESTINATION, isPaused }]);
    expect(await ensureQStashSchedule(env, fetcher)).toContain(isPaused ? "paused schedule preserved" : "existing schedule preserved");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("never overwrites a schedule ID used for a different destination", async () => {
    const fetcher = api([{ scheduleId: SCHEDULER_ID, destination: "https://another.example" }]);
    await expect(ensureQStashSchedule(env, fetcher)).rejects.toThrow("another destination");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid list responses instead of creating duplicate schedules", async () => {
    const fetcher = api({});
    await expect(ensureQStashSchedule(env, fetcher)).rejects.toThrow("invalid schedules response");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([new Error("SECRET upstream detail"), new DOMException("SECRET", "TimeoutError")])("sanitizes network and timeout failures", async (error) => {
    const fetcher = vi.fn().mockRejectedValue(error);
    await expect(ensureQStashSchedule(env, fetcher)).rejects.toThrow(/^QStash setup: GET API request failed$/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not read failed API response bodies", async () => {
    const json = vi.fn();
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 401, json });
    await expect(ensureQStashSchedule(env, fetcher)).rejects.toThrow("API request failed");
    expect(json).not.toHaveBeenCalled();
  });
});
