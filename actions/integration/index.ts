"use server";

import {
  formatSafeMetaError,
  generateToken,
  debugPageToken,
  getEligibleFacebookInstagramAccounts,
  getMetaAppScopedUserId,
  getRecentFacebookPagePosts,
  getSafeMetaError,
  subscribeInstagramWebhooks,
  type EligibleInstagramAccount,
} from "@/lib/fetch";
import {
  exchangeInstagramLoginCode,
  formatInstagramLoginError,
  getInstagramBusinessOAuthScopes,
  getInstagramLoginOAuthUrl,
  getInstagramLoginProfile,
  isInstagramLoginEnabled,
  subscribeInstagramLoginWebhooks,
} from "@/lib/instagram-login";
import { refreshInstagramProfileSnapshotForUser } from "@/lib/instagram-profile-snapshot";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createIntegration,
  createMetaOAuthState,
  createMetaOAuthSelection,
  consumeMetaOAuthState,
  deleteMetaOAuthSelection,
  getLatestMetaOAuthSelection,
  getIntegrations,
  getWebhookHealthForUser,
  recordIntegrationOAuthError,
  softDisconnectIntegrationForUser,
  updateIntegration,
} from "./queries";
import { dashboardPath } from "@/lib/dashboard";
import { planReconnectCleanup } from "@/lib/account-webhook-diagnostics";
import { planReconnectCampaignImpact } from "@/lib/campaign-health";
import { client } from "@/lib/prisma";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { getCanonicalInstagramIntegration } from "@/lib/instagram-integration-status";
import {
  classifyInstagramIntegrationSaveError,
  instagramOAuthErrorParamForSaveFailure,
} from "@/lib/instagram-integration-save-errors";
import {
  isAppReviewMode,
  shouldShowMetaPageSelection,
} from "@/lib/app-review-mode";
import { getMetaBusinessOAuthScopes } from "@/lib/messaging-review-mode";
import { getCurrentWorkspaceClerkId } from "@/actions/user";
import {
  generateMetaOAuthState,
  hashMetaOAuthState,
  META_OAUTH_STATE_TTL_MS,
  normalizeMetaOAuthState,
} from "@/lib/meta-oauth-state";
import { INSTAGRAM_WEBHOOK_FIELDS_CSV } from "@/lib/instagram-webhook-subscriptions";
import { notifyInstagramConnectedEmail } from "@/lib/email/events";

const FACEBOOK_BUSINESS_OAUTH_URL = "https://www.facebook.com/v25.0/dialog/oauth";

async function attemptWebhookSubscription(pageId: string, pageToken: string) {
  const attemptedAt = new Date();
  const requestedFields = INSTAGRAM_WEBHOOK_FIELDS_CSV;
  try {
    const subscription = await subscribeInstagramWebhooks(pageId, pageToken);
    const subscribed = subscription.status >= 200 && subscription.status < 300;
    const subscriptionMode = subscribed ? "API_SUBSCRIBED" : "FAILED";
    console.log("[oauth] page webhook subscription result", {
      endpointFamily: "facebook_graph_page",
      pageIdPresent: Boolean(pageId),
      subscribed,
      subscriptionMode,
      status: subscription.status,
      requestedFields,
    });
    return {
      statusCode: subscription.status,
      subscribed,
      subscriptionMode,
      attemptedAt,
      requestedFields,
      result: subscribed ? "success" : `failed with status ${subscription.status}`,
    };
  } catch (error) {
    const metaError = getSafeMetaError(error);
    const safe = formatSafeMetaError(error);
    const isMetaDashboardManaged =
      typeof metaError.message === "string" &&
      metaError.message.includes("pages_manage_metadata");
    const subscriptionMode = isMetaDashboardManaged ? "META_DASHBOARD_MANAGED" : "FAILED";

    // Summarize unsupported field errors specifically
    const errorMessage = typeof metaError.message === "string" ? metaError.message : "";
    const unsupportedFields = errorMessage.includes("unsupported") ? "Subscription failed: one or more requested fields (comments, messages, messaging postbacks) may not be supported for this account or app level." : undefined;

    console.warn("[oauth] page webhook subscription failed", {
      endpointFamily: "facebook_graph_page",
      pageIdPresent: Boolean(pageId),
      subscribed: false,
      subscriptionMode,
      error: metaError,
      requestedFields,
    });
    return {
      statusCode: metaError.status,
      subscribed: false,
      subscriptionMode,
      error: unsupportedFields || safe || "page_subscribed_apps_failed",
      attemptedAt,
      requestedFields,
    };
  }
}

