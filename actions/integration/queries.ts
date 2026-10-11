import "server-only";

import { syncInstagramAccountEntitlements } from "@/lib/instagram-account-entitlements";
import { MULTI_ACCOUNT_CONNECTIONS_ENABLED } from "@/lib/instagram-account-rollout";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { getPlanLimits, isUnlimited } from "@/lib/plan-limits";
import { client } from "@/lib/prisma";
import { getIntegrationHealth, REAL_COMMENT_WEBHOOK_TYPES } from "@/lib/dashboard-metrics";
import { getCanonicalInstagramIntegration, isCanonicalInstagramConnected } from "@/lib/instagram-integration-status";
import { activateConnectionBenefits } from "@/lib/referral-program";
import { resolveIntegrationSendToken } from "@/lib/send-token";
import {
  classifyInstagramIntegrationSaveError,
  InstagramIntegrationSaveError,
} from "@/lib/instagram-integration-save-errors";

const META_OAUTH_STATE_MARKER = "META_OAUTH_STATE";

function isMetaOAuthStatePayload(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as { kind?: unknown }).kind === META_OAUTH_STATE_MARKER
  );
}

export const updateIntegration = async (
  token: string,
  expire: Date,
  id: string,
  instagramId?: string,
  instagramUsername?: string,
  profilePictureUrl?: string,
  pageId?: string,
  pageName?: string,
  businessId?: string,
  metaAppScopedUserId?: string | null,
  igAccountSource?: string,
  resolutionDiagnostics?: unknown,
  subscription?: {
    statusCode?: number;
    subscribed: boolean;
    subscriptionMode?: string;
    error?: string;
    attemptedAt: Date;
  }
) => {
  if (typeof token !== "string" || token.trim().length < 20) {
    throw new Error("invalid_page_access_token");
  }

  const normalizedMetaAppScopedUserId =
    typeof metaAppScopedUserId === "string" && metaAppScopedUserId.trim()
      ? metaAppScopedUserId.trim()
      : undefined;

  return await client.integrations.update({
    where: { id },
    data: {
      token,
      expiresAt: expire,
      instagramId,
      webhookAccountId: pageId,
      pageId,
      pageName,
      businessId,
      ...(normalizedMetaAppScopedUserId
        ? { metaAppScopedUserId: normalizedMetaAppScopedUserId }
        : {}),
      instagramUsername,
      profilePictureUrl,
      igAccountSource,
      oauthResolutionDiagnostics: resolutionDiagnostics as any,
      webhookSubscriptionLastAttemptedAt: subscription?.attemptedAt,
      webhookSubscriptionStatusCode: subscription?.statusCode,
      webhookSubscriptionSubscribed: subscription?.subscribed,
      webhookSubscriptionMode: subscription?.subscriptionMode,
      webhookSubscriptionError: subscription?.error,
      oauthLastError: null,
      oauthLastErrorAt: null,
      oauthLastErrorSource: null,
      status: "CONNECTED",
      disconnectedAt: null,
      disconnectedReason: null,
      reconnectRequired: false,
      lastAdminNote: "instagram_connection_refreshed",
      lastAdminActionAt: new Date(),
    },
  });
};

export const getIntegrations = async (clerkId: string) => {
  return await client.user.findUnique({
    where: {
      clerkId,
    },
    select: {
      integrations: {
        where: {
          name: "INSTAGRAM",
        },
      },
    },
  });
};

export const recordIntegrationOAuthError = async (
  clerkId: string,
  error: string,
  source = "facebook_business_oauth",
  resolutionDiagnostics?: unknown
) => {
  const user = await client.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      integrations: {
        where: { name: "INSTAGRAM", id: await currentInstagramAccountId(clerkId) },
        take: 1,
        select: { id: true },
      },
    },
  });

  const integrationId = user?.integrations[0]?.id;
  if (!integrationId) return null;

  return await client.integrations.update({
    where: { id: integrationId },
    data: {
      oauthLastError: error,
      oauthLastErrorAt: new Date(),
      oauthLastErrorSource: source,
      oauthResolutionDiagnostics: resolutionDiagnostics as any,
    },
  });
};

