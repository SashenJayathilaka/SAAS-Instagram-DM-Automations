import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ qstash: vi.fn(), legacy: vi.fn(), followUps: vi.fn(), flows: vi.fn(), delayed: vi.fn(), stories: vi.fn(), followers: vi.fn() }));
vi.mock("@/lib/qstash-scheduler-auth", () => ({ authorizeQStashScheduler: mocks.qstash }));
vi.mock("@/lib/automation-scheduler-auth", () => ({ authorizeAutomationScheduler: mocks.legacy }));
vi.mock("@/lib/automation-engagement", () => ({ processAutomationFollowUps: mocks.followUps }));
vi.mock("@/lib/automation-flow/scheduler", () => ({ processScheduledAutomationFlows: mocks.flows }));
vi.mock("@/lib/automation-delivery", () => ({ processAutomationDeliveries: mocks.delayed }));
vi.mock("@/lib/story-automation-runtime",()=>({bindPendingNextStories:mocks.stories}));
vi.mock("@/lib/follower-monitor",()=>({refreshPendingFollowers:mocks.followers}));
import { GET, POST } from "./route";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.followUps.mockResolvedValue({ checked: 0, sent: 0 });
  mocks.flows.mockResolvedValue({ flowProcessed: 0, flowFailed: 0 });
  mocks.followers.mockResolvedValue({followersChecked:0});
  mocks.stories.mockResolvedValue({storiesBound:0});
  mocks.delayed.mockResolvedValue({ delayedProcessed: 0 });
});
describe("automation scheduler transport", () => {
  it("does no queue work for unsigned POST requests", async () => {
    mocks.qstash.mockResolvedValue(false);
    const response = await POST(new Request("https://ap3k.com/api/cron/automation-follow-ups", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(mocks.followUps).not.toHaveBeenCalled(); expect(mocks.flows).not.toHaveBeenCalled(); expect(mocks.delayed).not.toHaveBeenCalled();
    expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it("processes all existing queues after successful QStash verification", async () => {
    mocks.qstash.mockResolvedValue(true);
    const response = await POST(new Request("https://ap3k.com/api/cron/automation-follow-ups", { method: "POST" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, checked: 0, sent: 0, flowProcessed: 0, flowFailed: 0, delayedProcessed: 0, storiesBound:0, followersChecked:0 });
    for (const worker of [mocks.followUps, mocks.flows, mocks.delayed,mocks.stories,mocks.followers]) expect(worker).toHaveBeenCalledWith();
  });
  it("preserves the authenticated GET fallback", async () => {
    const request = new Request("https://ap3k.com/api/cron/automation-follow-ups");
    mocks.legacy.mockResolvedValue(false); expect((await GET(request)).status).toBe(401);
    mocks.legacy.mockResolvedValue(true); expect((await GET(request)).status).toBe(200);
    expect(mocks.qstash).not.toHaveBeenCalled();
  });
  it("returns a retryable error without exposing worker details", async () => {
    mocks.qstash.mockResolvedValue(true);
    mocks.delayed.mockRejectedValue(new Error("private connection information"));
    const response = await POST(new Request("https://ap3k.com/api/cron/automation-follow-ups", { method: "POST" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Follow-up queue unavailable" });
  });
});
