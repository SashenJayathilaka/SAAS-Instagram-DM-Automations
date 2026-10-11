import { afterEach, describe, expect, it, vi } from "vitest";
const { processQueue, enqueueOwnerAlert } = vi.hoisted(() => ({
  processQueue: vi.fn(async () => ({ attempted: 1, sent: 1 })),
  enqueueOwnerAlert: vi.fn(async () => null),
}));
vi.mock("@/lib/email/owner-alerts", () => ({
  processOwnerAlertQueue: processQueue,
  enqueueOwnerAlert,
}));
import { GET } from "./route";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("owner alert worker authorization", () => {
  it("fails closed without a configured secret, even with a forged cron header", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await GET(new Request("https://ap3k.com/api/cron/owner-alerts", { headers: { "x-vercel-cron-schedule": "*/10 * * * *" } }));
    expect(response.status).toBe(401); expect(processQueue).not.toHaveBeenCalled();
  });
  it("rejects the wrong secret", async () => {
    vi.stubEnv("CRON_SECRET", "correct");
    expect((await GET(new Request("https://ap3k.com/api/cron/owner-alerts", { headers: { authorization: "Bearer wrong" } }))).status).toBe(401);
    expect(processQueue).not.toHaveBeenCalled();
  });
  it("processes saved alerts for an authenticated cron request", async () => {
    vi.stubEnv("CRON_SECRET", "correct");
    expect((await GET(new Request("https://ap3k.com/api/cron/owner-alerts", { headers: { authorization: "Bearer correct" } }))).status).toBe(200);
    expect(processQueue).toHaveBeenCalledOnce();
  });
});
