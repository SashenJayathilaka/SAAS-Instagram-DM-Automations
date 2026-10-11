import { type InstagramAccountSnapshot } from "@prisma/client";
import { getInstagramBusinessProfile, getSafeMetaError, META_GRAPH_VERSION } from "@/lib/fetch";
import { client } from "@/lib/prisma";
import {
  type ChangeSummary,
  type DashboardPeriod,
  getPeriodRange,
  percentChange,
} from "@/lib/dashboard-metrics";

const SNAPSHOT_FRESH_MS = 6 * 60 * 60 * 1000;
const FORCE_REFRESH_LIMIT_MS = 15 * 60 * 1000;
export const PROFILE_FIELD_SETS = [
  ["id", "username", "profile_picture_url", "followers_count", "media_count"],
  ["id", "username", "profile_picture_url", "media_count"],
  ["id", "username", "profile_picture_url"],
] as const;
const PROFILE_FIELD_KEYS = new Set(PROFILE_FIELD_SETS[0]);

export type SerializableInstagramSnapshot = {
  id: string;
  integrationId: string;
  instagramId: string | null;
  username: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
  accountType: string | null;
  source: string;
  fetchedAt: string;
  createdAt: string;
};

export type InstagramSnapshotComparison = {
  current: InstagramAccountSnapshot | null;
  previous: InstagramAccountSnapshot | null;
  followerChange: number | null;
  followerChangePercent: number | null;
  change: ChangeSummary;
};

export type RefreshInstagramSnapshotResult = {
  status: number;
  data: SerializableInstagramSnapshot | null;
  cached: boolean;
  error?: string;
  message?: string;
  diagnostics?: InstagramProfileFetchDiagnostics;
};

export type InstagramProfileFetchDiagnostics = {
  igIdUsed: string | null;
  tokenPresent: boolean;
  requestedFields: string[];
  returnedFieldNames: string[];
  safeMetaError?: ReturnType<typeof getSafeMetaError>;
  graphApiVersion: string;
  attempts: Array<{
    requestedFields: string[];
    returnedFieldNames: string[];
    safeMetaError?: ReturnType<typeof getSafeMetaError>;
  }>;
};

type RefreshOptions = {
  force?: boolean;
  now?: Date;
};

function hasFollowers(snapshot: InstagramAccountSnapshot | null | undefined) {
  return typeof snapshot?.followersCount === "number";
}

export function serializeInstagramSnapshot(
  snapshot: InstagramAccountSnapshot | null
): SerializableInstagramSnapshot | null {
  if (!snapshot) return null;
  return {
    id: snapshot.id,
    integrationId: snapshot.integrationId,
    instagramId: snapshot.instagramId,
    username: snapshot.username,
    profilePictureUrl: snapshot.profilePictureUrl,
    followersCount: snapshot.followersCount,
    mediaCount: snapshot.mediaCount,
    accountType: snapshot.accountType,
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString(),
  };
}

export async function getLatestInstagramSnapshot(integrationId: string) {
  return client.instagramAccountSnapshot.findFirst({
    where: { integrationId },
    orderBy: { fetchedAt: "desc" },
  });
}

export async function getInstagramSnapshotComparison(
  integrationId: string,
  period: DashboardPeriod,
  now = new Date()
): Promise<InstagramSnapshotComparison> {
  const range = getPeriodRange(period, now);
  const [current, previous] = await Promise.all([
    getLatestInstagramSnapshot(integrationId),
    client.instagramAccountSnapshot.findFirst({
      where: { integrationId, fetchedAt: { lte: range.currentStart } },
      orderBy: { fetchedAt: "desc" },
    }),
  ]);

  const followerChange =
    hasFollowers(current) && hasFollowers(previous)
      ? current!.followersCount! - previous!.followersCount!
      : null;
  const followerChangePercent =
    followerChange !== null && previous!.followersCount && previous!.followersCount > 0
      ? Math.round((followerChange / previous!.followersCount) * 100)
      : null;

  return {
    current,
    previous,
    followerChange,
    followerChangePercent,
    change:
      hasFollowers(current) && hasFollowers(previous)
        ? percentChange(current!.followersCount!, previous!.followersCount!)
        : hasFollowers(current)
          ? { label: "—", tone: "neutral", value: null }
          : { label: "—", tone: "neutral", value: null },
  };
}

