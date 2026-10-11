"use server";

import { mergeContacts, filterContacts, contactsCsv, type ContactFilters } from "@/lib/contacts";
import { onCurrentUser } from "@/actions/user";
import { getCanonicalInstagramIntegration } from "@/lib/instagram-integration-status";
import { sendInstagramDirectResponse } from "@/lib/instagram-dm";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { client } from "@/lib/prisma";
import { resolveIntegrationSendToken } from "@/lib/send-token";

async function currentProfile() {
  const clerk = await onCurrentUser();
  const integrationId = await currentInstagramAccountId(clerk.id);
  const profile = await client.user.findUnique({
    where: { clerkId: clerk.id },
    select: {
      id: true,
      status: true,
      subscription: { select: { plan: true } },
      integrations: { where: { id: integrationId } },
    },
  });
  // Existing Clerk sessions survive an AP3K suspension. Enforce it at every
  // Inbox action, before contact reads, conversation takeover or a Meta send.
  return profile && profile.status !== "SUSPENDED" ? { ...profile, integrationId } : null;
}

export async function getInboxConversations() {
  const profile = await currentProfile();
  if (!profile) return { status: 404, data: [] };
  const conversations = await client.conversation.findMany({
    where: { userId: profile.id, integrationId: profile.integrationId },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      automation: { select: { id: true, name: true, source: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return { status: 200, data: conversations };
}

async function readContacts(profile: NonNullable<Awaited<ReturnType<typeof currentProfile>>>) {
  const [conversations, leads] = await Promise.all([
    client.conversation.findMany({
      where: { userId: profile.id, integrationId: profile.integrationId },
      orderBy: { lastMessageAt: "desc" },
      select: { id:true, recipientIgId:true, recipientUsername:true, profilePictureUrl:true, email:true, phone:true, createdAt:true, lastInboundAt:true, lastMessageAt:true },
    }),
    client.lead.findMany({
      where: { automation: { userId: profile.id, integrationId: profile.integrationId } },
      orderBy: { createdAt: "desc" },
      select: { id:true, igUserId:true, igUsername:true, email:true, phone:true, createdAt:true },
    }),
  ]);
  return mergeContacts(conversations, leads);
}

export async function getInstagramContacts() {
  const profile = await currentProfile();
  if (!profile) return { status: 404, data: [], canExport: false };
  return { status:200, data:filterContacts(await readContacts(profile)), canExport:["PRO","BUSINESS"].includes(profile.subscription?.plan ?? "FREE") };
}

export async function exportInstagramContacts(filters: ContactFilters = {}) {
  const profile = await currentProfile();
  if (!profile) return { status:404, error:"Account not found." };
  if (!["PRO","BUSINESS"].includes(profile.subscription?.plan ?? "FREE")) return { status:403, error:"Download CSV requires Pro or Business." };
  const contacts=filterContacts(await readContacts(profile),filters && typeof filters === "object" ? filters : {});
  return { status:200, csv:contactsCsv(contacts), filename:`ap3k-contacts-${new Date().toISOString().slice(0,10)}.csv` };
}

export async function getInboxMessages(conversationId: string) {
  const profile = await currentProfile();
  if (!profile) return { status: 404, data: [] };
  const conversation = await client.conversation.findFirst({
    where: {
      id: conversationId,
      userId: profile.id,
      integrationId: profile.integrationId,
    },
    select: { id: true, unreadCount: true, lastMessageAt: true },
  });
  if (!conversation) return { status: 404, data: [] };
  const messages = await client.inboxMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 300,
  });
  // Repeated five-second polls of a read conversation must not create writes.
  // Preserve unread messages arriving after this conversation snapshot.
  if (conversation.unreadCount > 0) {
    await client.conversation.updateMany({
      where: {
        id: conversation.id,
        userId: profile.id,
        integrationId: profile.integrationId,
        unreadCount: conversation.unreadCount,
        lastMessageAt: conversation.lastMessageAt,
      },
      data: { unreadCount: 0 },
    });
  }
  return { status: 200, data: messages };
}

export async function markConversationRead(conversationId: string) {
  const profile = await currentProfile();
  if (!profile) return { status: 404 };
  const updated = await client.conversation.updateMany({
    where: {
      id: conversationId,
      userId: profile.id,
      integrationId: profile.integrationId,
    },
    data: { unreadCount: 0 },
  });
  return { status: updated.count ? 200 : 404 };
}

export async function sendInboxReply(
  conversationId: string,
  rawMessage: string,
) {
  const message = rawMessage.trim().slice(0, 1000);
  if (!message) return { status: 400, data: "Write a message first." };
  const profile = await currentProfile();
  if (!profile) return { status: 404, data: "Account not found." };
  const conversation = await client.conversation.findFirst({
    where: {
      id: conversationId,
      userId: profile.id,
      integrationId: profile.integrationId,
    },
  });
  if (!conversation) return { status: 404, data: "Conversation not found." };
  if (
    !conversation.lastInboundAt ||
    Date.now() - conversation.lastInboundAt.getTime() > 24 * 60 * 60 * 1000
  ) {
    return {
      status: 403,
      data: "This conversation is outside Instagram's 24-hour reply window.",
    };
  }

  const integration = getCanonicalInstagramIntegration(profile.integrations);
  const token = resolveIntegrationSendToken(integration);
  if (!integration?.instagramId || !token.ok) {
    return { status: 403, data: "Reconnect Instagram before replying." };
  }
  // A manual reply takes over any active AI conversation before sending.
  await client.aiConversationSession.updateMany({
    where: {
      integrationId: profile.integrationId,
      recipientIgId: conversation.recipientIgId,
    },
    data: { status: "STOPPED", expiresAt: new Date(Date.now() + 86400000) },
  });
  await client.automationFlowSession.updateMany({
    where: {
      integrationId: profile.integrationId,
      recipientIgId: conversation.recipientIgId,
      OR: [
        { status: { in: ["WAITING", "SCHEDULED"] } },
        { status: { startsWith: "PROCESSING:" } },
      ],
    },
    data: {
      status: "STOPPED",
      resumeAt: null,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const sent = await sendInstagramDirectResponse({
    token: token.token,
    igBusinessAccountId: integration.instagramId,
    recipientId: conversation.recipientIgId,
    automationId: conversation.automationId ?? conversation.id,
    message,
    responseFormat: "TEXT",
  });
  if (!sent.ok)
    return {
      status: 502,
      data: sent.metaError.message ?? "Instagram could not send the message.",
    };

  await client.$transaction([
    client.inboxMessage.create({
      data: {
        conversationId: conversation.id,
        metaMessageId: sent.messageIds[0] || undefined,
        senderIgId: integration.instagramId,
        direction: "OUTBOUND",
        content: message,
        status: "SENT",
      },
    }),
    client.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
  ]);
  return { status: 200, data: "Message sent." };
}
