import axios from "axios";
import { INSTAGRAM_WEBHOOK_FIELDS_CSV } from "@/lib/instagram-webhook-subscriptions";

export const META_GRAPH_BASE_URL =
  process.env.META_GRAPH_BASE_URL ?? "https://graph.facebook.com";
export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v25.0";
export const META_GRAPH_API_BASE_URL = `${META_GRAPH_BASE_URL}/${META_GRAPH_VERSION}`;
export const INSTAGRAM_GRAPH_BASE_URL =
  process.env.INSTAGRAM_GRAPH_BASE_URL ?? "https://graph.instagram.com";
export const INSTAGRAM_GRAPH_VERSION =
  process.env.INSTAGRAM_GRAPH_VERSION ?? process.env.META_GRAPH_VERSION ?? "v25.0";
export const INSTAGRAM_GRAPH_API_BASE_URL = `${INSTAGRAM_GRAPH_BASE_URL}/${INSTAGRAM_GRAPH_VERSION}`;

function shouldPreferInstagramGraph() {
  return process.env.INSTAGRAM_LOGIN_ENABLED === "true";
}

export function getSafeMetaError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { error?: { message?: string; type?: string; code?: number; error_subcode?: number } }
      | undefined;

    return {
      status,
      message: data?.error?.message ?? error.message,
      type: data?.error?.type,
      code: data?.error?.code,
      subcode: data?.error?.error_subcode,
    };
  }

  return {
    message: error instanceof Error ? error.message : String(error),
  };
}

