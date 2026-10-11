import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ automation: vi.fn(), query: vi.fn(), hits: vi.fn(), follows: vi.fn(), contacts: vi.fn(), conversations: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { lead: { findMany: mocks.contacts }, conversation: { findMany: mocks.conversations }, automation: { findFirst: mocks.automation }, $queryRaw: mocks.query, automationHit: { findMany: mocks.hits }, automationFollowerState: { findMany: mocks.follows } } }));
import { getAutomationAnalytics } from "./automation-analytics";
const automationId = "00000000-0000-0000-0000-000000000001";
const integrationId = "00000000-0000-0000-0000-000000000002";
const now = new Date("2026-09-27T21:12:00Z");
const createdAt = new Date("2026-09-26T09:00:00Z");
function sqlText(call: any[]) { return call[0].join("?"); }
beforeEach(() => {
  vi.resetAllMocks();
  mocks.contacts.mockResolvedValue([{ igUserId: "1234567890", igUsername: "actual.creator" }]);
  mocks.conversations.mockResolvedValue([]);
  mocks.automation.mockResolvedValue({ id: automationId, name: "Guide", active: true, createdAt, source: "COMMENT", followGateRequired: true, posts: [{ media: "https://example.com/post.jpg" }], listener: { dmCount: 2, commentCount: 3 } });
  mocks.query.mockImplementation(async (parts: TemplateStringsArray) => {
    const sql = parts.join("?");
    if (sql.includes('AS "uniqueHitRecipients"')) return [{ hits: BigInt(9), uniqueHitRecipients: BigInt(4), clicks: BigInt(3), eligibleNonFollowers: BigInt(2), newFollowers: BigInt(1), trackingStartedAt: createdAt }];
    if (sql.includes("SUM(hits)")) return [{ date: "2026-09-26", hits: BigInt(9), clicks: BigInt(3) }];
    if (sql.includes("GROUP BY c.country")) return [{ country: "MA", clicks: BigInt(3) }];
    if (sql.includes("GROUP BY c.destination")) return [{ destination: "https://example.com/guide", recipients: BigInt(4), clicks: BigInt(2) }];
    return [{ id: "click-1", recipientIgId: "1234567890", country: "MA", createdAt }];
  });
  mocks.hits.mockResolvedValue([{ id: "hit-1", recipientIgId: "1234567890", source: "COMMENT", createdAt }]);
  mocks.follows.mockResolvedValue([{ id: "follow-1", recipientIgId: "1234567890", followedAt: createdAt }]);
});