export async function getInstagramSnapshotComparisonForUser(
  userId: string,
  integrationId: string | undefined,
  period: DashboardPeriod,
  now = new Date()
) {
  if (!integrationId) return null;
  const integration = await client.integrations.findFirst({
    where: { id: integrationId, userId },
    select: { id: true },
  });
  if (!integration) return null;
  return getInstagramSnapshotComparison(integration.id, period, now);
}

export function getProfileSnapshotStatus(
  snapshot: Pick<InstagramAccountSnapshot, "fetchedAt" | "followersCount" | "mediaCount"> | null | undefined,
  now = new Date()
): { label: "Missing" | "Partial" | "Fresh" | "Stale"; ok: boolean } {
  if (!snapshot) return { label: "Missing", ok: false };
  const hasCompleteStats =
    typeof snapshot.followersCount === "number" && typeof snapshot.mediaCount === "number";
  if (!hasCompleteStats) return { label: "Partial", ok: false };
  const age = now.getTime() - snapshot.fetchedAt.getTime();
  if (age <= SNAPSHOT_FRESH_MS) return { label: "Fresh", ok: true };
  return { label: "Stale", ok: false };
}

export function getProfileSnapshotDisplay(
  snapshot: Pick<InstagramAccountSnapshot, "fetchedAt" | "followersCount" | "mediaCount"> | null | undefined,
  refresh?: Pick<RefreshInstagramSnapshotResult, "error"> | null,
  now = new Date()
): { label: "Missing" | "Partial" | "Fresh" | "Stale" | "Failed"; ok: boolean } {
  if (!snapshot && refresh?.error) return { label: "Failed", ok: false };
  return getProfileSnapshotStatus(snapshot, now);
}

export function formatSnapshotRefreshTime(value?: Date | string | null) {
  if (!value) return "Never refreshed";
  return new Date(value).toLocaleString();
}

function safeProfileStatsError(error: unknown) {
  const safe = getSafeMetaError(error);
  const message = String(safe.message ?? "").toLowerCase();
  if (message.includes("expired") || message.includes("invalid oauth") || safe.code === 190) {
    return "Reconnect Instagram to refresh profile stats.";
  }
  if (
    safe.code === 10 ||
    safe.code === 100 ||
    safe.code === 200 ||
    message.includes("permission") ||
    message.includes("followers_count") ||
    message.includes("media_count")
  ) {
    return "Meta did not return follower/post fields. Reconnect Instagram or check account permissions.";
  }
  if (safe.code === 4 || safe.code === 17 || safe.code === 613) {
    return "Profile refreshed moments ago. Try again in a few minutes.";
  }
  return "Instagram profile stats unavailable.";
}

function isRetryableProfileFieldError(error: unknown) {
  const safe = getSafeMetaError(error);
  const message = String(safe.message ?? "").toLowerCase();
  return (
    safe.code === 10 ||
    safe.code === 100 ||
    safe.code === 200 ||
    message.includes("unsupported") ||
    message.includes("field") ||
    message.includes("permission") ||
    message.includes("followers_count") ||
    message.includes("media_count")
  );
}

function returnedFieldNames(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  return Object.keys(data as Record<string, unknown>).filter((key) => PROFILE_FIELD_KEYS.has(key as any)).sort();
}

function hasAnyProfileField(data: unknown) {
  return returnedFieldNames(data).length > 0;
}

function createDiagnostics(igIdUsed: string | null, tokenPresent: boolean): InstagramProfileFetchDiagnostics {
  return {
    igIdUsed,
    tokenPresent,
    requestedFields: [...PROFILE_FIELD_SETS[0]],
    returnedFieldNames: [],
    graphApiVersion: META_GRAPH_VERSION,
    attempts: [],
  };
}

function recordProfileFetchSuccess(
  diagnostics: InstagramProfileFetchDiagnostics,
  fields: readonly string[],
  data: unknown
) {
  const names = returnedFieldNames(data);
  diagnostics.requestedFields = [...fields];
  diagnostics.returnedFieldNames = names;
  diagnostics.safeMetaError = undefined;
  diagnostics.attempts.push({ requestedFields: [...fields], returnedFieldNames: names });
}

function recordProfileFetchError(
  diagnostics: InstagramProfileFetchDiagnostics,
  fields: readonly string[],
  error: unknown
) {
  const safeMetaError = getSafeMetaError(error);
  diagnostics.requestedFields = [...fields];
  diagnostics.returnedFieldNames = [];
  diagnostics.safeMetaError = safeMetaError;
  diagnostics.attempts.push({ requestedFields: [...fields], returnedFieldNames: [], safeMetaError });
}