export function formatSafeMetaError(error: unknown) {
  const safe = getSafeMetaError(error);
  return [
    safe.status ? `status=${safe.status}` : null,
    safe.code ? `code=${safe.code}` : null,
    safe.subcode ? `subcode=${safe.subcode}` : null,
    safe.message ? `message=${safe.message}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function graphHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function shouldTryInstagramGraph(error: unknown): boolean {
  const safe = getSafeMetaError(error);
  return Boolean(
    safe.status === 400 ||
    safe.status === 401 ||
    safe.status === 403 ||
    safe.status === 404 ||
    safe.code === 3 ||
    safe.code === 10 ||
    safe.code === 100 ||
    safe.code === 190 ||
    safe.type === "IGApiException" ||
    safe.type === "OAuthException"
  );
}

async function postGraph(
  path: string,
  body: unknown,
  token: string,
  context: { endpointName: string }
) {
  if (shouldPreferInstagramGraph()) {
    console.log("[meta-api] Instagram Graph request", {
      endpointFamily: "instagram_graph",
      endpointName: context.endpointName,
    });
    return await axios.post(`${INSTAGRAM_GRAPH_API_BASE_URL}/${path}`, body, {
      headers: graphHeaders(token),
    });
  }

  try {
    return await axios.post(`${META_GRAPH_API_BASE_URL}/${path}`, body, {
      headers: graphHeaders(token),
    });
  } catch (facebookErr) {
    if (!shouldTryInstagramGraph(facebookErr)) throw facebookErr;
    console.warn("[meta-api] facebook graph request failed — trying instagram graph", {
      endpointName: context.endpointName,
      legacyEndpointFamily: "facebook_graph_instagram_business",
      instagramEndpointFamily: "instagram_graph",
      facebookGraphError: getSafeMetaError(facebookErr),
    });
    return await axios.post(`${INSTAGRAM_GRAPH_API_BASE_URL}/${path}`, body, {
      headers: graphHeaders(token),
    });
  }
}

async function deleteGraph(path: string, token: string, context: { endpointName: string }) {
  if (shouldPreferInstagramGraph()) {
    return axios.delete(`${INSTAGRAM_GRAPH_API_BASE_URL}/${path}`, { headers: graphHeaders(token) });
  }

  try {
    return await axios.delete(`${META_GRAPH_API_BASE_URL}/${path}`, { headers: graphHeaders(token) });
  } catch (facebookErr) {
    if (!shouldTryInstagramGraph(facebookErr)) throw facebookErr;
    console.warn("[meta-api] facebook graph delete failed — trying instagram graph", {
      endpointName: context.endpointName,
      facebookGraphError: getSafeMetaError(facebookErr),
    });
    return axios.delete(`${INSTAGRAM_GRAPH_API_BASE_URL}/${path}`, { headers: graphHeaders(token) });
  }
}

export const sendDm = async (
  userId: string,
  receiverId: string,
  prompt: string,
  token: string
) => {
  console.log("[meta-api] send DM request", {
    endpointFamily: shouldPreferInstagramGraph() ? "instagram_graph" : "facebook_graph_instagram_business",
    hasUserId: Boolean(userId),
    hasReceiverId: Boolean(receiverId),
  });
  return await postGraph(
    `${userId}/messages`,
    { recipient: { id: receiverId }, message: { text: prompt } },
    token,
    { endpointName: "ig_messages_direct_dm" }
  );
};

export const sendPrivateMessage = async (
  userId: string,
  commentId: string,
  message: string,
  token: string
) => {
  console.log("[meta-api] send private reply request", {
    endpointFamily: shouldPreferInstagramGraph() ? "instagram_graph" : "facebook_graph_instagram_business",
    hasUserId: Boolean(userId),
    hasCommentId: Boolean(commentId),
  });
  return await postGraph(
    `${userId}/messages`,
    { recipient: { comment_id: commentId }, message: { text: message } },
    token,
    { endpointName: "ig_messages_private_reply" }
  );
};

export const sendCommentReply = async (
  commentId: string,
  message: string,
  token: string
) => {
  console.log("[meta-api] send threaded comment reply", {
    endpointFamily: shouldPreferInstagramGraph() ? "instagram_graph" : "facebook_graph_instagram_business",
    accessMode: "advanced",
    endpoint: "comment_replies",
    hasCommentId: Boolean(commentId),
  });
  return await postGraph(
    `${commentId}/replies`,
    { message },
    token,
    { endpointName: "comment_replies" }
  );
};

export const sendMediaComment = async (
  mediaId: string,
  message: string,
  token: string
) => {
  console.log("[meta-api] send media comment", {
    endpointFamily: shouldPreferInstagramGraph() ? "instagram_graph" : "facebook_graph_instagram_business",
    accessMode: "standard",
    endpoint: "media_comments",
    hasMediaId: Boolean(mediaId),
  });
  return await postGraph(
    `${mediaId}/comments`,
    { message },
    token,
    { endpointName: "media_comments" }
  );
};

export const deleteInstagramComment = async (commentId: string, token: string) => {
  console.log("[meta-api] delete protected Instagram comment", {
    endpointFamily: shouldPreferInstagramGraph() ? "instagram_graph" : "facebook_graph_instagram_business",
    hasCommentId: Boolean(commentId),
  });
  return deleteGraph(commentId, token, { endpointName: "delete_instagram_comment" });
};

const WEBHOOK_SUBSCRIBED_FIELDS = INSTAGRAM_WEBHOOK_FIELDS_CSV;

function isSuccessfulMetaStatus(status?: number) {
  return typeof status === "number" && status >= 200 && status < 300;
}

async function postSubscribedApps(
  targetId: string,
  token: string,
  endpointFamily: "instagram_graph" | "facebook_graph_page" | "facebook_graph_instagram_business"
) {
  const baseUrl = endpointFamily === "instagram_graph"
    ? INSTAGRAM_GRAPH_API_BASE_URL
    : META_GRAPH_API_BASE_URL;

  console.log("[meta-api] subscribed_apps request", {
    endpointFamily,
    targetIdPresent: Boolean(targetId),
    subscribedFields: WEBHOOK_SUBSCRIBED_FIELDS,
  });

  return await axios.post(`${baseUrl}/${targetId}/subscribed_apps`, null, {
    params: {
      subscribed_fields: WEBHOOK_SUBSCRIBED_FIELDS,
      access_token: token,
    },
  });
}

async function resolveInstagramAccountIdFromPage(pageId: string, pageToken: string) {
  try {
    const page = await axios.get(`${META_GRAPH_API_BASE_URL}/${pageId}`, {
      params: {
        fields: "instagram_business_account{id},connected_instagram_account{id}",
        access_token: pageToken,
      },
    });
    const id = page.data?.instagram_business_account?.id ?? page.data?.connected_instagram_account?.id;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  } catch (error) {
    console.warn("[meta-api] linked Instagram account lookup failed before webhook subscription", {
      endpointFamily: "facebook_graph_page",
      hasPageId: Boolean(pageId),
      error: getSafeMetaError(error),
    });
    return null;
  }
}

export const subscribePageWebhooks = async (pageId: string, token: string) => {
  if (shouldPreferInstagramGraph()) {
    const instagramSubscription = await postSubscribedApps(pageId, token, "instagram_graph");
    console.log("[meta-api] Instagram Graph subscribed_apps result", {
      endpointFamily: "instagram_graph",
      status: instagramSubscription.status,
      subscribed: isSuccessfulMetaStatus(instagramSubscription.status),
    });
    return instagramSubscription;
  }

  let pageSubscription: Awaited<ReturnType<typeof postSubscribedApps>> | null = null;
  let pageSubscriptionError: unknown = null;

  try {
    pageSubscription = await postSubscribedApps(pageId, token, "facebook_graph_page");
    console.log("[meta-api] page subscribed_apps result", {
      endpointFamily: "facebook_graph_page",
      status: pageSubscription.status,
      subscribed: isSuccessfulMetaStatus(pageSubscription.status),
    });
  } catch (error) {
    pageSubscriptionError = error;
    console.warn("[meta-api] page subscribed_apps failed; will try linked Instagram account", {
      endpointFamily: "facebook_graph_page",
      error: getSafeMetaError(error),
    });
  }

  const instagramAccountId = await resolveInstagramAccountIdFromPage(pageId, token);
  if (instagramAccountId) {
    try {
      const instagramSubscription = await postSubscribedApps(
        instagramAccountId,
        token,
        "facebook_graph_instagram_business"
      );
      console.log("[meta-api] Instagram account subscribed_apps result", {
        endpointFamily: "facebook_graph_instagram_business",
        hasInstagramAccountId: true,
        status: instagramSubscription.status,
        subscribed: isSuccessfulMetaStatus(instagramSubscription.status),
        pageSubscriptionStatus: pageSubscription?.status,
      });
      if (isSuccessfulMetaStatus(instagramSubscription.status)) return instagramSubscription;
    } catch (error) {
      console.warn("[meta-api] Instagram account subscribed_apps failed", {
        endpointFamily: "facebook_graph_instagram_business",
        hasInstagramAccountId: true,
        error: getSafeMetaError(error),
        pageSubscriptionStatus: pageSubscription?.status,
      });
    }
  }

  if (pageSubscription) return pageSubscription;
  throw pageSubscriptionError ?? new Error("subscribed_apps_failed");
};

export const subscribeInstagramWebhooks = subscribePageWebhooks;

export type FacebookPagePost = {
  id: string;
  message?: string;
  createdTime: string;
  permalinkUrl?: string;
};

export const getRecentFacebookPagePosts = async (
  pageId: string,
  pageAccessToken: string
): Promise<FacebookPagePost[]> => {
  const response = await axios.get(`${META_GRAPH_API_BASE_URL}/${pageId}/posts`, {
    params: {
      fields: "id,message,created_time,permalink_url",
      limit: 3,
      access_token: pageAccessToken,
    },
  });

  const posts = Array.isArray(response.data?.data) ? response.data.data : [];
  return posts.slice(0, 3).flatMap((post: any) => {
    const id = typeof post?.id === "string" ? post.id : "";
    const createdTime = typeof post?.created_time === "string" ? post.created_time : "";
    if (!id || !createdTime) return [];
    return [{
      id,
      message: typeof post?.message === "string" ? post.message : undefined,
      createdTime,
      permalinkUrl: typeof post?.permalink_url === "string" ? post.permalink_url : undefined,
    }];
  });
};

function getMetaOAuthConfig() {
  const redirectUri =
    process.env.META_REDIRECT_URI ??
    (process.env.NEXT_PUBLIC_HOST_URL
      ? `${process.env.NEXT_PUBLIC_HOST_URL}/callback/instagram`
      : undefined);

  if (!redirectUri) throw new Error("META_REDIRECT_URI is not configured");

  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET are required for Facebook Business OAuth");
  }

  return { clientId, clientSecret, redirectUri };
}

function assertAccessToken(value: unknown) {
  return typeof value === "string" && value.trim().length > 20 ? value : null;
}

export const exchangeLongLivedFacebookUserToken = async (shortUserToken: string) => {
  const { clientId, clientSecret } = getMetaOAuthConfig();
  const longToken = await axios.get(`${META_GRAPH_API_BASE_URL}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: shortUserToken,
    },
  });

  const accessToken = assertAccessToken(longToken.data?.access_token);
  if (!accessToken) return null;

  return {
    accessToken,
    expiresIn: typeof longToken.data?.expires_in === "number" ? longToken.data.expires_in : undefined,
  };
};