async function attemptInstagramLoginWebhookSubscription(instagramUserId: string, instagramUserToken: string) {
  const attemptedAt = new Date();
  const requestedFields = INSTAGRAM_WEBHOOK_FIELDS_CSV;
  try {
    const subscription = await subscribeInstagramLoginWebhooks(instagramUserId, instagramUserToken, requestedFields);
    const subscribed = subscription.status >= 200 && subscription.status < 300;
    const subscriptionMode = subscribed ? "INSTAGRAM_LOGIN_API_SUBSCRIBED" : "FAILED";
    console.log("[instagram-login] webhook subscription result", {
      endpointFamily: "instagram_graph",
      instagramUserIdPresent: Boolean(instagramUserId),
      subscribed,
      subscriptionMode,
      status: subscription.status,
      requestedFields,
    });
    return {
      statusCode: subscription.status,
      subscribed,
      subscriptionMode,
      attemptedAt,
      requestedFields,
      result: subscribed ? "success" : `failed with status ${subscription.status}`,
    };
  } catch (error) {
    const metaError = getSafeMetaError(error);
    const safe = formatInstagramLoginError(error);
    console.warn("[instagram-login] webhook subscription failed", {
      endpointFamily: "instagram_graph",
      instagramUserIdPresent: Boolean(instagramUserId),
      subscribed: false,
      error: metaError,
      requestedFields,
    });
    return {
      statusCode: metaError.status,
      subscribed: false,
      subscriptionMode: "FAILED",
      error: safe || "instagram_login_subscribed_apps_failed",
      attemptedAt,
      requestedFields,
    };
  }
}

async function applyReconnectCampaignImpact(input: {
  clerkId: string;
  previousInstagramId?: string | null;
  previousUsername?: string | null;
  nextInstagramId?: string | null;
  nextUsername?: string | null;
}) {
  // A different Instagram identity is a new account, never a replacement.
  // Reconnecting the same identity leaves its campaigns attached and unchanged.
  return null;
}

function getOAuthClientId() {
  if (isInstagramLoginEnabled()) {
    const clientId = process.env.INSTAGRAM_APP_ID ?? process.env.META_APP_ID;
    return {
      clientId,
      source: process.env.INSTAGRAM_APP_ID ? "INSTAGRAM_APP_ID" as const : "META_APP_ID" as const,
    };
  }
  if (process.env.META_APP_ID) {
    return { clientId: process.env.META_APP_ID, source: "META_APP_ID" as const };
  }
  return { clientId: undefined, source: "missing" as const };
}

