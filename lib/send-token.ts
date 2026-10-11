export type TokenResolution =
  | { ok: true; token: string; source: "pageToken" }
  | { ok: false; reason: string };

export type IntegrationTokenInput = {
  id?: string | null;
  token?: string | null;
  instagramId?: string | null;
  pageId?: string | null;
};

function isValidTokenString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const t = value.trim();
  if (t.length < 20) return false;
  if (t.startsWith("{") || t.startsWith("[")) return false;
  if (t === "[object Object]") return false;
  return true;
}

export function resolveIntegrationSendToken(
  integration: IntegrationTokenInput | null | undefined
): TokenResolution {
  if (!integration) {
    return { ok: false, reason: "no_integration" };
  }

  // The schema stores the page access token in the `token` field.
  // Future schema migrations may add a dedicated `pageAccessToken` column;
  // this resolver is the single place to handle that transition.
  const t = integration.token;

  if (!isValidTokenString(t)) {
    return {
      ok: false,
      reason: t == null ? "token_missing" : "token_invalid_format",
    };
  }

  return { ok: true, token: t.trim(), source: "pageToken" };
}

export function tokenResolutionDiagnostics(
  integration: IntegrationTokenInput | null | undefined
): {
  pageAccessTokenPresent: boolean;
  tokenFormatValid: boolean;
  tokenSource: string | null;
  integrationId: string | null;
  instagramId: string | null;
  pageId: string | null;
  reconnectRequired: boolean;
} {
  const resolution = resolveIntegrationSendToken(integration);
  const raw = integration?.token;
  return {
    pageAccessTokenPresent: typeof raw === "string" && raw.trim().length > 0,
    tokenFormatValid: resolution.ok,
    tokenSource: resolution.ok ? resolution.source : null,
    integrationId: integration?.id ?? null,
    instagramId: integration?.instagramId ?? null,
    pageId: integration?.pageId ?? null,
    reconnectRequired: !resolution.ok,
  };
}
