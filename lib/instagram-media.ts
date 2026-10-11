import { INSTAGRAM_GRAPH_API_BASE_URL, META_GRAPH_API_BASE_URL } from "@/lib/fetch";

// The older media fetch path reads process.env.INSTAGRAM_BASE_URL inside server actions.
// In direct Instagram Login mode the access token only works on graph.instagram.com,
// so force the media host away from graph.facebook.com and toward Instagram Graph.
if (process.env.INSTAGRAM_LOGIN_ENABLED === "true") {
  process.env.INSTAGRAM_BASE_URL = INSTAGRAM_GRAPH_API_BASE_URL;
}

export type InstagramMediaIntegration = {
  token?: string | null;
  instagramId?: string | null;
  igAccountSource?: string | null;
  oauthResolutionDiagnostics?: unknown;
};

function diagnosticsLoginType(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const loginType = (value as { loginType?: unknown }).loginType;
  return typeof loginType === "string" ? loginType : null;
}

function isDirectInstagramLoginIntegration(integration: InstagramMediaIntegration) {
  return (
    integration.igAccountSource === "instagram_login" ||
    diagnosticsLoginType(integration.oauthResolutionDiagnostics) === "instagram_login"
  );
}

export function resolveInstagramMediaConnection(
  integrations: InstagramMediaIntegration[] | undefined
) {
  const integration = integrations?.find((item) => item.token && item.instagramId);
  if (!integration?.token || !integration.instagramId) {
    return { ok: false as const, error: "Reconnect Instagram to load posts." };
  }

  const directInstagramLogin = isDirectInstagramLoginIntegration(integration);

  return {
    ok: true as const,
    token: integration.token,
    instagramBusinessAccountId: integration.instagramId,
    apiBaseUrl: directInstagramLogin ? INSTAGRAM_GRAPH_API_BASE_URL : META_GRAPH_API_BASE_URL,
    apiFamily: directInstagramLogin ? "instagram_graph" : "facebook_graph_instagram_business",
  };
}

export function instagramMediaFetchError(status: number) {
  if (status === 401 || status === 403) {
    return "AP3K could not load posts. Reconnect Instagram and confirm media permissions are granted.";
  }

  if (status === 400) {
    return "AP3K could not load posts from this Instagram connection. Reconnect Instagram, then refresh posts.";
  }

  return "AP3K could not load posts right now.";
}
