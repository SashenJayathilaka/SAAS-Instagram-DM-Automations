"use server";

import {
  requireAdminAction,
  adminFormString,
  createAdminAuditLog,
} from "@/actions/admin/safe-actions";
import { getInstagramBusinessProfile } from "@/lib/fetch";
import { client } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const MIN_REASON = 5;

const V2_PATHS = [
  "/admin/accounts",
  "/admin/overview",
  "/admin/users",
  "/admin/campaigns",
  "/ap3k-admin-v2/accounts",
  "/ap3k-admin-v2/overview",
  "/ap3k-admin-v2/activity",
] as const;

function safeError(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

type MetaErrorDetails = {
  httpStatus: number;
  metaCode?: number;
  metaSubcode?: number;
  metaType?: string;
  metaMessage?: string;
};

function sanitizeMetaMessage(msg: string): string {
  return msg.replace(/EAA[A-Za-z0-9]+/g, "[token]").slice(0, 200);
}

// Parses axios errors from getInstagramBusinessProfile — never touches error.config (no token leak).
function parseAxiosMetaError(error: unknown): MetaErrorDetails {
  const axErr = error as { response?: { status?: number; data?: { error?: Record<string, unknown> } } };
  const httpStatus = axErr?.response?.status ?? 0;
  const err = axErr?.response?.data?.error ?? {};
  return {
    httpStatus,
    metaCode: typeof err.code === "number" ? (err.code as number) : undefined,
    metaSubcode: typeof err.error_subcode === "number" ? (err.error_subcode as number) : undefined,
    metaType: typeof err.type === "string" ? (err.type as string).slice(0, 64) : undefined,
    metaMessage: typeof err.message === "string" ? sanitizeMetaMessage(err.message as string) : undefined,
  };
}

// Mirrors isRetryableProfileFieldError in lib/instagram-profile-snapshot.ts.
// Returns true when Meta rejects because followers_count/media_count are unavailable
// for this account — we can retry without those fields.
function isFieldUnavailableError(error: unknown): boolean {
  const msg =
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? "";
  return msg.includes("followers_count") || msg.includes("media_count");
}

function buildUserSafeError(err: MetaErrorDetails): string {
  const parts: string[] = [`Meta API error HTTP ${err.httpStatus}`];
  if (err.metaCode !== undefined) parts.push(`code ${err.metaCode}`);
  if (err.metaSubcode !== undefined) parts.push(`subcode ${err.metaSubcode}`);
  if (err.metaType) parts.push(`type: ${err.metaType}`);
  if (err.metaMessage) parts.push(err.metaMessage);
  return parts.join(" — ");
}

// Field sets matching lib/instagram-profile-snapshot.ts PROFILE_FIELD_SETS.
// account_type is intentionally excluded — it is not in the working field set.
const ALL_PROFILE_FIELDS = "id,username,profile_picture_url,followers_count,media_count";
const BASIC_PROFILE_FIELDS = "id,username,profile_picture_url";

// ---------------------------------------------------------------------------
// Action 1: Refresh Profile Snapshot
// Token is read server-side only for Meta Graph API call — never returned,
// never logged, never written to audit before/after.
// ---------------------------------------------------------------------------
export async function adminRefreshProfileSnapshotAction(formData: FormData) {
  const integrationId = adminFormString(formData, "integrationId");
  const reason = adminFormString(formData, "reason");

  if (reason.length < MIN_REASON) {
    return { status: 400 as const, data: "Reason must be at least 5 characters." };
  }

  let admin: Awaited<ReturnType<typeof requireAdminAction>>;
  try {
    admin = await requireAdminAction();
  } catch {
    return { status: 403 as const, data: "Unauthorized." };
  }

  const row = await client.integrations.findUnique({
    where: { id: integrationId },
    select: {
      id: true,
      instagramId: true,
      instagramUsername: true,
      profilePictureUrl: true,
      token: true, // used only for Meta API call below — never returned or logged
    },
  });

  if (!row || !row.instagramId) {
    const error = !row ? "Integration not found." : "No instagramId on integration.";
    await createAdminAuditLog({ admin, action: "ADMIN_REFRESH_PROFILE_SNAPSHOT", targetType: "INTEGRATION", targetId: integrationId, reason, status: "FAILED", error });
    return { status: 404 as const, data: !row ? "Integration not found." : "No Instagram ID on this account." };
  }

  // Read previous snapshot before any write so we can preserve stats when Meta cannot
  // return them. Dashboard reads getLatestInstagramSnapshot (newest row by fetchedAt),
  // so writing null counts would displace real historical values.
  const prevSnapshot = await client.instagramAccountSnapshot.findFirst({
    where: { integrationId },
    orderBy: { fetchedAt: "desc" },
    select: { followersCount: true, mediaCount: true },
  });

  // Fetch profile using the same getInstagramBusinessProfile helper as the auto-refresh
  // (correct API version, access_token query param, working field set).
  // Strategy: try all fields first; if Meta rejects followers_count/media_count for this
  // account, retry with basic fields only (mirrors PROFILE_FIELD_SETS fallback).
  type ProfileData = { id: string; username?: string; profile_picture_url?: string; followers_count?: number; media_count?: number };
  let profileData: ProfileData;
  let usedFallbackFields = false;

  try {
    const res = await getInstagramBusinessProfile(row.instagramId, row.token, ALL_PROFILE_FIELDS);
    profileData = res.data as ProfileData;
  } catch (firstError) {
    if (isFieldUnavailableError(firstError)) {
      // followers_count/media_count not available for this account — retry without them
      try {
        const basicRes = await getInstagramBusinessProfile(row.instagramId, row.token, BASIC_PROFILE_FIELDS);
        profileData = basicRes.data as ProfileData;
        usedFallbackFields = true;
      } catch (basicError) {
        const metaError = parseAxiosMetaError(basicError);
        await createAdminAuditLog({ admin, action: "ADMIN_REFRESH_PROFILE_SNAPSHOT", targetType: "INTEGRATION", targetId: integrationId, reason, before: { instagramUsername: row.instagramUsername }, after: metaError, status: "FAILED", error: buildUserSafeError(metaError) });
        return { status: 500 as const, data: buildUserSafeError(metaError) };
      }
    } else {
      const metaError = parseAxiosMetaError(firstError);
      await createAdminAuditLog({ admin, action: "ADMIN_REFRESH_PROFILE_SNAPSHOT", targetType: "INTEGRATION", targetId: integrationId, reason, before: { instagramUsername: row.instagramUsername }, after: metaError, status: "FAILED", error: buildUserSafeError(metaError) });
      return { status: 500 as const, data: buildUserSafeError(metaError) };
    }
  }

  // Derive final stat values: live > previous snapshot > null.
  // Never overwrite a real historical value with null.
  const followersCount = typeof profileData.followers_count === "number"
    ? profileData.followers_count
    : (prevSnapshot?.followersCount ?? null);
  const mediaCount = typeof profileData.media_count === "number"
    ? profileData.media_count
    : (prevSnapshot?.mediaCount ?? null);
  const usedLiveStats = typeof profileData.followers_count === "number" && typeof profileData.media_count === "number";
  const statsPreserved = !usedLiveStats && (followersCount !== null || mediaCount !== null);

  try {
    await client.instagramAccountSnapshot.create({
      data: {
        integrationId,
        instagramId: profileData.id,
        username: profileData.username ?? null,
        profilePictureUrl: profileData.profile_picture_url ?? null,
        followersCount,
        mediaCount,
        accountType: null,
        source: statsPreserved ? "admin_refresh_partial" : "admin_refresh",
      },
    });

    await client.integrations.update({
      where: { id: integrationId },
      data: {
        instagramUsername: profileData.username ?? row.instagramUsername,
        profilePictureUrl: profileData.profile_picture_url ?? row.profilePictureUrl,
        lastAdminNote: reason,
        lastAdminActionAt: new Date(),
      },
    });

    await createAdminAuditLog({
      admin, action: "ADMIN_REFRESH_PROFILE_SNAPSHOT", targetType: "INTEGRATION", targetId: integrationId, reason,
      before: { instagramUsername: row.instagramUsername },
      after: { username: profileData.username, followersCount, statsSource: statsPreserved ? "preserved_from_previous_snapshot" : "live_meta_api" },
      status: "SUCCESS",
    });

    for (const path of V2_PATHS) revalidatePath(path);
    revalidatePath("/admin/users", "layout");
    const message = statsPreserved
      ? "Profile updated. Stats not refreshed — showing previous values."
      : "Profile snapshot refreshed.";
    return { status: 200 as const, data: message };
  } catch (error) {
    await createAdminAuditLog({ admin, action: "ADMIN_REFRESH_PROFILE_SNAPSHOT", targetType: "INTEGRATION", targetId: integrationId, reason, status: "FAILED", error: safeError(error) });
    return { status: 500 as const, data: safeError(error) };
  }
}

// ---------------------------------------------------------------------------
// Action 2: Mark Reconnect Required
// ---------------------------------------------------------------------------
export async function adminMarkReconnectRequiredAction(formData: FormData) {
  const integrationId = adminFormString(formData, "integrationId");
  const reason = adminFormString(formData, "reason");

  if (reason.length < MIN_REASON) {
    return { status: 400 as const, data: "Reason must be at least 5 characters." };
  }

  let admin: Awaited<ReturnType<typeof requireAdminAction>>;
  try {
    admin = await requireAdminAction();
  } catch {
    return { status: 403 as const, data: "Unauthorized." };
  }

  const before = await client.integrations.findUnique({
    where: { id: integrationId },
    select: { id: true, instagramUsername: true, reconnectRequired: true },
  });

  if (!before) {
    await createAdminAuditLog({ admin, action: "ADMIN_MARK_RECONNECT_REQUIRED", targetType: "INTEGRATION", targetId: integrationId, reason, status: "FAILED", error: "Integration not found." });
    return { status: 404 as const, data: "Integration not found." };
  }

  if (before.reconnectRequired) {
    await createAdminAuditLog({ admin, action: "ADMIN_MARK_RECONNECT_REQUIRED", targetType: "INTEGRATION", targetId: integrationId, targetLabel: before.instagramUsername ?? undefined, reason, before: { reconnectRequired: true }, status: "BLOCKED", error: "Already marked for reconnect." });
    return { status: 400 as const, data: "Account is already marked for reconnect." };
  }

  try {
    await client.integrations.update({
      where: { id: integrationId },
      data: { reconnectRequired: true, lastAdminNote: reason, lastAdminActionAt: new Date() },
    });
    await createAdminAuditLog({ admin, action: "ADMIN_MARK_RECONNECT_REQUIRED", targetType: "INTEGRATION", targetId: integrationId, targetLabel: before.instagramUsername ?? undefined, reason, before: { reconnectRequired: false }, after: { reconnectRequired: true }, status: "SUCCESS" });
    for (const path of V2_PATHS) revalidatePath(path);
    revalidatePath("/admin/users", "layout");
    return { status: 200 as const, data: "Account marked for reconnect." };
  } catch (error) {
    await createAdminAuditLog({ admin, action: "ADMIN_MARK_RECONNECT_REQUIRED", targetType: "INTEGRATION", targetId: integrationId, reason, status: "FAILED", error: safeError(error) });
    return { status: 500 as const, data: safeError(error) };
  }
}

// ---------------------------------------------------------------------------
// Action 3: Soft Disconnect
// Does NOT pause campaigns — that is a separate admin action.
// Requires typed confirmation: "DISCONNECT"
// ---------------------------------------------------------------------------
export async function adminSoftDisconnectAction(formData: FormData) {
  const integrationId = adminFormString(formData, "integrationId");
  const reason = adminFormString(formData, "reason");
  const confirmation = adminFormString(formData, "confirmation");

  if (reason.length < MIN_REASON) {
    return { status: 400 as const, data: "Reason must be at least 5 characters." };
  }
  if (confirmation !== "DISCONNECT") {
    return { status: 400 as const, data: "Type DISCONNECT to confirm this action." };
  }

  let admin: Awaited<ReturnType<typeof requireAdminAction>>;
  try {
    admin = await requireAdminAction();
  } catch {
    return { status: 403 as const, data: "Unauthorized." };
  }

  const before = await client.integrations.findUnique({
    where: { id: integrationId },
    select: { id: true, instagramUsername: true, status: true, reconnectRequired: true },
  });

  if (!before) {
    await createAdminAuditLog({ admin, action: "ADMIN_SOFT_DISCONNECT_ACCOUNT", targetType: "INTEGRATION", targetId: integrationId, reason, status: "FAILED", error: "Integration not found." });
    return { status: 404 as const, data: "Integration not found." };
  }

  if (before.status === "DISCONNECTED") {
    await createAdminAuditLog({ admin, action: "ADMIN_SOFT_DISCONNECT_ACCOUNT", targetType: "INTEGRATION", targetId: integrationId, targetLabel: before.instagramUsername ?? undefined, reason, before: { status: before.status }, status: "BLOCKED", error: "Already disconnected." });
    return { status: 400 as const, data: "Account is already disconnected." };
  }

  try {
    await client.integrations.update({
      where: { id: integrationId },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: new Date(),
        disconnectedReason: reason,
        lastAdminNote: reason,
        lastAdminActionAt: new Date(),
      },
    });
    await createAdminAuditLog({ admin, action: "ADMIN_SOFT_DISCONNECT_ACCOUNT", targetType: "INTEGRATION", targetId: integrationId, targetLabel: before.instagramUsername ?? undefined, reason, confirmation, before: { status: before.status, reconnectRequired: before.reconnectRequired }, after: { status: "DISCONNECTED" }, status: "SUCCESS" });
    for (const path of V2_PATHS) revalidatePath(path);
    revalidatePath("/admin/users", "layout");
    return { status: 200 as const, data: "Account soft disconnected." };
  } catch (error) {
    await createAdminAuditLog({ admin, action: "ADMIN_SOFT_DISCONNECT_ACCOUNT", targetType: "INTEGRATION", targetId: integrationId, reason, status: "FAILED", error: safeError(error) });
    return { status: 500 as const, data: safeError(error) };
  }
}