function diagnosticJson(diagnostics: InstagramProfileFetchDiagnostics) {
  return {
    profileSnapshotRefresh: {
      ...diagnostics,
      refreshedAt: new Date().toISOString(),
    },
  };
}

function mergeDiagnosticJson(existing: unknown, diagnostics: InstagramProfileFetchDiagnostics) {
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return {
      ...(existing as Record<string, unknown>),
      ...diagnosticJson(diagnostics),
    };
  }
  return diagnosticJson(diagnostics);
}

async function markIntegrationReconnectRequired(
  integrationId: string,
  reason: string,
  source: string,
) {
  const now = new Date();
  await client.integrations.update({
    where: { id: integrationId },
    data: {
      reconnectRequired: true,
      oauthLastError: reason,
      oauthLastErrorAt: now,
      oauthLastErrorSource: source,
      lastAdminNote: reason,
      lastAdminActionAt: now,
    },
  }).catch(() => undefined);
  await client.automation.updateMany({
    where: {
      integrationId,
      active: true,
      archivedAt: null,
    },
    data: {
      active: false,
      needsReview: true,
      reviewReason: "Instagram authorization expired. Reconnect Instagram before reactivating this automation.",
    },
  }).catch(() => undefined);
}

async function storeProfileFetchDiagnostics(
  integrationId: string,
  existing: unknown,
  diagnostics: InstagramProfileFetchDiagnostics
) {
  await client.integrations.update({
    where: { id: integrationId },
    data: { oauthResolutionDiagnostics: mergeDiagnosticJson(existing, diagnostics) },
  });
}