export const refreshToken = async (token: string) => {
  return exchangeLongLivedFacebookUserToken(token);
};

export const generateToken = async (code: string) => {
  const { clientId, clientSecret, redirectUri } = getMetaOAuthConfig();
  const shortTokenRes = await axios.get(`${META_GRAPH_API_BASE_URL}/oauth/access_token`, {
    params: { client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code },
  });

  const shortAccessToken = assertAccessToken(shortTokenRes.data?.access_token);
  console.log("[oauth] facebook code exchange result", {
    endpointFamily: "facebook_graph_oauth",
    tokenExchangeStatus: shortTokenRes.status,
    hasAccessToken: Boolean(shortAccessToken),
    authProduct: "facebook_login_for_business",
  });

  if (!shortAccessToken) return null;

  const longToken = await exchangeLongLivedFacebookUserToken(shortAccessToken);
  console.log("[oauth] facebook long-lived token exchange result", {
    endpointFamily: "facebook_graph_oauth",
    hasAccessToken: Boolean(longToken?.accessToken),
    authProduct: "facebook_login_for_business",
  });

  return longToken;
};

export type EligibleInstagramAccount = {
  pageId: string;
  pageName?: string;
  pageAccessToken: string;
  instagramBusinessAccountId: string;
  metaAppScopedUserId?: string | null;
  instagramUsername?: string;
  profilePictureUrl?: string;
  igAccountSource: "instagram_business_account" | "connected_instagram_account";
  tasks: string[];
  diagnostics: {
    pagesReturned: number;
    pageLookupAttempts: Array<{
      pageId: string;
      pageName?: string;
      hasPageAccessToken: boolean;
      status: "skipped_missing_page_token" | "ok" | "failed";
      foundInstagramField?: "instagram_business_account" | "connected_instagram_account" | "none";
      error?: string;
    }>;
    foundInstagramField: string;
    igAccountSource: string;
    selectedPageName?: string;
    selectedPageId?: string;
    selectedInstagramUsername?: string;
  };
};

