import { getPageTokenPermissions } from "@/lib/fetch";
import { client } from "@/lib/prisma";
import {
  buildSafePrivateReplyDiagnostics,
  type SafePrivateReplyDiagnostics,
} from "@/lib/private-reply-preflight";

export type PrivateReplyPreflightAccountOption = {
  id: string;
  label: string;
  username: string | null;
  pageName: string | null;
  ownerEmail: string | null;
};

export type PrivateReplyPreflightPageData = {
  accounts: PrivateReplyPreflightAccountOption[];
  selectedAccount: PrivateReplyPreflightAccountOption | null;
  diagnostics: SafePrivateReplyDiagnostics | null;
  reconnectUrl: string | null;
};

async function detectGrantedScopes(pageToken: string) {
  try {
    const response = await getPageTokenPermissions(pageToken);
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    return {
      scopes: rows
        .filter((item: { status?: string }) => item.status === "granted")
        .map((item: { permission?: string }) => item.permission)
        .filter((permission: unknown): permission is string => Boolean(permission)),
      detection: "detected" as const,
    };
  } catch (error) {
    console.warn("[private-reply-preflight] scope detection unavailable", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return {
      scopes: [] as string[],
      detection: "unavailable" as const,
    };
  }
}
export async function getPrivateReplyPreflightPageData(
  requestedIntegrationId?: string | null
): Promise<PrivateReplyPreflightPageData> {
  const integrations = await client.integrations.findMany({
    where: {
      name: "INSTAGRAM",
      status: { not: "DISCONNECTED" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      instagramId: true,
      instagramUsername: true,
      pageName: true,
      token: true,
      expiresAt: true,
      User: {
        select: {
          clerkId: true,
          email: true,
        },
      },
    },
  });

  const accounts = integrations.map((integration) => ({
    id: integration.id,
    label:
      integration.instagramUsername
        ? `@${integration.instagramUsername}`
        : integration.pageName ?? `Integration ${integration.id.slice(0, 8)}`,
    username: integration.instagramUsername,
    pageName: integration.pageName,
    ownerEmail: integration.User?.email ?? null,
  }));
  const selected =
    integrations.find((integration) => integration.id === requestedIntegrationId) ??
    integrations[0] ??
    null;

  if (!selected) {
    return {
      accounts,
      selectedAccount: null,
      diagnostics: null,
      reconnectUrl: null,
    };
  }

  const granted = selected.token
    ? await detectGrantedScopes(selected.token)
    : { scopes: [] as string[], detection: "not_checked" as const };
  const selectedAccount =
    accounts.find((account) => account.id === selected.id) ?? null;

  return {
    accounts,
    selectedAccount,
    diagnostics: buildSafePrivateReplyDiagnostics({
      integrationStatus: selected.status,
      connectedUsername: selected.instagramUsername,
      instagramId: selected.instagramId,
      token: selected.token,
      tokenExpiry: selected.expiresAt,
      grantedScopes: granted.scopes,
      scopeDetection: granted.detection,
    }),
    reconnectUrl: selected.User?.clerkId
      ? `/dashboard/${encodeURIComponent(selected.User.clerkId)}/integrations`
      : null,
  };
}
