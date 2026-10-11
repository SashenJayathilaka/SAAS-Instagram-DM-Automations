import { beforeEach, describe, expect, it } from "vitest";
import {
  canShowProfileSyncDebug,
  formatFollowerGrowthSubtitle,
  getDashboardProfileStats,
  getWebhookHealthPresentation,
} from "@/lib/instagram-account-ux";
import type { UsageSummary } from "@/lib/plan-limits";

const now = new Date("2026-05-25T12:00:00Z");

const usage: UsageSummary = {
  plan: "PRO",
  planLabel: "Pro",
  periodLabel: "May 2026",
  periodStart: new Date("2026-05-01T00:00:00Z"),
  periodEnd: new Date("2026-06-01T00:00:00Z"),
  enforcementStart: new Date("2026-05-01T00:00:00Z"),
  staticReplies: { used: 10, limit: 5000, remaining: 4990, percent: 0, blocked: false },
  aiReplies: { used: 0, limit: 0, remaining: 0, percent: 0, blocked: true },
  activeCampaigns: { used: 1, limit: "unlimited", remaining: null, percent: 0, blocked: false },
  connectedAccounts: { used: 1, limit: 1, remaining: 0, percent: 100, blocked: true },
};

beforeEach(() => {
  process.env.ADMIN_EMAILS = "owner@example.com";
  process.env.ADMIN_CLERK_USER_IDS = "clerk_admin";
});

describe("instagram account UX helpers", () => {
  it("hides profile sync debug for normal users", () => {
    expect(canShowProfileSyncDebug({ connected: true, email: "user@example.com", clerkId: "clerk_user" })).toBe(false);
  });

  it("shows profile sync debug for admins only", () => {
    expect(canShowProfileSyncDebug({ connected: true, email: "owner@example.com", clerkId: "clerk_user" })).toBe(true);
    expect(canShowProfileSyncDebug({ connected: true, email: "user@example.com", clerkId: "clerk_admin" })).toBe(true);
    expect(canShowProfileSyncDebug({ connected: false, email: "owner@example.com", clerkId: "clerk_user" })).toBe(false);
  });

  it("shows webhook operational when recent comments exist despite old subscription error", () => {
    const result = getWebhookHealthPresentation({
      lastCommentWebhook: { createdAt: new Date("2026-05-25T11:00:00Z") },
      subscription: { error: "code=100 subscribed_fields failed" },
    }, now);

    expect(result.webhook).toEqual({
      label: "Comment delivery",
      value: "Operational",
      detail: "Receiving Instagram comments",
      ok: true,
    });
    expect(result.failure.value).toBe("Previous connection warning");
    expect(result.failure.ok).toBe(true);
  });

  it("shows webhook warning only when no recent comments and an error exists", () => {
    const result = getWebhookHealthPresentation({
      lastCommentWebhook: { createdAt: new Date("2026-05-23T11:00:00Z") },
      subscription: { error: "code=100 subscribed_fields failed" },
    }, now);

    expect(result.webhook.value).toBe("Needs attention");
    expect(result.webhook.ok).toBe(false);
    expect(result.failure.value).toBe("Webhook subscription needs review");
    expect(result.failure.ok).toBe(false);
  });

  it("uses baseline copy when no previous follower snapshot exists", () => {
    expect(formatFollowerGrowthSubtitle({
      current: { followersCount: 8965 },
      previous: null,
      followerChange: null,
    })).toBe("Baseline established. Growth tracking starts after next sync.");
  });

  it("uses growth copy when previous follower snapshot exists", () => {
    expect(formatFollowerGrowthSubtitle({
      current: { followersCount: 8965 },
      previous: { followersCount: 8900 },
      followerChange: 65,
      followerChangePercent: 1,
    })).toBe("+65 followers · +1% since last snapshot");
  });

  it("surfaces snapshot followers and posts on dashboard stats", () => {
    const stats = getDashboardProfileStats({
      snapshotComparison: {
        current: { followersCount: 8965, mediaCount: 15 },
        previous: null,
        followerChange: null,
        change: { label: "—", tone: "neutral", value: null },
      },
      metrics: { commentsReceived: 22, replyRate: 75, leadsCaptured: 3 },
      usage,
    });

    expect(stats.map((stat) => [stat.label, stat.value])).toEqual([
      ["Followers", "8,965"],
      ["Posts", "15"],
      ["Comments", 22],
      ["Reply Rate", "75%"],
      ["Leads", 3],
      ["Monthly usage", "10 / 5,000"],
    ]);
  });
});

it("does not show refresh requests, activity or usage for an unconnected account", () => {
  const stats = getDashboardProfileStats({ connected: false, snapshotComparison: null, metrics: null, usage: null });
  expect(stats.every(stat => stat.value === "—" && stat.subtitle === "Connect Instagram")).toBe(true);
});
