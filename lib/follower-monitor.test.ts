import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn(), claim: vi.fn(), profile: vi.fn(), observe: vi.fn() }));
vi.mock("./prisma", () => ({ client: { automationFollowerState: { findMany: m.find, updateMany: m.claim } } }));
vi.mock("./instagram-dm", () => ({ getInstagramRecipientProfile: m.profile }));
vi.mock("./automation-tracking", () => ({ observeAutomationFollow: m.observe, FOLLOW_ATTRIBUTION_DAYS: 7 }));
import { refreshPendingFollowers } from "./follower-monitor";
const now = new Date("2026-10-11T12:00:00Z");
beforeEach(() => { vi.resetAllMocks(); m.find.mockResolvedValue([{ id: "state", integrationId: "account", automationId: "rule", recipientIgId: "recipient", integration: { token: "a".repeat(30) } }]); m.claim.mockResolvedValue({ count: 1 }); });
describe("bounded follower rechecks", () => {
  it("counts only a confirmed true result and uses the originally attributed automation", async () => {
    m.profile.mockResolvedValue({ followsBusiness: true });
    expect(await refreshPendingFollowers(now)).toEqual({ followersChecked: 1 });
    expect(m.observe).toHaveBeenCalledWith({ integrationId: "account", automationId: "rule", recipientIgId: "recipient", followsBusiness: true }, now);
    expect(m.find.mock.calls[0][0]).toMatchObject({ take: 20, where: { followedAt: null, firstFollowing: false, lastNotFollowingAt: { gte: new Date("2026-10-04T12:00:00Z"), lte: now }, integration: { status: "CONNECTED", reconnectRequired: false, planLocked: false } } });
  });
  it.each([null, {}, { followsBusiness: false }])("does not invent followers or extend attribution for %j", async result => {
    m.profile.mockResolvedValue(result); await refreshPendingFollowers(now); expect(m.observe).not.toHaveBeenCalled();
  });
  it("deduplicates overlapping scheduler invocations before API work", async () => {
    m.claim.mockResolvedValue({ count: 0 }); await refreshPendingFollowers(now); expect(m.profile).not.toHaveBeenCalled();
  });
});