async function fetchProfileWithFallbacks(
  instagramId: string,
  token: string,
  diagnostics: InstagramProfileFetchDiagnostics
) {
  let lastError: unknown = null;

  for (let index = 0; index < PROFILE_FIELD_SETS.length; index += 1) {
    const fields = PROFILE_FIELD_SETS[index];
    try {
      const response = await getInstagramBusinessProfile(instagramId, token, fields.join(","));
      const data = response.data ?? {};
      recordProfileFetchSuccess(diagnostics, fields, data);
      if (hasAnyProfileField(data)) return response;
      lastError = new Error("Meta profile response did not include profile fields.");
    } catch (error) {
      lastError = error;
      recordProfileFetchError(diagnostics, fields, error);
      if (index === PROFILE_FIELD_SETS.length - 1 || !isRetryableProfileFieldError(error)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Instagram profile stats unavailable.");
}

export async function getInstagramSnapshotComparisonWithRefresh(
  clerkId: string,
  userId: string,
  integrationId: string | undefined,
  period: DashboardPeriod,
  now = new Date(),
  deferRefresh?: (work: Promise<unknown>) => void
): Promise<{
  comparison: InstagramSnapshotComparison | null;
  refresh: RefreshInstagramSnapshotResult | null;
}> {
  const initial = await getInstagramSnapshotComparisonForUser(userId, integrationId, period, now);
  if (!integrationId) {
    return { comparison: initial, refresh: null };
  }

  const current = initial?.current ?? null;
  const currentAgeMs = current ? now.getTime() - current.fetchedAt.getTime() : Number.POSITIVE_INFINITY;
  if (current && currentAgeMs < SNAPSHOT_FRESH_MS) {
    return { comparison: initial, refresh: null };
  }

  if (deferRefresh) {
    // Serve persisted metrics immediately; Meta latency must not block navigation.
    deferRefresh(refreshInstagramProfileSnapshotForUser(clerkId, integrationId, { now }).catch(() => undefined));
    return { comparison: initial, refresh: null };
  }

  const refresh = await refreshInstagramProfileSnapshotForUser(clerkId, integrationId, { now });
  const comparison = await getInstagramSnapshotComparisonForUser(userId, integrationId, period, now);

  return { comparison, refresh };
}

export async function getInstagramSnapshotComparisonWithMissingRefresh(
  clerkId: string,
  userId: string,
  integrationId: string | undefined,
  period: DashboardPeriod,
  now = new Date()
) {
  return getInstagramSnapshotComparisonWithRefresh(clerkId, userId, integrationId, period, now);
}

export async function refreshInstagramProfileSnapshotForUser(
  clerkId: string,
  integrationId: string,
  options: RefreshOptions = {}
): Promise<RefreshInstagramSnapshotResult> {
  const now = options.now ?? new Date();
  const integration = await client.integrations.findFirst({
    where: { id: integrationId, User: { clerkId } },
    select: {
      id: true,
      token: true,
      expiresAt: true,
      instagramId: true,
      instagramUsername: true,
      profilePictureUrl: true,
      oauthResolutionDiagnostics: true,
      snapshots: { orderBy: { fetchedAt: "desc" }, take: 1 },
    },
  });

  if (!integration) {
    return { status: 404, data: null, cached: false, error: "Instagram account not found." };
  }

  const latest = integration.snapshots[0] ?? null;
  const latestAgeMs = latest ? now.getTime() - latest.fetchedAt.getTime() : Number.POSITIVE_INFINITY;
  const diagnostics = createDiagnostics(integration.instagramId, Boolean(integration.token));

  if (latest && !options.force && latestAgeMs < SNAPSHOT_FRESH_MS) {
    return { status: 200, data: serializeInstagramSnapshot(latest), cached: true };
  }

  if (latest && options.force && latestAgeMs < FORCE_REFRESH_LIMIT_MS) {
    return {
      status: 200,
      data: serializeInstagramSnapshot(latest),
      cached: true,
      message: "Profile refreshed moments ago. Try again in a few minutes.",
    };
  }

  if (!integration.instagramId || !integration.token) {
    await storeProfileFetchDiagnostics(integration.id, integration.oauthResolutionDiagnostics, diagnostics);
    return {
      status: 404,
      data: serializeInstagramSnapshot(latest),
      cached: Boolean(latest),
      error: "Connect Instagram to enable profile stats.",
      diagnostics,
    };
  }

  if (integration.expiresAt && integration.expiresAt.getTime() < now.getTime()) {
    await storeProfileFetchDiagnostics(integration.id, integration.oauthResolutionDiagnostics, diagnostics);
    await markIntegrationReconnectRequired(
      integration.id,
      "instagram_token_expired",
      "profile_snapshot",
    );
    return {
      status: 401,
      data: serializeInstagramSnapshot(latest),
      cached: Boolean(latest),
      error: "Reconnect Instagram to refresh profile stats.",
      diagnostics,
    };
  }

  try {
    const profile = await fetchProfileWithFallbacks(integration.instagramId, integration.token, diagnostics);
    const data = profile.data ?? {};
    const snapshot = await client.instagramAccountSnapshot.create({
      data: {
        integrationId: integration.id,
        instagramId: String(data.id ?? integration.instagramId),
        username: typeof data.username === "string" ? data.username : integration.instagramUsername,
        profilePictureUrl:
          typeof data.profile_picture_url === "string"
            ? data.profile_picture_url
            : integration.profilePictureUrl,
        followersCount:
          typeof data.followers_count === "number" ? Math.max(0, data.followers_count) : null,
        mediaCount: typeof data.media_count === "number" ? Math.max(0, data.media_count) : null,
        accountType: typeof data.account_type === "string" ? data.account_type : null,
        fetchedAt: now,
      },
    });

    await client.integrations.update({
      where: { id: integration.id },
      data: {
        instagramUsername: snapshot.username ?? integration.instagramUsername,
        profilePictureUrl: snapshot.profilePictureUrl ?? integration.profilePictureUrl,
        oauthResolutionDiagnostics: mergeDiagnosticJson(integration.oauthResolutionDiagnostics, diagnostics),
      },
    });

    console.info("[instagram-profile-refresh]", diagnostics);

    const missingCounts =
      typeof snapshot.followersCount !== "number" || typeof snapshot.mediaCount !== "number";
    return {
      status: 200,
      data: serializeInstagramSnapshot(snapshot),
      cached: false,
      message: missingCounts ? "Instagram profile synced successfully. Follower count unavailable from Meta." : undefined,
      diagnostics,
    };
  } catch (error) {
    await storeProfileFetchDiagnostics(integration.id, integration.oauthResolutionDiagnostics, diagnostics);
    const safe = getSafeMetaError(error);
    if (safe.code === 190) {
      await markIntegrationReconnectRequired(
        integration.id,
        "instagram_token_invalidated",
        "profile_snapshot",
      );
    }
    console.warn("[instagram-profile-refresh-failed]", diagnostics);
    return {
      status: 200,
      data: serializeInstagramSnapshot(latest),
      cached: Boolean(latest),
      error: safeProfileStatsError(error),
      diagnostics,
    };
  }
}
