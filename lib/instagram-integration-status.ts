import { getInstagramPermissionCapabilities } from "@/lib/instagram-permissions";

export type InstagramIntegrationStatusBase = {
  id?: string | null;
  planLocked?: boolean;
  name?: string | null;
  instagramId?: string | null;
  instagramUsername?: string | null;
  status?: string | null;
  reconnectRequired?: boolean | null;
  token?: string | null;
  tokenPresent?: boolean | null;
  expiresAt?: Date | string | null;
  oauthResolutionDiagnostics?: unknown;
};

export type InstagramIntegrationStatusInput = InstagramIntegrationStatusBase | null | undefined;

export function isCanonicalInstagramConnected(integration: InstagramIntegrationStatusInput) {
  const capabilities = getInstagramPermissionCapabilities(
    integration?.oauthResolutionDiagnostics
  );
  const explicitlyMissingCorePermission =
    capabilities.authoritative &&
    (capabilities.basic === "missing" || capabilities.comments === "missing");
  const explicitlyExpired = isExpired(integration?.expiresAt);

  return Boolean(
    integration?.name === "INSTAGRAM" &&
    integration.instagramId &&
    integration.status === "CONNECTED" &&
    !integration.reconnectRequired &&
    !integration.planLocked &&
    !explicitlyMissingCorePermission &&
    !explicitlyExpired &&
    hasUsableIntegrationToken(integration)
  );
}

export function getCanonicalInstagramIntegration<T extends InstagramIntegrationStatusBase>(integrations?: T[] | null) {
  return integrations?.find(isCanonicalInstagramConnected) ?? null;
}

export function hasDisconnectedOrMissingInstagramIntegration(integrations?: InstagramIntegrationStatusInput[] | null) {
  return !integrations?.some(isCanonicalInstagramConnected);
}

function hasUsableIntegrationToken(integration: InstagramIntegrationStatusBase) {
  if (typeof integration.tokenPresent === "boolean") return integration.tokenPresent;
  return typeof integration.token === "string" && integration.token.trim().length > 0;
}

function isExpired(value?: Date | string | null) {
  if (!value) return false;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}