export const softDisconnectIntegrationForUser = async (clerkId: string) => {
  const user = await client.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      subscription: { select: { plan: true } },
      integrations: {
        where: { name: "INSTAGRAM", id: await currentInstagramAccountId(clerkId) },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          pageId: true,
          instagramId: true,
          status: true,
          reconnectRequired: true,
          token: true,
        },
      },
    },
  });

  const integration = getCanonicalInstagramIntegration(user?.integrations);
  if (!user || !integration) return null;

  console.log("[oauth] soft disconnect instagram integration", {
    hasPageId: Boolean(integration.pageId),
    hasInstagramBusinessAccountId: Boolean(integration.instagramId),
  });

  const reason = "User disconnected Instagram from AP3K";
  const { updated, paused } = await client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
    const updated = await tx.integrations.update({
      where: { id: integration.id },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: new Date(),
        disconnectedReason: reason,
        reconnectRequired: false,
      },
      select: { id: true },
    });
    const paused = await tx.automation.updateMany({
      where: { userId: user.id, integrationId: integration.id, archivedAt: null, active: true },
      data: {
        active: false,
        needsReview: true,
        reviewReason: "Instagram account disconnected.",
      },
    });
    const currentSubscription = await tx.subscription.findUnique({ where: { userId: user.id }, select: { plan: true } });
      await syncInstagramAccountEntitlements(tx, user.id, currentSubscription?.plan ?? "FREE");
    return { updated, paused };
  });

  return { ...updated, pausedCampaigns: paused.count };
};

export const createMetaOAuthSelection = async (
  clerkId: string,
  accounts: unknown,
  expiresAt: Date
) => {
  const user = await client.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) throw new Error("user_not_found");

  await client.metaOAuthSelection.deleteMany({
    where: { userId: user.id },
  });

  return await client.metaOAuthSelection.create({
    data: {
      userId: user.id,
      accounts: accounts as any,
      expiresAt,
    },
    select: { id: true },
  });
};

export const createMetaOAuthState = async (
  workspaceClerkId: string,
  sessionClerkId: string,
  stateHash: string,
  expiresAt: Date
) => {
  const user = await client.user.findUnique({
    where: { clerkId: workspaceClerkId },
    select: { id: true },
  });
  if (!user) throw new Error("user_not_found");

  await client.metaOAuthSelection.deleteMany({
    where: {
      userId: user.id,
      OR: [
        { expiresAt: { lt: new Date() } },
        {
          accounts: {
            path: ["kind"],
            equals: META_OAUTH_STATE_MARKER,
          },
        },
      ],
    },
  });

  return await client.metaOAuthSelection.create({
    data: {
      userId: user.id,
      accounts: {
        kind: META_OAUTH_STATE_MARKER,
        stateHash,
        sessionClerkId,
        createdAt: new Date().toISOString(),
      } as any,
      expiresAt,
    },
    select: { id: true },
  });
};

export const consumeMetaOAuthState = async (
  workspaceClerkId: string,
  sessionClerkId: string,
  stateHash: string
) => {
  const user = await client.user.findUnique({
    where: { clerkId: workspaceClerkId },
    select: { id: true },
  });
  if (!user) return false;

  const consumed = await client.metaOAuthSelection.deleteMany({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
      AND: [
        {
          accounts: {
            path: ["kind"],
            equals: META_OAUTH_STATE_MARKER,
          },
        },
        {
          accounts: {
            path: ["stateHash"],
            equals: stateHash,
          },
        },
        {
          accounts: {
            path: ["sessionClerkId"],
            equals: sessionClerkId,
          },
        },
      ],
    },
  });

  return consumed.count === 1;
};

export const getLatestMetaOAuthSelection = async (clerkId: string) => {
  const user = await client.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) return null;

  const selections = await client.metaOAuthSelection.findMany({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      accounts: true,
      expiresAt: true,
    },
  });

  return selections.find((selection) => !isMetaOAuthStatePayload(selection.accounts)) ?? null;
};