export const getEligibleFacebookInstagramAccounts = async (userToken: string) => {
  const accounts = await axios.get(`${META_GRAPH_API_BASE_URL}/me/accounts`, {
    params: {
      fields:
        "id,name,access_token,tasks,instagram_business_account{id,username,profile_picture_url},connected_instagram_account{id,username,profile_picture_url}",
      access_token: userToken,
    },
  });

  const pages = Array.isArray(accounts.data?.data) ? accounts.data.data : [];
  const pageLookupAttempts: EligibleInstagramAccount["diagnostics"]["pageLookupAttempts"] = [];
  const eligibleAccounts: EligibleInstagramAccount[] = [];

  for (const page of pages) {
    const pageId = String(page?.id ?? "");
    const pageName = page?.name as string | undefined;
    const pageAccessToken = assertAccessToken(page?.access_token);
    const tasks = Array.isArray(page?.tasks) ? page.tasks.map(String) : [];

    if (!pageId || !pageAccessToken) {
      pageLookupAttempts.push({ pageId, pageName, hasPageAccessToken: Boolean(pageAccessToken), status: "skipped_missing_page_token" });
      continue;
    }

    try {
      const pageLookup = await axios.get(`${META_GRAPH_API_BASE_URL}/${pageId}`, {
        params: {
          fields: "id,name,instagram_business_account{id,username,profile_picture_url},connected_instagram_account{id,username,profile_picture_url}",
          access_token: pageAccessToken,
        },
      });
      const instagramBusinessAccount = pageLookup.data?.instagram_business_account ?? page?.instagram_business_account;
      const connectedInstagramAccount = pageLookup.data?.connected_instagram_account ?? page?.connected_instagram_account;
      const account = instagramBusinessAccount ?? connectedInstagramAccount;
      const igAccountSource = instagramBusinessAccount
        ? ("instagram_business_account" as const)
        : connectedInstagramAccount
          ? ("connected_instagram_account" as const)
          : undefined;

      pageLookupAttempts.push({
        pageId,
        pageName,
        hasPageAccessToken: true,
        status: "ok",
        foundInstagramField: igAccountSource ?? "none",
      });

      if (account?.id && igAccountSource) {
        eligibleAccounts.push({
          pageId,
          pageName,
          pageAccessToken,
          instagramBusinessAccountId: String(account.id),
          instagramUsername: account.username as string | undefined,
          profilePictureUrl: account.profile_picture_url as string | undefined,
          igAccountSource,
          tasks,
          diagnostics: {
            pagesReturned: pages.length,
            pageLookupAttempts,
            foundInstagramField: igAccountSource,
            igAccountSource,
            selectedPageName: pageName,
            selectedPageId: pageId,
            selectedInstagramUsername: account.username as string | undefined,
          },
        });
      }
    } catch (error) {
      pageLookupAttempts.push({
        pageId,
        pageName,
        hasPageAccessToken: true,
        status: "failed",
        error: formatSafeMetaError(error) || "page_lookup_failed",
      });
    }
  }

  return {
    pagesReturned: pages.length,
    pageLookupAttempts,
    eligibleAccounts: eligibleAccounts.filter((account) => {
      if (!account.tasks.length) return true;
      return account.tasks.includes("MESSAGING") && account.tasks.includes("MODERATE");
    }),
  };
};

