import axios from "axios";
import {
  getLinkedInstagramBusinessAccount,
  getPageTokenPermissions,
  getPageWebhookSubscriptions,
  META_GRAPH_API_BASE_URL,
} from "@/lib/fetch";
import { getMetaBusinessOAuthScopes } from "@/lib/messaging-review-mode";

const REJECTED_INCOMPATIBLE_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
];

type SafeCall<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status?: number; error: string; code?: number; type?: string };

function safeMetaError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const metaError = error.response?.data?.error;
    return {
      status: error.response?.status,
      error: metaError?.message ?? error.message,
      code: metaError?.code,
      type: metaError?.type,
    };
  }

  return { error: error instanceof Error ? error.message : String(error) };
}

async function safeCall<T>(operation: () => Promise<{ status: number; data: T }>): Promise<SafeCall<T>> {
  try {
    const response = await operation();
    return { ok: true, status: response.status, data: response.data };
  } catch (error) {
    return { ok: false, ...safeMetaError(error) };
  }
}

export function getCanonicalMetaConfig() {
  const redirectUri =
    process.env.META_REDIRECT_URI ??
    (process.env.NEXT_PUBLIC_HOST_URL
      ? `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`
      : undefined);

  return {
    product: "facebook_login_for_business" as const,
    appId: process.env.META_APP_ID,
    appIdSource: process.env.META_APP_ID ? "META_APP_ID" : "none",
    appSecret: process.env.META_APP_SECRET,
    appSecretSource: process.env.META_APP_SECRET ? "META_APP_SECRET" : "none",
    redirectUri,
    oauthAuthorizeEndpoint: "https://www.facebook.com/v25.0/dialog/oauth",
    requestedScopes: getMetaBusinessOAuthScopes(),
    rejectedScopes: REJECTED_INCOMPATIBLE_SCOPES,
    tokenEndpoint: `${META_GRAPH_API_BASE_URL}/oauth/access_token`,
    apiEndpointFamily: "facebook_graph_instagram_business",
    webhookSubscriptionEndpointFamily: "facebook_graph_page",
  };
}

function buildAppAccessToken(appId?: string, appSecret?: string) {
  if (!appId || !appSecret) return null;
  return `${appId}|${appSecret}`;
}

function sanitizeDebugToken(data: any) {
  if (!data?.data) return null;
  const debug = data.data;
  return {
    app_id: debug.app_id,
    type: debug.type,
    application: debug.application,
    expires_at: debug.expires_at,
    is_valid: debug.is_valid,
    issued_at: debug.issued_at,
    scopes: Array.isArray(debug.scopes) ? debug.scopes : [],
    user_id: debug.user_id,
  };
}

function tokenLooksPresent(value?: string | null) {
  return typeof value === "string" && value.trim().length > 20;
}