export const deleteMetaOAuthSelection = async (id: string) => {
  return await client.metaOAuthSelection.delete({
    where: { id },
    select: { id: true },
  });
};

export const createIntegration = async (
  clerkId: string,
  token: string,
  expire: Date,
  instagramId: string,
  instagramUsername?: string,
  profilePictureUrl?: string,
  pageId?: string,
  pageName?: string,
  businessId?: string,
  metaAppScopedUserId?: string | null,
  igAccountSource?: string,
  resolutionDiagnostics?: unknown,
  subscription?: {
    statusCode?: number;
    subscribed: boolean;
    subscriptionMode?: string;
    error?: string;
    attemptedAt: Date;
  }
) => {
  if (typeof token !== "string" || token.trim().length < 20) {
    throw new InstagramIntegrationSaveError("TOKEN_EXCHANGE_FAILED", "invalid_page_access_token");
  }

  const saved = await client.$transaction(async (tx) => {
    // Serialize account additions for this owner so concurrent OAuth callbacks
    // cannot consume the same remaining slot.
    const owners = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "User" WHERE "clerkId" = ${clerkId} FOR UPDATE`;
    const owner = owners[0];
    if (!owner) throw new InstagramIntegrationSaveError("MISSING_LOCAL_PROFILE", "user_not_found");
    const user = await tx.user.findUniqueOrThrow({ where: { id: owner.id }, include: { subscription: true, integrations: true } });
    const existing = user.integrations.find((account) => account.instagramId === instagramId);
    const duplicate = await tx.integrations.findUnique({ where: { instagramId }, select: { userId: true } });
    if (duplicate && duplicate.userId !== user.id) throw new InstagramIntegrationSaveError("DUPLICATE_INSTAGRAM_ACCOUNT", "instagram_account_already_connected");
    const limit = getPlanLimits(user.subscription?.plan).connectedInstagramAccounts;
    const used = user.integrations.filter((account) => account.name === "INSTAGRAM" && account.status !== "DISCONNECTED").length;
    if ((!existing || existing.status === "DISCONNECTED") && ((!isUnlimited(limit) && used >= limit) || (!MULTI_ACCOUNT_CONNECTIONS_ENABLED && used > 0))) {
      throw new InstagramIntegrationSaveError("PLAN_LIMIT_REACHED", "instagram_account_limit_reached");
    }
    if (existing?.planLocked && existing.status !== "DISCONNECTED") throw new InstagramIntegrationSaveError("PLAN_LIMIT_REACHED", "instagram_account_limit_reached");
    const data = {
      token, expiresAt: expire, instagramId, instagramUsername, profilePictureUrl,
      pageId, pageName, businessId, webhookAccountId: pageId,
      metaAppScopedUserId: metaAppScopedUserId || undefined, igAccountSource,
      oauthResolutionDiagnostics: resolutionDiagnostics as any,
      webhookSubscriptionLastAttemptedAt: subscription?.attemptedAt,
      webhookSubscriptionStatusCode: subscription?.statusCode,
      webhookSubscriptionSubscribed: subscription?.subscribed,
      webhookSubscriptionMode: subscription?.subscriptionMode,
      webhookSubscriptionError: subscription?.error,
      oauthLastError: null, oauthLastErrorAt: null, oauthLastErrorSource: null,
      status: "CONNECTED", reconnectRequired: false, planLocked: false,
      disconnectedAt: null, disconnectedReason: null,
    };
    const account = existing
      ? await tx.integrations.update({ where: { id: existing.id }, data })
      : await tx.integrations.create({ data: { ...data, userId: user.id } });
    // Users who prepared drafts before their first connection keep those drafts.
    // Never move existing account-owned data to a newly connected account.
    if (!user.integrations.length) {
      await tx.automation.updateMany({ where: { userId: user.id, integrationId: null }, data: { integrationId: account.id } });
      await tx.conversation.updateMany({ where: { userId: user.id, integrationId: null }, data: { integrationId: account.id } });
      await tx.aiChatMessage.updateMany({ where: { userId: user.id, integrationId: null, context: "PLAYGROUND" }, data: { integrationId: account.id } });

    }
    return { firstname: user.firstname, lastname: user.lastname, clerkId, integrationId: account.id, userId: user.id };
  }, { timeout: 20000 });
  try { await activateConnectionBenefits(saved.userId); } catch { console.warn("[referral] connection benefits deferred"); }
  return saved;
};


export const getWebhookHealthForUser = async (clerkId: string) => {
  const user = await client.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      integrations: {
        where: { name: "INSTAGRAM", id: await currentInstagramAccountId(clerkId) },
        take: 1,
        select: {
          token: true,
          instagramId: true,
          pageId: true,
          webhookAccountId: true,
          expiresAt: true,
          webhookSubscriptionLastAttemptedAt: true,
          webhookSubscriptionStatusCode: true,
          webhookSubscriptionSubscribed: true,
          webhookSubscriptionMode: true,
          webhookSubscriptionError: true,
        },
      },
    },
  });

  const userId = user?.id;
  const integration = user?.integrations[0];
  const pageId = integration?.pageId;
  const accountIds = [
    integration?.pageId,
    integration?.instagramId,
    integration?.webhookAccountId,
  ].filter(Boolean) as string[];
  const tokenExpired =
    integration?.expiresAt && integration.expiresAt.getTime() < Date.now();
  if (!pageId || !userId) {
    return {
      lastWebhook: null,
      lastCommentWebhook: null,
      lastFailure: null,
      oauth: {
        tokenPresent: Boolean(integration?.token),
        tokenExpired: Boolean(tokenExpired),
      },
    };
  }

  const [lastWebhook, lastCommentWebhook, lastFailure, dashboardHealth] = await Promise.all([
    client.webhookEvent.findFirst({
      where: {
        OR: [
          { automation: { userId } },
          ...(accountIds.length > 0 ? [{ igAccountId: { in: accountIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        eventType: true,
        status: true,
        field: true,
        errorMessage: true,
        createdAt: true,
      },
    }),
    client.webhookEvent.findFirst({
      where: {
        eventType: { in: [...REAL_COMMENT_WEBHOOK_TYPES] },
        OR: [
          { automation: { userId } },
          ...(accountIds.length > 0 ? [{ igAccountId: { in: accountIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        eventType: true,
        status: true,
        field: true,
        errorMessage: true,
        createdAt: true,
      },
    }),
    client.webhookEvent.findFirst({
      where: {
        AND: [
          {
            OR: [
              { automation: { userId } },
              ...(accountIds.length > 0 ? [{ igAccountId: { in: accountIds } }] : []),
            ],
          },
          {
            OR: [
              { status: "FAILED" },
              { eventType: { in: ["SIGNATURE_FAILED", "SIGNATURE_VERIFICATION_FAILED"] } },
              { errorMessage: { not: null } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        eventType: true,
        status: true,
        field: true,
        errorMessage: true,
        createdAt: true,
      },
    }),
    getIntegrationHealth(userId),
  ]);

  const tokenResolution = resolveIntegrationSendToken(integration);
  return {
    lastWebhook,
    lastCommentWebhook: lastCommentWebhook ?? dashboardHealth.lastRealComment,
    lastFailure,
    subscription: {
      lastAttemptedAt: integration?.webhookSubscriptionLastAttemptedAt ?? null,
      statusCode: integration?.webhookSubscriptionStatusCode ?? null,
      subscribed: integration?.webhookSubscriptionSubscribed ?? null,
      subscriptionMode: integration?.webhookSubscriptionMode ?? null,
      error: integration?.webhookSubscriptionError ?? null,
    },
    oauth: {
      tokenPresent: Boolean(integration?.token),
      tokenExpired: Boolean(tokenExpired),
      tokenFormatValid: tokenResolution.ok,
      tokenSource: tokenResolution.ok ? tokenResolution.source : null,
      tokenUsable: tokenResolution.ok && !tokenExpired,
      reconnectRequired: !tokenResolution.ok,
    },
  };
};