export async function getInstagramOAuthUrl() {
  const user = await currentUser();
  if (!user) throw new Error("auth_missing");

  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;
  const state = generateMetaOAuthState();
  await createMetaOAuthState(
    workspaceClerkId,
    user.id,
    hashMetaOAuthState(state),
    new Date(Date.now() + META_OAUTH_STATE_TTL_MS)
  );

  if (isInstagramLoginEnabled()) {
    return getInstagramLoginOAuthUrl(state);
  }

  const redirectUri =
    process.env.META_REDIRECT_URI ??
    (process.env.NEXT_PUBLIC_HOST_URL
      ? `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`
      : undefined);

  if (!redirectUri) throw new Error("META_REDIRECT_URI is not configured");

  const { clientId } = getOAuthClientId();
  if (!clientId) throw new Error("META_APP_ID is not configured");

  const requiredScopes = getMetaBusinessOAuthScopes();
  const url = new URL(FACEBOOK_BUSINESS_OAUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", requiredScopes.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("auth_type", "rerequest");
  url.searchParams.set("state", state);
  return url.toString();
}

export const onOathInstagram = async (strategy: "INSTAGRAM" | "CRM") => {
  if (strategy === "INSTAGRAM") {
    return redirect(await getInstagramOAuthUrl());
  }
};

export const getInstagramConnectUrl = async () => {
  try {
    const url = await getInstagramOAuthUrl();
    const { source } = getOAuthClientId();
    const instagramLogin = isInstagramLoginEnabled();
    const requestedScopes = instagramLogin
      ? getInstagramBusinessOAuthScopes()
      : getMetaBusinessOAuthScopes();
    console.log("[oauth] connect URL generated", {
      oauth_client_id_source: source,
      authProduct: instagramLogin ? "business_login_for_instagram" : "facebook_login_for_business",
      hasMetaAppId: Boolean(process.env.META_APP_ID),
      hasInstagramAppId: Boolean(process.env.INSTAGRAM_APP_ID),
      hasRedirectUri: Boolean(process.env.INSTAGRAM_REDIRECT_URI ?? process.env.META_REDIRECT_URI),
      endpoint: instagramLogin ? "instagram_oauth_authorize" : FACEBOOK_BUSINESS_OAUTH_URL,
      requestedScopes,
      scopeCount: requestedScopes.length,
      redirectIsProduction: (process.env.INSTAGRAM_REDIRECT_URI ?? process.env.META_REDIRECT_URI) === "https://ap3k.com/callback/instagram",
    });
    return { status: 200, url };
  } catch (error) {
    const { source } = getOAuthClientId();
    console.error("[oauth] failed to generate connect URL", {
      message: error instanceof Error ? error.message : String(error),
      oauth_client_id_source: source,
      authProduct: isInstagramLoginEnabled() ? "business_login_for_instagram" : "facebook_login_for_business",
      hasMetaAppId: Boolean(process.env.META_APP_ID),
      hasInstagramAppId: Boolean(process.env.INSTAGRAM_APP_ID),
      hasRedirectUri: Boolean(process.env.INSTAGRAM_REDIRECT_URI ?? process.env.META_REDIRECT_URI),
    });
    if (error instanceof Error && error.message === "auth_missing") {
      return { status: 401, error: "auth_missing" };
    }
    return { status: 500, error: "oauth_url_unavailable" };
  }
};

async function completeInstagramLoginIntegration(input: {
  code: string;
  workspaceClerkId: string;
  user: Awaited<ReturnType<typeof currentUser>>;
  existing: ReturnType<typeof getCanonicalInstagramIntegration>;
}) {
  const { code, workspaceClerkId, user, existing } = input;
  const tokenResult = await exchangeInstagramLoginCode(code);
  const instagramUserToken = tokenResult?.accessToken;

  if (!instagramUserToken || !tokenResult.userId) {
    await recordIntegrationOAuthError(workspaceClerkId, "token_exchange_failed", "instagram_login");
    return {
      status: 401,
      error: "token_exchange_failed",
      data: { firstname: user?.firstName, lastname: user?.lastName, clerkId: workspaceClerkId },
    };
  }

  console.log("[instagram-login] step token_exchange_success", {
    hasInstagramUserToken: true,
    hasInstagramUserId: true,
    permissions: tokenResult.permissions,
  });

  let profile = {
    id: tokenResult.userId,
    username: undefined as string | undefined,
    profilePictureUrl: undefined as string | undefined,
    accountType: undefined as string | undefined,
  };

  try {
    profile = await getInstagramLoginProfile(tokenResult.userId, instagramUserToken);
  } catch (error) {
    console.warn("[instagram-login] profile lookup failed; using token user_id", {
      error: getSafeMetaError(error),
    });
  }

  const subscriptionAttempt = await attemptInstagramLoginWebhookSubscription(
    profile.id,
    instagramUserToken
  );

  const expireDate = new Date(
    Date.now() + (tokenResult.expiresIn ?? 60 * 24 * 60 * 60) * 1000
  );

  const reconnectImpact = existing
    ? await applyReconnectCampaignImpact({
      clerkId: workspaceClerkId,
      previousInstagramId: existing.instagramId,
      previousUsername: existing.instagramUsername,
      nextInstagramId: profile.id,
      nextUsername: profile.username,
    })
    : null;

  const diagnostics = {
    loginType: "instagram_login",
    graphHost: "graph.instagram.com",
    requestedScopes: getInstagramBusinessOAuthScopes(),
    permissions: tokenResult.permissions,
    accountType: profile.accountType,
    pageSelectionSkipped: true,
  };

  const create = await createIntegration(
    workspaceClerkId,
    instagramUserToken,
    expireDate,
    profile.id,
    profile.username,
    profile.profilePictureUrl,
    profile.id,
    profile.username ? `@${profile.username}` : "Instagram professional account",
    profile.id,
    profile.id,
    "instagram_login",
    diagnostics,
    subscriptionAttempt
  );

  console.log("[instagram-login] integration save result", {
    integrationSaved: Boolean(create),
    updatingExistingIntegration: Boolean((create as any).integrationId),
    hasInstagramUserId: Boolean(profile.id),
    subscribed: subscriptionAttempt.subscribed,
  });

  try {
    const freshIntegrations = await getIntegrations(workspaceClerkId);
    const newIntegrationId = create.integrationId;
    if (newIntegrationId) {
      await refreshInstagramProfileSnapshotForUser(workspaceClerkId, newIntegrationId, {});
    }
  } catch {}

  await notifyInstagramConnectedEmail({
    clerkId: workspaceClerkId,
    instagramId: profile.id,
    instagramUsername: profile.username,
  });

  return { status: 200, data: { ...create, reconnectImpact } };
}

export const onIntegrate = async (code: string, state?: string | null) => {
  const user = await currentUser();
  const instagramLogin = isInstagramLoginEnabled();
  console.log("[oauth] callback received", {
    hasCode: Boolean(code),
    hasCurrentUser: Boolean(user),
    hasState: Boolean(state),
    authProduct: instagramLogin ? "business_login_for_instagram" : "facebook_login_for_business",
  });

  if (!user) {
    return { status: 401, error: "auth_missing" };
  }
  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;
  const normalizedState = normalizeMetaOAuthState(state);
  const oauthErrorSource = instagramLogin
    ? "instagram_login"
    : "facebook_business_oauth";

  if (!normalizedState) {
    await recordIntegrationOAuthError(workspaceClerkId, "oauth_state_missing_or_invalid", oauthErrorSource);
    return {
      status: 401,
      error: "oauth_state_missing_or_invalid",
      data: { firstname: user.firstName, lastname: user.lastName, clerkId: workspaceClerkId },
    };
  }

  const stateValid = await consumeMetaOAuthState(
    workspaceClerkId,
    user.id,
    hashMetaOAuthState(normalizedState)
  );
  if (!stateValid) {
    await recordIntegrationOAuthError(workspaceClerkId, "oauth_state_invalid_or_expired", oauthErrorSource);
    return {
      status: 401,
      error: "oauth_state_invalid_or_expired",
      data: { firstname: user.firstName, lastname: user.lastName, clerkId: workspaceClerkId },
    };
  }

  try {
    const integration = await getIntegrations(workspaceClerkId);
    const existing = getCanonicalInstagramIntegration(integration?.integrations);
    console.log("[oauth] step oauth_received", {
      hasCode: Boolean(code),
      hasExistingIntegration: Boolean(existing),
      instagramLogin,
    });

    if (instagramLogin) {
      return await completeInstagramLoginIntegration({ code, workspaceClerkId, user, existing });
    }

    const tokenResult = await generateToken(code);
    const userAccessToken = tokenResult?.accessToken;

    if (!userAccessToken) {
      await recordIntegrationOAuthError(workspaceClerkId, "token_exchange_failed");
      return {
        status: 401,
        error: "token_exchange_failed",
        data: { firstname: user.firstName, lastname: user.lastName, clerkId: workspaceClerkId },
      };
    }
    console.log("[oauth] step token_exchange_success", {
      hasUserAccessToken: true,
    });

    const metaAppScopedUserId = await getMetaAppScopedUserId(userAccessToken);
    console.log("[oauth] step app_scoped_user_lookup", {
      foundMetaAppScopedUserId: Boolean(metaAppScopedUserId),
    });

    let resolved: EligibleInstagramAccount;
    try {
      const resolution = await getEligibleFacebookInstagramAccounts(userAccessToken);
      const resolutionDiagnostics = {
        pagesReturned: resolution.pagesReturned,
        pageLookupAttempts: resolution.pageLookupAttempts,
        foundInstagramField: resolution.eligibleAccounts.length ? "found" : "none",
      };

      if (!resolution.eligibleAccounts.length) {
        const hasPageToken = resolution.pageLookupAttempts.some(
          (attempt) => attempt.hasPageAccessToken
        );
        const state = isAppReviewMode()
          ? "no_eligible_facebook_pages"
          : hasPageToken
            ? "ig_business_not_linked"
            : "page_token_missing";
        await recordIntegrationOAuthError(
          workspaceClerkId,
          state,
          "facebook_business_oauth",
          resolutionDiagnostics
        );
        console.warn("[oauth] step page_resolution_failed", {
          state,
          resolutionDiagnostics,
          message:
            "Facebook returned Pages, but Graph API did not expose instagram_business_account or connected_instagram_account. Check Page access tasks and advanced access.",
        });
        return {
          status: 401,
          error: state,
          data: { firstname: user.firstName, lastname: user.lastName, clerkId: workspaceClerkId },
        };
      }

      if (shouldShowMetaPageSelection(resolution.eligibleAccounts.length)) {
        const accountsWithMetaUser = resolution.eligibleAccounts.map((account) => ({
          ...account,
          metaAppScopedUserId,
        }));
        await createMetaOAuthSelection(
          workspaceClerkId,
          accountsWithMetaUser,
          new Date(Date.now() + 10 * 60 * 1000)
        );
        console.log("[oauth] step account_selection_required", {
          eligibleAccounts: resolution.eligibleAccounts.length,
        });
        return {
          status: 202,
          data: { firstname: user.firstName, lastname: user.lastName, clerkId: workspaceClerkId },
        };
      }

      resolved = resolution.eligibleAccounts[0];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const resolutionDiagnostics = (error as any)?.diagnostics;
      const state =
        message === "ig_business_not_linked" || message === "page_token_missing"
          ? message
          : "page_resolution_failed";
      await recordIntegrationOAuthError(workspaceClerkId, state, "facebook_business_oauth", resolutionDiagnostics);
      console.warn("[oauth] step page_resolution_failed", {
        state,
        resolutionDiagnostics,
        error: getSafeMetaError(error),
      });
      return {
        status: 401,
        error: state,
        data: { firstname: user.firstName, lastname: user.lastName, clerkId: workspaceClerkId },
      };
    }
    console.log("[oauth] step page_selected", {
      hasPageId: Boolean(resolved.pageId),
      hasPageAccessToken: Boolean(resolved.pageAccessToken),
    });
    console.log("[oauth] step ig_business_linked", {
      hasInstagramBusinessAccountId: Boolean(resolved.instagramBusinessAccountId),
      igAccountSource: resolved.igAccountSource,
    });

    try {
      const debug = await debugPageToken(resolved.pageAccessToken);
      const isValid = Boolean(debug.data?.data?.is_valid);
      console.log("[oauth] step page_token_validated", {
        tokenValid: isValid,
        tokenType: debug.data?.data?.type ?? "unknown",
      });
      if (!isValid) {
        await recordIntegrationOAuthError(workspaceClerkId, "page_token_missing");
        return {
          status: 401,
          error: "page_token_missing",
          data: { firstname: user.firstName, lastname: user.lastName, clerkId: workspaceClerkId },
        };
      }
    } catch (error) {
      await recordIntegrationOAuthError(workspaceClerkId, "page_token_missing");
      console.warn("[oauth] step page_token_validation_failed", {
        error: getSafeMetaError(error),
      });
      return {
        status: 401,
        error: "page_token_missing",
        data: { firstname: user.firstName, lastname: user.lastName, clerkId: workspaceClerkId },
      };
    }

    const subscriptionAttempt = await attemptWebhookSubscription(
      resolved.pageId,
      resolved.pageAccessToken
    );
    console.log("[oauth] step subscribed_apps_success", {
      subscribed: subscriptionAttempt.subscribed,
      statusCode: subscriptionAttempt.statusCode,
    });
    const today = new Date();
    const expireDate = today.setSeconds(
      today.getSeconds() + (tokenResult?.expiresIn ?? 60 * 24 * 60 * 60)
    );

    const reconnectImpact = existing
      ? await applyReconnectCampaignImpact({
        clerkId: workspaceClerkId,
        previousInstagramId: existing.instagramId,
        previousUsername: existing.instagramUsername,
        nextInstagramId: resolved.instagramBusinessAccountId,
        nextUsername: resolved.instagramUsername,
      })
      : null;

    const create = await createIntegration(
      workspaceClerkId,
      resolved.pageAccessToken,
      new Date(expireDate),
      resolved.instagramBusinessAccountId,
      resolved.instagramUsername,
      resolved.profilePictureUrl,
      resolved.pageId,
      resolved.pageName,
      resolved.instagramBusinessAccountId,
      metaAppScopedUserId,
      resolved.igAccountSource,
      resolved.diagnostics,
      subscriptionAttempt
    );
    console.log("[oauth] integration save result", {
      integrationSaved: Boolean(create),
      updatingExistingIntegration: Boolean((create as any).integrationId),
      hasPageId: Boolean(resolved.pageId),
      hasInstagramBusinessAccountId: Boolean(resolved.instagramBusinessAccountId),
    });

    // Seed initial profile snapshot for newly created integration (non-fatal)
    try {
      const freshIntegrations = await getIntegrations(workspaceClerkId);
      const newIntegrationId = create.integrationId;
      if (newIntegrationId) {
        await refreshInstagramProfileSnapshotForUser(workspaceClerkId, newIntegrationId, {});
      }
    } catch {}

    await notifyInstagramConnectedEmail({
      clerkId: workspaceClerkId,
      instagramId: resolved.instagramBusinessAccountId,
      instagramUsername: resolved.instagramUsername,
    });

    return { status: 200, data: { ...create, reconnectImpact } };
  } catch (error) {
    const saveFailure = classifyInstagramIntegrationSaveError(error);
    const errorParam = instagramOAuthErrorParamForSaveFailure(saveFailure);
    await recordIntegrationOAuthError(workspaceClerkId, errorParam);
    console.error("[oauth] onIntegrate error", {
      message: error instanceof Error ? error.message : String(error),
      saveFailure,
      integrationSaved: false,
    });
    return {
      status: 500,
      error: errorParam,
      data: { firstname: user.firstName, lastname: user.lastName, clerkId: workspaceClerkId },
    };
  }
};

export const resubscribeCurrentInstagramWebhooks = async () => {
  const user = await currentUser();
  if (!user) return { status: 401, data: "Sign in required" };
  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;

  try {
    const integration = await getIntegrations(workspaceClerkId);
    const selectedId = await currentInstagramAccountId(workspaceClerkId);
    const instagram = integration?.integrations.find((account) => account.id === selectedId);

    if (!instagram?.token || (!instagram.pageId && !instagram.instagramId)) {
      return { status: 404, data: "Connect Instagram before resubscribing webhooks" };
    }

    const isInstagramLoginConnection = instagram.igAccountSource === "instagram_login";
    const subscriptionAttempt = isInstagramLoginConnection
      ? await attemptInstagramLoginWebhookSubscription(instagram.instagramId ?? instagram.pageId!, instagram.token)
      : await attemptWebhookSubscription(instagram.pageId ?? instagram.instagramId!, instagram.token);

    await updateIntegration(
      instagram.token,
      instagram.expiresAt ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      instagram.id,
      instagram.instagramId ?? undefined,
      instagram.instagramUsername ?? undefined,
      instagram.profilePictureUrl ?? undefined,
      instagram.pageId ?? undefined,
      instagram.pageName ?? undefined,
      instagram.businessId ?? undefined,
      instagram.metaAppScopedUserId ?? undefined,
      instagram.igAccountSource ?? undefined,
      instagram.oauthResolutionDiagnostics ?? undefined,
      subscriptionAttempt
    );

    console.log("[webhook-subscription] manual resubscribe result", {
      endpointFamily: isInstagramLoginConnection ? "instagram_graph" : "facebook_graph_page",
      targetIdPresent: true,
      subscribed: subscriptionAttempt.subscribed,
      subscriptionMode: subscriptionAttempt.subscriptionMode,
      status: subscriptionAttempt.statusCode,
    });

    if (subscriptionAttempt.subscriptionMode === "META_DASHBOARD_MANAGED") {
      return {
        status: 200,
        data: "Meta dashboard subscription required — confirm the Webhook Subscription toggle is ON in Meta Developers for this Instagram account",
      };
    }
    if (subscriptionAttempt.subscribed) {
      return { status: 200, data: "Instagram webhook subscription refreshed for comments, messages, and button callbacks" };
    }
    return { status: 500, data: subscriptionAttempt.error || "Meta rejected the Instagram webhook subscription request" };
  } catch (error) {
    console.warn("[webhook-subscription] manual resubscribe failed", {
      error: getSafeMetaError(error),
    });
    return { status: 500, data: formatSafeMetaError(error) || "Meta rejected the Instagram webhook subscription request" };
  }
};

export const repairCurrentInstagramConnection = async () => {
  const user = await currentUser();
  if (!user) return { status: 401, data: "Sign in required" };
  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;

  const dbUser = await client.user.findUnique({
    where: { clerkId: workspaceClerkId },
    select: {
      id: true,
      integrations: {
        where: { name: "INSTAGRAM", id: await currentInstagramAccountId(workspaceClerkId) },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          instagramId: true,
          instagramUsername: true,
          webhookAccountId: true,
          pageId: true,
          businessId: true,
          status: true,
        },
      },
      automations: {
        where: { archivedAt: null, integrationId: await currentInstagramAccountId(workspaceClerkId) },
        select: {
          id: true,
          name: true,
          active: true,
          userId: true,
          posts: { select: { postid: true } },
          User: {
            select: {
              integrations: {
                where: { name: "INSTAGRAM", id: await currentInstagramAccountId(workspaceClerkId) },
                select: {
                  id: true,
                  userId: true,
                  instagramId: true,
                  instagramUsername: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const current = dbUser?.integrations.find((item) => item.status !== "DISCONNECTED") ?? dbUser?.integrations[0];
  if (!dbUser || !current) return { status: 404, data: "No Instagram account is connected" };

  const plan = planReconnectCleanup({
    current,
    integrations: dbUser.integrations,
    campaigns: dbUser.automations,
  });
  const reason = "Self-service Instagram connection repair";
  const [disabled, paused] = await client.$transaction([
    client.integrations.updateMany({
      where: { userId: dbUser.id, id: { in: plan.staleIntegrationIds } },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: new Date(),
        disconnectedReason: reason,
        reconnectRequired: true,
      },
    }),
    client.automation.updateMany({
      where: { userId: dbUser.id, id: { in: plan.shouldPauseCampaignIds } },
      data: { active: false },
    }),
    client.integrations.update({
      where: { id: current.id },
      data: {
        status: "CONNECTED",
        reconnectRequired: false,
        lastAdminNote: reason,
        lastAdminActionAt: new Date(),
      },
    }),
  ]);

  revalidatePath("/dashboard", "layout");
  return {
    status: 200,
    data: {
      oldIntegrationsDisabled: disabled.count,
      activeIntegrationId: current.id,
      activeCampaignsNeedingRecreation: plan.campaignsNeedingRecreation.map((campaign) => campaign.id),
      currentInstagramId: current.instagramId,
      pausedCampaigns: paused.count,
    },
  };
};

export const refreshInstagramProfileSnapshot = async (
  integrationId: string,
  options?: { force?: boolean }
) => {
  const user = await currentUser();
  if (!user) return { status: 401, data: null, cached: false, error: "Sign in required" };
  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;

  const result = await refreshInstagramProfileSnapshotForUser(workspaceClerkId, integrationId, options);
  if (!result.cached) {
    revalidatePath("/dashboard", "layout");
  }
  return result;
};

export const disconnectCurrentInstagramIntegration = async () => {
  const user = await currentUser();
  if (!user) return { status: 401, data: "Sign in required" };
  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;

  try {
    const disconnected = await softDisconnectIntegrationForUser(workspaceClerkId);
    if (!disconnected) {
      return { status: 404, data: "No Instagram account connected" };
    }

    revalidatePath("/dashboard", "layout");
    revalidatePath(`/dashboard/${workspaceClerkId}`);
    revalidatePath(`/dashboard/${workspaceClerkId}/account`);
    revalidatePath(`/dashboard/${workspaceClerkId}/integrations`);
    revalidatePath(`/dashboard/${workspaceClerkId}/automation`);
    revalidatePath(`/dashboard/${workspaceClerkId}/automation`, "layout");
    revalidatePath("/onboarding/connect");
    return { status: 200, data: "Instagram account disconnected" };
  } catch (error) {
    console.error("[oauth] disconnect instagram integration failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { status: 500, data: "Instagram connection could not be removed. Please try again." };
  }
};

export const getPendingInstagramAccountSelections = async () => {
  const user = await currentUser();
  if (!user) return { status: 401, data: [] };
  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;

  const selection = await getLatestMetaOAuthSelection(workspaceClerkId);
  const accounts = Array.isArray(selection?.accounts) ? selection.accounts : [];

  return {
    status: 200,
    data: accounts.map((account: any) => ({
      pageId: String(account.pageId ?? ""),
      pageName: account.pageName as string | undefined,
      instagramBusinessAccountId: String(account.instagramBusinessAccountId ?? ""),
      instagramUsername: account.instagramUsername as string | undefined,
      profilePictureUrl: account.profilePictureUrl as string | undefined,
      metaAppScopedUserId: account.metaAppScopedUserId as string | null | undefined,
      igAccountSource: account.igAccountSource as string | undefined,
      tasks: Array.isArray(account.tasks) ? account.tasks.map(String) : [],
    })),
  };
};

export const getRecentSelectedFacebookPageContent = async () => {
  const user = await currentUser();
  if (!user) {
    return {
      status: 401,
      data: null,
      error: "Sign in required.",
    };
  }
  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;

  const integrations = await getIntegrations(workspaceClerkId);
  const selectedId = await currentInstagramAccountId(workspaceClerkId);
  const integration = getCanonicalInstagramIntegration(integrations?.integrations.filter((account) => account.id === selectedId));
  const pageId = integration?.pageId ?? null;
  const pageName = integration?.pageName ?? null;

  if (!integration?.token || !pageId || integration.igAccountSource === "instagram_login") {
    return {
      status: 404,
      data: {
        pageId,
        pageName,
        posts: [],
      },
      error: "Recent Facebook Page content is only available for legacy Facebook Login connections.",
    };
  }

  try {
    const posts = await getRecentFacebookPagePosts(pageId, integration.token);
    return {
      status: 200,
      data: {
        pageId,
        pageName,
        posts,
      },
      error: null,
    };
  } catch (error) {
    const safe = getSafeMetaError(error);
    console.warn("[meta-review] recent Page content retrieval failed", {
      pageId,
      status: safe.status,
      code: safe.code,
      subcode: safe.subcode,
    });
    return {
      status: safe.status ?? 502,
      data: {
        pageId,
        pageName,
        posts: [],
      },
      error:
        "Meta could not return recent Page posts. Confirm pages_read_engagement is granted for this Facebook Page.",
    };
  }
};

export const selectPendingInstagramAccount = async (formData: FormData) => {
  const user = await currentUser();
  if (!user) return redirect("/sign-in");
  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;

  const pageId = String(formData.get("pageId") ?? "").trim();
  const selection = await getLatestMetaOAuthSelection(workspaceClerkId);
  const accounts = Array.isArray(selection?.accounts)
    ? (selection.accounts as unknown as EligibleInstagramAccount[])
    : [];
  const selected = accounts.find((account) => account.pageId === pageId);

  if (!selection || !selected) {
    return redirect(`${dashboardPath(workspaceClerkId)}/integrations?integration_error=page_resolution_failed`);
  }

  // redirect() throws NEXT_REDIRECT internally — if called inside a try block the
  // catch misclassifies it as database_save_failed and then redirects to the error
  // page even though the save succeeded. Track the error outside and redirect after.
  let selectedIntegrationId: string | undefined;
  let integrationError: string | null = null;

  try {
    const debug = await debugPageToken(selected.pageAccessToken);
    const isValid = Boolean(debug.data?.data?.is_valid);
    if (!isValid) {
      await recordIntegrationOAuthError(workspaceClerkId, "page_token_missing");
      integrationError = "page_token_missing";
    } else {
      const subscriptionAttempt = await attemptWebhookSubscription(
        selected.pageId,
        selected.pageAccessToken
      );
      const integration = await getIntegrations(workspaceClerkId);
      const existing = getCanonicalInstagramIntegration(integration?.integrations);
      const expireDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      if (existing) {
        await applyReconnectCampaignImpact({
          clerkId: workspaceClerkId,
          previousInstagramId: existing.instagramId,
          previousUsername: existing.instagramUsername,
          nextInstagramId: selected.instagramBusinessAccountId,
          nextUsername: selected.instagramUsername,
        });
      }

      const savedIntegration = await createIntegration(
        workspaceClerkId,
        selected.pageAccessToken,
        expireDate,
        selected.instagramBusinessAccountId,
        selected.instagramUsername,
        selected.profilePictureUrl,
        selected.pageId,
        selected.pageName,
        selected.instagramBusinessAccountId,
        selected.metaAppScopedUserId,
        selected.igAccountSource,
        selected.diagnostics,
        subscriptionAttempt
      );

      selectedIntegrationId = savedIntegration.integrationId;

      // Non-fatal cleanup — must not be able to poison the success path
      try {
        await deleteMetaOAuthSelection(selection.id);
      } catch (cleanupErr) {
        console.warn("[oauth] metaOAuthSelection cleanup failed (non-fatal)", {
          selectionId: selection.id,
          error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
        });
      }

      console.log("[oauth] step selected_account_saved", {
        selectedPageId: selected.pageId,
        selectedPageName: selected.pageName,
        selectedInstagramUsername: selected.instagramUsername,
        igAccountSource: selected.igAccountSource,
        subscribed: subscriptionAttempt.subscribed,
      });

      await notifyInstagramConnectedEmail({
        clerkId: workspaceClerkId,
        instagramId: selected.instagramBusinessAccountId,
        instagramUsername: selected.instagramUsername,
      });
    }
  } catch (error) {
    const saveFailure = classifyInstagramIntegrationSaveError(error);
    const errorParam = instagramOAuthErrorParamForSaveFailure(saveFailure);
    console.error("[oauth] selected account save failed", {
      error: getSafeMetaError(error),
      saveFailure,
    });
    await recordIntegrationOAuthError(workspaceClerkId, errorParam);
    integrationError = errorParam;
  }

  // redirect() is outside the try/catch so Next.js handles NEXT_REDIRECT correctly
  if (integrationError) {
    return redirect(`${dashboardPath(workspaceClerkId)}/integrations?integration_error=${integrationError}`);
  }
  if (selectedIntegrationId) return redirect(`/api/instagram/selected?integrationId=${encodeURIComponent(selectedIntegrationId)}`);
  return redirect(dashboardPath(workspaceClerkId));
};

export const getCurrentWebhookHealth = async () => {
  const user = await currentUser();
  if (!user) return { status: 401, data: null };
  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;

  try {
    return { status: 200, data: await getWebhookHealthForUser(workspaceClerkId) };
  } catch {
    return { status: 500, data: null };
  }
};

export const recordInstagramOAuthError = async (error: string) => {
  const user = await currentUser();
  if (!user) return { status: 401 };
  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? user.id;

  try {
    await recordIntegrationOAuthError(workspaceClerkId, error, isInstagramLoginEnabled() ? "instagram_login" : "facebook_business_oauth");
    return { status: 200, data: { clerkId: workspaceClerkId } };
  } catch {
    return { status: 500, data: { clerkId: workspaceClerkId } };
  }
};