export const getMetaAppScopedUserId = async (userToken: string) => {
  try {
    const response = await axios.get(`${META_GRAPH_API_BASE_URL}/me`, {
      params: { fields: "id", access_token: userToken },
    });
    const id = response.data?.id;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  } catch (error) {
    console.warn("[oauth] meta app-scoped user id lookup failed", {
      endpointFamily: "facebook_graph_user",
      error: getSafeMetaError(error),
    });
    return null;
  }
};

export const resolveFacebookBusinessInstagramAccount = async (userToken: string) => {
  const result = await getEligibleFacebookInstagramAccounts(userToken);
  const account = result.eligibleAccounts[0];
  if (account) return account;

  const error = new Error(!result.pagesReturned || result.pageLookupAttempts.every((attempt) => !attempt.hasPageAccessToken)
    ? "page_token_missing"
    : "ig_business_not_linked"
  );
  (error as any).diagnostics = {
    pagesReturned: result.pagesReturned,
    pageLookupAttempts: result.pageLookupAttempts,
    foundInstagramField: "none",
  };
  throw error;
};

export const debugPageToken = async (token: string) => {
  const { clientId, clientSecret } = getMetaOAuthConfig();
  return await axios.get(`${META_GRAPH_API_BASE_URL}/debug_token`, {
    params: { input_token: token, access_token: `${clientId}|${clientSecret}` },
  });
};

export const getPageWebhookSubscriptions = async (pageId: string, pageToken: string) => {
  const baseUrl = shouldPreferInstagramGraph() ? INSTAGRAM_GRAPH_API_BASE_URL : META_GRAPH_API_BASE_URL;
  return await axios.get(`${baseUrl}/${pageId}/subscribed_apps`, {
    params: { access_token: pageToken },
  });
};

export const getPageTokenPermissions = async (pageToken: string) => {
  return await axios.get(`${META_GRAPH_API_BASE_URL}/me/permissions`, {
    params: { access_token: pageToken },
  });
};

export const getLinkedInstagramBusinessAccount = async (pageId: string, pageToken: string) => {
  return await axios.get(`${META_GRAPH_API_BASE_URL}/${pageId}`, {
    params: {
      fields: "id,name,instagram_business_account{id,username,profile_picture_url}",
      access_token: pageToken,
    },
  });
};

export const getInstagramBusinessProfile = async (
  instagramBusinessAccountId: string,
  pageToken: string,
  fields = "id,username,profile_picture_url,followers_count,media_count"
) => {
  const baseUrl = shouldPreferInstagramGraph() ? INSTAGRAM_GRAPH_API_BASE_URL : META_GRAPH_API_BASE_URL;
  return await axios.get(`${baseUrl}/${instagramBusinessAccountId}`, {
    params: { fields, access_token: pageToken },
  });
};