export async function getMetaTokenHealth(input: {
  pageAccessToken?: string | null;
  pageId?: string | null;
  instagramBusinessAccountId?: string | null;
}) {
  const config = getCanonicalMetaConfig();
  const requestedScopes = config.requestedScopes;
  const appAccessToken = buildAppAccessToken(config.appId, config.appSecret);

  if (!tokenLooksPresent(input.pageAccessToken)) {
    return {
      config,
      tokenValid: false,
      graphValidationResult: "missing_page_access_token",
      debugToken: null,
      tokenAppId: null,
      tokenType: "unknown",
      tokenScopes: [] as string[],
      issuedByApp: null,
      tokenBelongsToCurrentApp: false,
      requiredScopesPresent: false,
      missingScopes: requestedScopes,
      linkedInstagramBusinessAccount: null,
      igAccountLinked: false,
      subscribedAppsEligible: false,
      subscribedAppsActive: false,
      commentsSubscribed: false,
      messagesSubscribed: false,
      messagingPostbacksSubscribed: false,
      diagnostics: ["missing_page_access_token"],
    };
  }

  const [debugTokenCall, permissionsCall, linkedIgCall, subscribedAppsCall] =
    await Promise.all([
      appAccessToken
        ? safeCall(() =>
            axios.get(`${META_GRAPH_API_BASE_URL}/debug_token`, {
              params: {
                input_token: input.pageAccessToken,
                access_token: appAccessToken,
              },
            })
          )
        : Promise.resolve({ ok: false as const, error: "missing_app_access_token" }),
      safeCall(() => getPageTokenPermissions(input.pageAccessToken!)),
      input.pageId
        ? safeCall(() => getLinkedInstagramBusinessAccount(input.pageId!, input.pageAccessToken!))
        : Promise.resolve({ ok: false as const, error: "missing_page_id" }),
      input.pageId
        ? safeCall(() => getPageWebhookSubscriptions(input.pageId!, input.pageAccessToken!))
        : Promise.resolve({ ok: false as const, error: "missing_page_id" }),
    ]);

  const debugToken = debugTokenCall.ok ? sanitizeDebugToken(debugTokenCall.data) : null;
  const tokenScopes =
    permissionsCall.ok && Array.isArray((permissionsCall.data as any)?.data)
      ? (permissionsCall.data as any).data
          .filter((item: any) => item.status === "granted")
          .map((item: any) => item.permission)
          .filter(Boolean)
      : debugToken?.scopes ?? [];
  const missingScopes = requestedScopes.filter((scope) => !tokenScopes.includes(scope));
  const linkedInstagramBusinessAccount = linkedIgCall.ok
    ? (linkedIgCall.data as any)?.instagram_business_account ?? null
    : null;
  const subscribedData =
    subscribedAppsCall.ok && Array.isArray((subscribedAppsCall.data as any)?.data)
      ? (subscribedAppsCall.data as any).data
      : [];
  const subscribedFields = new Set<string>(
    subscribedData.flatMap((item: any) =>
      Array.isArray(item.subscribed_fields) ? item.subscribed_fields : []
    )
  );

  const diagnostics: string[] = [];
  if (!debugTokenCall.ok) diagnostics.push("debug_token_failed");
  if (debugToken?.app_id && config.appId && debugToken.app_id !== config.appId) {
    diagnostics.push("token_issued_by_wrong_app");
  }
  if (!permissionsCall.ok) diagnostics.push("token_scopes_unavailable");
  if (missingScopes.length > 0) diagnostics.push("missing_required_scopes");
  if (!linkedIgCall.ok || !linkedInstagramBusinessAccount?.id) {
    diagnostics.push("linked_instagram_business_account_missing");
  }
  if (
    linkedInstagramBusinessAccount?.id &&
    input.instagramBusinessAccountId &&
    linkedInstagramBusinessAccount.id !== input.instagramBusinessAccountId
  ) {
    diagnostics.push("linked_instagram_business_account_mismatch");
  }
  if (!subscribedAppsCall.ok) diagnostics.push("page_subscribed_apps_failed");
  if (subscribedAppsCall.ok && !subscribedFields.has("comments")) {
    diagnostics.push("comments_not_subscribed");
  }
  if (subscribedAppsCall.ok && !subscribedFields.has("messages")) {
    diagnostics.push("messages_not_subscribed");
  }
  if (subscribedAppsCall.ok && !subscribedFields.has("messaging_postbacks")) {
    diagnostics.push("messaging_postbacks_not_subscribed");
  }

  return {
    config,
    tokenValid: Boolean(debugToken?.is_valid),
    graphValidationResult: debugToken?.is_valid ? "debug_token_valid" : debugTokenCall.ok ? "debug_token_invalid" : debugTokenCall.error,
    debugToken,
    debugTokenStatus: debugTokenCall.ok ? "ok" : debugTokenCall.error,
    tokenAppId: debugToken?.app_id ?? null,
    tokenType: debugToken?.type ?? "page_access_token_or_unknown",
    tokenScopes,
    issuedByApp: debugToken?.application ?? null,
    tokenBelongsToCurrentApp: Boolean(
      debugToken?.app_id && config.appId && debugToken.app_id === config.appId
    ),
    requiredScopesPresent: missingScopes.length === 0,
    missingScopes,
    linkedInstagramBusinessAccount,
    igAccountLinked: Boolean(linkedInstagramBusinessAccount?.id),
    subscribedAppsEligible: Boolean(debugToken?.is_valid && input.pageId),
    subscribedAppsActive: subscribedData.length > 0,
    commentsSubscribed: subscribedFields.has("comments"),
    messagesSubscribed: subscribedFields.has("messages"),
    messagingPostbacksSubscribed: subscribedFields.has("messaging_postbacks"),
    subscribedAppsStatus: subscribedAppsCall.ok ? "ok" : subscribedAppsCall.error,
    diagnostics,
  };
}
