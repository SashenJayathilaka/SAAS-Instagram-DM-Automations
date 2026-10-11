import { type DateRange } from "@/lib/dashboard-metrics";
import { type DashboardPeriod } from "@/lib/dashboard-metrics";
import { getInstagramSnapshotComparisonForUser } from "@/lib/instagram-profile-snapshot";
import { getUserFacingMetrics } from "@/lib/user-facing-metrics";

export type AccountStatValue = {
  value: number | string;
  enabled: boolean;
  subtitle: string;
};

export type InstagramAccountSettingsStats = {
  followers: AccountStatValue;
  posts: AccountStatValue;
  comments: AccountStatValue;
  removed: AccountStatValue;
  dmsIn: AccountStatValue;
  dmsOut: AccountStatValue;
  contacts: AccountStatValue;
  replyRate: AccountStatValue;
};

function monthRange(now = new Date()): Required<DateRange> {
  return {
    gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    lt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

function missingSnapshot(): AccountStatValue {
  return { value: "Refresh needed", enabled: false, subtitle: "Refresh profile to load Instagram stats" };
}

function unavailableSnapshotField(subtitle: string): AccountStatValue {
  return { value: "Unavailable", enabled: false, subtitle };
}

export async function getInstagramAccountSettingsStats(
  userId: string,
  integrationId?: string,
  range: DateRange = monthRange(),
  period: DashboardPeriod = "month"
): Promise<InstagramAccountSettingsStats> {
  const [metrics, snapshotComparison] = await Promise.all([
    getUserFacingMetrics(userId, range, integrationId ?? "00000000-0000-0000-0000-000000000000"),
    getInstagramSnapshotComparisonForUser(userId, integrationId, period),
  ]);
  const snapshot = snapshotComparison?.current;
  const followerSubtitle =
    snapshotComparison?.followerChange !== null && snapshotComparison?.followerChange !== undefined
      ? `${snapshotComparison.followerChange >= 0 ? "+" : ""}${snapshotComparison.followerChange.toLocaleString()} followers${
          typeof snapshotComparison.followerChangePercent === "number"
            ? ` · ${snapshotComparison.followerChangePercent >= 0 ? "+" : ""}${snapshotComparison.followerChangePercent}%`
            : ""
        } since last snapshot`
      : "Baseline established. Growth tracking starts after next sync.";

  return {
    followers:
      typeof snapshot?.followersCount === "number"
        ? { value: snapshot.followersCount, enabled: true, subtitle: followerSubtitle }
        : snapshot
          ? unavailableSnapshotField("Follower count is not available for this profile.")
          : missingSnapshot(),
    posts:
      typeof snapshot?.mediaCount === "number"
        ? { value: snapshot.mediaCount, enabled: true, subtitle: "Instagram posts" }
        : snapshot
          ? unavailableSnapshotField("Media count is not available for this profile.")
          : missingSnapshot(),
    comments: { value: metrics.commentsReceived, enabled: true, subtitle: "External comments this period" },
    removed: { value: "Not shown", enabled: false, subtitle: "This dashboard focuses on comments AP3K received" },
    dmsIn: { value: "Not used", enabled: false, subtitle: "AP3K starts DMs from comment triggers" },
    dmsOut: { value: metrics.dmsSent, enabled: true, subtitle: "DMs sent by AP3K" },
    contacts: { value: metrics.leadsCaptured, enabled: true, subtitle: "Leads captured this period" },
    replyRate: { value: `${metrics.replyRate}%`, enabled: true, subtitle: "Replies / matched comments" },
  };
}
