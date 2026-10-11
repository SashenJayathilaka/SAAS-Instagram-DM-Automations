"use server";
import axios from "axios";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { onCurrentUser } from "@/actions/user";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { client } from "@/lib/prisma";
import { resolveIntegrationSendToken } from "@/lib/send-token";
import { resolveInstagramMediaConnection } from "@/lib/instagram-media";
import { ensureInstagramButtonCallbacks } from "@/lib/instagram-postback-subscription";
import { conversationStartersSchema, conversationStarterProfile, readConversationStarters, type ConversationStarter } from "@/lib/conversation-starters";

async function starterAccount(integrationId: string) {
  const current = await onCurrentUser();
  if (!z.string().uuid().safeParse(integrationId).success) return { error: "Choose an Instagram account.", status: 400 } as const;
  if (await currentInstagramAccountId(current.id) !== integrationId) return { error: "Your Instagram account changed. Reload before saving.", status: 409 } as const;
  const user = await client.user.findUnique({ where: { clerkId: current.id }, select: { id: true, status: true } });
  if (!user || user.status === "SUSPENDED") return { error: "This account is not available.", status: 403 } as const;
  const integration = await client.integrations.findFirst({ where: { id: integrationId, userId: user.id } });
  if (!integration) return { error: "This Instagram account is not available.", status: 404 } as const;
  return { integration, user };
}
export async function getConversationStarters(integrationId: string) {
  const account = await starterAccount(integrationId);
  if ("error" in account) return { status: account.status, error: account.error };
  return { status: 200, data: readConversationStarters(account.integration.conversationStarters).items };
}
export async function saveConversationStarters(input: { integrationId: string; items: ConversationStarter[] }) {
  const envelope = z.object({ integrationId: z.string().uuid(), items: conversationStartersSchema.shape.items }).safeParse(input);
  if (!envelope.success) return { status: 400, error: envelope.error.issues[0].message };
  const parsed = conversationStartersSchema.safeParse({ version: 1, items: envelope.data.items });
  if (!parsed.success) return { status: 400, error: parsed.error.issues[0].message };
  const account = await starterAccount(input.integrationId);
  if ("error" in account) return { status: account.status, error: account.error };
  const { integration } = account;
  if (integration.status !== "CONNECTED" || integration.reconnectRequired || integration.planLocked) return { status: 403, error: "Reconnect or unlock this Instagram account before saving." };
  const token = resolveIntegrationSendToken(integration);
  const connection = resolveInstagramMediaConnection([integration]);
  if (!token.ok || !connection.ok) return { status: 403, error: "Reconnect Instagram before saving conversation starters." };
  const profileId = connection.apiFamily === "instagram_graph" ? integration.instagramId : integration.pageId;
  if (!profileId) return { status: 403, error: "Reconnect Instagram to restore its messaging profile." };
  try {
    if (parsed.data.items.length && !await ensureInstagramButtonCallbacks(integration.id, token.token)) return { status: 400, error: "Instagram button callbacks are unavailable. Reconnect Instagram, then try again." };
    // Serialize remote profile updates with the local snapshot: concurrent tabs
    // must not leave the saved answers out of sync with the displayed buttons.
    await client.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`starters:${integration.id}`}))::text`;
      const owned = await tx.integrations.findFirst({ where: { id: integration.id, userId: account.user.id, status: "CONNECTED", reconnectRequired: false, planLocked: false, User: { status: { not: "SUSPENDED" } } }, select: { id: true } });
      if (!owned) throw new Error("account_changed");
      const url = `${connection.apiBaseUrl}/${profileId}/messenger_profile`;
      const config = { headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" }, timeout: 10000 };
      const response = parsed.data.items.length
        ? await axios.post(url, conversationStarterProfile(parsed.data.items), config)
        : await axios.delete(url, { ...config, params: { platform: "instagram", fields: JSON.stringify(["ice_breakers"]) } });
      if (response.data?.result !== "success" && response.data?.success !== true) throw new Error("profile_not_confirmed");
      await tx.integrations.update({ where: { id: integration.id }, data: { conversationStarters: parsed.data as Prisma.InputJsonValue } });
    }, { timeout: 15000, maxWait: 5000 });
    return { status: 200, data: parsed.data.items };
  } catch {
    return { status: 502, error: "The update could not be completed. Reload your saved starters and try again." };
  }
}