describe("account-scoped automation analytics", () => {
  it("checks both authenticated ownership and selected account before reading metrics", async () => {
    mocks.automation.mockResolvedValue(null);
    expect(await getAutomationAnalytics(automationId, "owner", integrationId, now)).toBeNull();
    expect(mocks.automation.mock.calls[0][0].where).toEqual({ id: automationId, integrationId, archivedAt: null, User: { clerkId: "owner" }, integration: { User: { clerkId: "owner" } } });
    expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.hits).not.toHaveBeenCalled(); expect(mocks.follows).not.toHaveBeenCalled();
  });
  it("rejects malformed IDs or empty identity before querying", async () => {
    expect(await getAutomationAnalytics("invalid", "owner", integrationId)).toBeNull();
    expect(await getAutomationAnalytics(automationId, "owner", "invalid")).toBeNull();
    expect(await getAutomationAnalytics(automationId, "", integrationId)).toBeNull();
    expect(mocks.automation).not.toHaveBeenCalled();
  });
  it("uses unique hit recipients for click rate and verified non-followers for follow conversion", async () => {
    const result = await getAutomationAnalytics(automationId, "owner", integrationId, now);
    expect(result?.totals).toEqual({ hits: 9, uniqueHitRecipients: 4, clicks: 3, eligibleNonFollowers: 2, newFollowers: 1, clickRate: 75, followRate: 50 });
    expect(result?.automation.responseCount).toBe(2);
    expect(result?.trackingStartedAt).toBe(createdAt.toISOString());
    expect(() => JSON.stringify(result)).not.toThrow();
  });
  it("zero fills exactly seven UTC days and bounds both halves of the chart SQL query", async () => {
    const result = await getAutomationAnalytics(automationId, "owner", integrationId, now);
    expect(result?.daily).toHaveLength(7);
    expect(result?.daily[0]).toEqual({ date: "2026-09-21", hits: 0, clicks: 0 });
    expect(result?.daily[5]).toEqual({ date: "2026-09-26", hits: 9, clicks: 3 });
    expect(result?.daily[6]).toEqual({ date: "2026-09-27", hits: 0, clicks: 0 });
    const chart = mocks.query.mock.calls.find(call => sqlText(call).includes("SUM(hits)"))!;
    expect(chart.filter(value => value instanceof Date).map(value => value.toISOString())).toEqual(["2026-09-21T00:00:00.000Z", "2026-09-28T00:00:00.000Z", "2026-09-21T00:00:00.000Z", "2026-09-28T00:00:00.000Z"]);
  });
  it("bounds activity and countries and requires matching hit recipients for every click query", async () => {
    await getAutomationAnalytics(automationId, "owner", integrationId, now);
    expect(mocks.hits.mock.calls[0][0]).toMatchObject({ where: { automationId }, take: 50 });
    expect(mocks.follows.mock.calls[0][0]).toMatchObject({ where: { automationId, integrationId, firstFollowing: false, followedAt: { not: null } }, take: 50 });
    for (const call of mocks.query.mock.calls) {
      expect(sqlText(call)).toMatch(/h\."recipientIgId" = [cl]\."recipientIgId"/);
      expect(sqlText(call)).toMatch(/h\."automationId" = [cl]\."automationId"/);
      expect(call).toContain(automationId);
    }
    expect(sqlText(mocks.query.mock.calls[2])).toContain("LIMIT 10");
    expect(mocks.query.mock.calls[3]).toContain(50);
  });
  it("shows the saved username without exposing raw recipient identifiers", async () => {
    const result = await getAutomationAnalytics(automationId, "owner", integrationId, now);
    expect(result?.recent.hits[0].recipient).toBe("@actual.creator");
    expect(JSON.stringify(result)).not.toContain("1234567890");
    expect(JSON.stringify(result)).not.toContain("recipientIgId");
  });
  it("uses the latest inbox username within the authenticated account", async () => {
    mocks.conversations.mockResolvedValue([{ recipientIgId: "1234567890", recipientUsername: "@renamed.creator" }]);
    const result = await getAutomationAnalytics(automationId, "owner", integrationId, now);
    expect(result?.recent.clicks[0].recipient).toBe("@renamed.creator");
    expect(result?.recent.follows[0].recipient).toBe("@renamed.creator");
    expect(mocks.contacts.mock.calls[0][0].where.automation).toEqual({ integrationId, User: { clerkId: "owner" } });
    expect(mocks.conversations.mock.calls[0][0].where).toMatchObject({ integrationId, user: { clerkId: "owner" }, recipientIgId: { in: ["1234567890"] } });
  });
  it("never invents a username when Meta has not supplied one", async () => {
    mocks.contacts.mockResolvedValue([]);
    const result = await getAutomationAnalytics(automationId, "owner", integrationId, now);
    expect(result?.recent.hits[0].recipient).toBe("Instagram user");
  });
  it("returns real zeros and no invented tracking start for an empty automation", async () => {
    mocks.query.mockImplementation(async (parts: TemplateStringsArray) => parts.join("").includes('AS "uniqueHitRecipients"') ? [{ hits: BigInt(0), uniqueHitRecipients: BigInt(0), clicks: BigInt(0), eligibleNonFollowers: BigInt(0), newFollowers: BigInt(0), trackingStartedAt: null }] : []);
    mocks.hits.mockResolvedValue([]); mocks.follows.mockResolvedValue([]);
    const result = await getAutomationAnalytics(automationId, "owner", integrationId, now);
    expect(result?.totals.clickRate).toBe(0); expect(result?.totals.followRate).toBe(0); expect(result?.trackingStartedAt).toBeNull();
    expect(result?.daily.every(day => day.hits === 0 && day.clicks === 0)).toBe(true);
  });
});