// ---------------------------------------------------------------------------
// Action 4: Pause All Campaigns for Account
// Sets active=false, needsReview=true on all active non-archived Automations
// for the account owner. Mirrors field pattern in softDisconnectIntegrationForUser
// (actions/integration/queries.ts:146) but as an explicit separate admin action.
// ---------------------------------------------------------------------------
export async function adminPauseCampaignsForAccountAction(formData: FormData) {
  const integrationId = adminFormString(formData, "integrationId");
  const reason = adminFormString(formData, "reason");
  const confirmation = adminFormString(formData, "confirmation");

  if (reason.length < MIN_REASON) {
    return { status: 400 as const, data: "Reason must be at least 5 characters." };
  }

  let admin: Awaited<ReturnType<typeof requireAdminAction>>;
  try {
    admin = await requireAdminAction();
  } catch {
    return { status: 403 as const, data: "Unauthorized." };
  }

  if (confirmation !== "PAUSE") {
    await createAdminAuditLog({ admin, action: "ADMIN_PAUSE_ACCOUNT_CAMPAIGNS", targetType: "INTEGRATION", targetId: integrationId, reason, confirmation, status: "BLOCKED", error: "Typed confirmation mismatch. Expected PAUSE." });
    return { status: 400 as const, data: "Type PAUSE to confirm this action." };
  }

  const row = await client.integrations.findUnique({
    where: { id: integrationId },
    select: { id: true, instagramUsername: true, userId: true },
  });

  if (!row) {
    await createAdminAuditLog({ admin, action: "ADMIN_PAUSE_ACCOUNT_CAMPAIGNS", targetType: "INTEGRATION", targetId: integrationId, reason, status: "FAILED", error: "Integration not found." });
    return { status: 404 as const, data: "Integration not found." };
  }

  if (!row.userId) {
    await createAdminAuditLog({ admin, action: "ADMIN_PAUSE_ACCOUNT_CAMPAIGNS", targetType: "INTEGRATION", targetId: integrationId, reason, status: "FAILED", error: "Integration has no owner." });
    return { status: 400 as const, data: "Integration has no owner user." };
  }

  try {
    const result = await client.automation.updateMany({
      where: { userId: row.userId, integrationId, active: true, archivedAt: null },
      data: { active: false, needsReview: true, reviewReason: `Admin paused: ${reason}` },
    });

    if (result.count === 0) {
      await createAdminAuditLog({ admin, action: "ADMIN_PAUSE_ACCOUNT_CAMPAIGNS", targetType: "INTEGRATION", targetId: integrationId, targetLabel: row.instagramUsername ?? undefined, reason, status: "BLOCKED", error: "No active campaigns to pause." });
      return { status: 400 as const, data: "No active campaigns found for this account." };
    }

    await client.integrations.update({
      where: { id: integrationId },
      data: { lastAdminNote: reason, lastAdminActionAt: new Date() },
    });

    await createAdminAuditLog({ admin, action: "ADMIN_PAUSE_ACCOUNT_CAMPAIGNS", targetType: "INTEGRATION", targetId: integrationId, targetLabel: row.instagramUsername ?? undefined, reason, after: { pausedCount: result.count }, status: "SUCCESS" });
    for (const path of V2_PATHS) revalidatePath(path);
    revalidatePath("/admin/users", "layout");
    return { status: 200 as const, data: `${result.count} campaign(s) paused.` };
  } catch (error) {
    await createAdminAuditLog({ admin, action: "ADMIN_PAUSE_ACCOUNT_CAMPAIGNS", targetType: "INTEGRATION", targetId: integrationId, reason, status: "FAILED", error: safeError(error) });
    return { status: 500 as const, data: safeError(error) };
  }
}
