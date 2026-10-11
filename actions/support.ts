"use server";

import { onCurrentUser } from "@/actions/user";
import { findUser } from "@/actions/user/queries";
import { generateAiSupportReply } from "@/lib/ai-reply";
import { selectSupportResources } from "@/lib/support-resources";
import { reserveSupportRequest } from "@/lib/support-quota";
import { client } from "@/lib/prisma";
import { getUserMonthlyUsage } from "@/actions/usage/queries";
import { supportActionsFor, type SupportAccountContext } from "@/lib/support-assistance";

async function supportProfile() {
  const clerk = await onCurrentUser();
  const profile = await findUser(clerk.id);
  if (!profile?.id || profile.status === "SUSPENDED") throw new Error("AP3K account not found.");
  return profile;
}

export async function getSupportHistoryAction() {
  try {
    const profile = await supportProfile();
    const messages = await client.aiChatMessage.findMany({
      where: { userId: profile.id, context: "SUPPORT" },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, role: true, content: true, createdAt: true },
    });
    const chronological = messages.reverse();
    return { status: 200 as const, messages: chronological.map((message, index) => ({ ...message, resources: message.role === "assistant" ? selectSupportResources(chronological[index - 1]?.content || "", chronological.slice(0, index - 1).reverse().find(item => item.role === "user")?.content) : [] })) };
  } catch {
    return { status: 401 as const, messages: [] };
  }
}

export async function askSupportAssistantAction(message: string) {
  try {
    const profile = await supportProfile();
    const prompt = message.trim().slice(0, 1200);
    if (!prompt) return { status: 400 as const, data: "Write a question first." };

    if (!(await reserveSupportRequest(profile.id))) return { status: 429 as const, data: "You have reached today's support-assistant limit. Email support@ap3k.com for more help." };

    const history = await client.aiChatMessage.findMany({
      where: { userId: profile.id, context: "SUPPORT" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    });
    const userMessage = await client.aiChatMessage.create({
      data: { userId: profile.id, context: "SUPPORT", role: "user", content: prompt },
      select: { id: true, role: true, content: true, createdAt: true },
    });
    const account: SupportAccountContext = { plan: profile.subscription?.plan ?? "FREE" };
    if (supportActionsFor(prompt).length) {
      // These aggregate counts belong only to the authenticated owner. Never pass
      // the profile, integration tokens, email, or Stripe identifiers to a model.
      try {
        const usage = await getUserMonthlyUsage(profile.id);
        account.usage = { period: usage.periodLabel, actions: usage.staticReplies.used, aiReplies: usage.aiReplies.used, activeAutomations: usage.activeCampaigns.used, connectedAccounts: usage.connectedAccounts.used };
      } catch { /* Advice can still use configured limits; never invent live usage. */ }
    }
    const result = await generateAiSupportReply({
      message: prompt,
      account,
      history: history.reverse().map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: item.content })),
    });
    if (!result.ok) return { status: 503 as const, data: "The support assistant is unavailable. Please use the Documentation or email support@ap3k.com.", userMessage };
    const assistantMessage = await client.aiChatMessage.create({
      data: { userId: profile.id, context: "SUPPORT", role: "assistant", content: result.reply },
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return { status: 200 as const, data: result.reply, userMessage, assistantMessage: { ...assistantMessage, resources: selectSupportResources(prompt, [...history].reverse().find(item => item.role === "user")?.content) } };
  } catch {
    return { status: 503 as const, data: "Support is unavailable right now. Email support@ap3k.com." };
  }
}

export async function clearSupportHistoryAction() {
  try {
    const profile = await supportProfile();
    await client.aiChatMessage.deleteMany({ where: { userId: profile.id, context: "SUPPORT" } });
    return { status: 200 as const };
  } catch {
    return { status: 400 as const };
  }
}
