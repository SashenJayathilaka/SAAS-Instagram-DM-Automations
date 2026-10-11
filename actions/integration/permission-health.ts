"use server";

import { getCurrentWorkspaceClerkId } from "@/actions/user";
import {
  getInstagramPermissionCapabilities,
  type InstagramPermissionCapabilities,
} from "@/lib/instagram-permissions";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { client } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export type CurrentInstagramPermissionHealth = InstagramPermissionCapabilities & {
  connected: boolean;
  username: string | null;
  instagramId: string | null;
  source: string | null;
  webhookSubscribed: boolean | null;
  webhookSubscriptionMode: string | null;
  tokenExpiresAt: string | null;
  tokenDaysRemaining: number | null;
};

export async function getCurrentInstagramPermissionHealth(): Promise<{
  status: number;
  data: CurrentInstagramPermissionHealth | null;
}> {
  const user = await currentUser();
  if (!user) return { status: 401, data: null };

  const workspaceClerkId = (await getCurrentWorkspaceClerkId()) ?? user.id;
  const profile = await client.user.findUnique({
    where: { clerkId: workspaceClerkId },
    select: {
      integrations: {
        where: { name: "INSTAGRAM", id: await currentInstagramAccountId(workspaceClerkId), planLocked: false },
        orderBy: { createdAt: "desc" },
        select: {
          instagramId: true,
          instagramUsername: true,
          igAccountSource: true,
          oauthResolutionDiagnostics: true,
          webhookSubscriptionSubscribed: true,
          webhookSubscriptionMode: true,
          expiresAt: true,
          status: true,
          reconnectRequired: true,
        },
      },
    },
  });

  const integration = profile?.integrations.find(
    (item) => item.status === "CONNECTED" && !item.reconnectRequired
  ) ?? null;

  if (!integration) {
    return {
      status: 200,
      data: {
        connected: false,
        username: null,
        instagramId: null,
        source: null,
        webhookSubscribed: null,
        webhookSubscriptionMode: null,
        tokenExpiresAt: null,
        tokenDaysRemaining: null,
        ...getInstagramPermissionCapabilities(null),
      },
    };
  }

  const capabilities = getInstagramPermissionCapabilities(
    integration.oauthResolutionDiagnostics
  );
  const tokenDaysRemaining = integration.expiresAt
    ? Math.floor(
        (integration.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return {
    status: 200,
    data: {
      connected: true,
      username: integration.instagramUsername ?? null,
      instagramId: integration.instagramId ?? null,
      source: integration.igAccountSource ?? null,
      webhookSubscribed: integration.webhookSubscriptionSubscribed ?? null,
      webhookSubscriptionMode: integration.webhookSubscriptionMode ?? null,
      tokenExpiresAt: integration.expiresAt?.toISOString() ?? null,
      tokenDaysRemaining,
      ...capabilities,
    },
  };
}
