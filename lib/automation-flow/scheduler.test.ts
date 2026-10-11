import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ automationFlowSession: { updateMany: vi.fn(), findMany: vi.fn() } }));
const run = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ client: db }));
vi.mock("./runtime", () => ({ processAutomationFlow: run }));
import { processScheduledAutomationFlows } from "./scheduler";
const now = new Date("2026-09-27T09:00:00Z");
const job = { id: "s1", integrationId: "i1", recipientIgId: "r1", resumeAt: new Date(now.getTime() - 1000) };
beforeEach(() => {
  vi.resetAllMocks();
  db.automationFlowSession.updateMany.mockResolvedValue({ count: 1 });
  db.automationFlowSession.findMany.mockResolvedValue([job]);
  run.mockResolvedValue(true);
});
describe("durable flow scheduler", () => {
  it("resumes only due unexpired sessions and uses a stable deduplication key", async () => {
    expect(await processScheduledAutomationFlows(now)).toEqual({ flowProcessed: 1, flowFailed: 0 });
    expect(db.automationFlowSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "SCHEDULED", resumeAt: { lte: now }, expiresAt: { gt: now } } }));
    expect(run).toHaveBeenCalledWith({ integrationId: "i1", recipientIgId: "r1", text: "", eventId: `delay:s1:${job.resumeAt.toISOString()}`, scheduled: { sessionId: "s1", resumeAt: job.resumeAt } });
  });
  it("cancels expired state and never retries uncertain crashed sends", async () => {
    await processScheduledAutomationFlows(now);
    expect(db.automationFlowSession.updateMany.mock.calls[0][0].data.status).toBe("CANCELLED");
    expect(db.automationFlowSession.updateMany.mock.calls[1][0]).toMatchObject({ where: { status: { startsWith: "PROCESSING:" } }, data: { status: "FAILED" } });
  });
  it("isolates failed contacts so later jobs can still run", async () => {
    db.automationFlowSession.findMany.mockResolvedValue([job, { ...job, id: "s2" }]);
    run.mockRejectedValueOnce(new Error("temporary lookup failure"));
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await processScheduledAutomationFlows(now)).toEqual({ flowProcessed: 1, flowFailed: 1 });
    expect(run).toHaveBeenCalledTimes(2);
    warning.mockRestore();
  });
  it("honors its bounded execution budget", async () => {
    expect(await processScheduledAutomationFlows(now, 0)).toEqual({ flowProcessed: 0, flowFailed: 0 });
    expect(run).not.toHaveBeenCalled();
  });
});
