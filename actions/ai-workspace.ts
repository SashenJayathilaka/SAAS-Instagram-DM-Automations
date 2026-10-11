"use server";

import { onCurrentUser } from "@/actions/user";
import { findUser } from "@/actions/user/queries";
import { reserveAiReplyQuota, completeAiReplyReservation, releaseAiReplyReservation } from "@/actions/usage/queries";
import { generateAiDmReply } from "@/lib/ai-reply";
import { normalizeAiProtectionRules, normalizeAiReplyTone } from "@/lib/ai-reply-config";
import { DEFAULT_AI_GUARDRAILS, DEFAULT_AI_ROLE, DEFAULT_AI_VOICE, normalizeAiWorkspace, normalizeKnowledge } from "@/lib/ai-workspace";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { client } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function currentProfile(expectedIntegrationId?: string) {
  const clerk = await onCurrentUser();
  const profile = await findUser(clerk.id);
  if (!profile?.id || profile.status === "SUSPENDED") throw new Error("AP3K account not found.");
  const integrationId = await currentInstagramAccountId(clerk.id);
  if (expectedIntegrationId !== undefined && expectedIntegrationId !== integrationId) throw new Error("Your Instagram account changed. Reload this page before saving.");
  return { ...profile, integrationId };
}

function hasAiPlan(plan?: string | null) {
  return plan === "PRO" || plan === "BUSINESS";
}

export async function getAiWorkspace() {
  const profile = await currentProfile();
  const workspace = await client.instagramAiConfig.findUnique({ where: { integrationId: profile.integrationId } });
  const playgroundMessages = await client.aiChatMessage.findMany({
    where: { userId: profile.id, integrationId: profile.integrationId, context: "PLAYGROUND" },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return {
    integrationId: profile.integrationId,
    profile: normalizeAiWorkspace(workspace),
    lastConfiguredAt: workspace?.updatedAt ?? null,
    plan: profile.subscription?.plan ?? "FREE",
    playgroundMessages: playgroundMessages.reverse(),
  };
}

export async function saveAiWorkspaceAction(formData: FormData) {
  try {
    const profile = await currentProfile(String(formData.get("integrationId") ?? ""));
    if (!hasAiPlan(profile.subscription?.plan)) {
      return { status: 403 as const, data: "AP3K AI is available on Pro and Business plans." };
    }

    const existing = await client.instagramAiConfig.findUnique({ where: { integrationId: profile.integrationId } });
    const current = normalizeAiWorkspace(existing);
    const next = {
      aiRepliesEnabled: formData.get("aiRepliesEnabled") === "true",
      aiCommentsEnabled: formData.get("aiCommentsEnabled") === "true",
      role: String(formData.get("role") ?? DEFAULT_AI_ROLE).trim().slice(0, 120) || DEFAULT_AI_ROLE,
      brandVoice: String(formData.get("brandVoice") ?? DEFAULT_AI_VOICE).trim().slice(0, 1600) || DEFAULT_AI_VOICE,
      guardrails: String(formData.get("guardrails") ?? DEFAULT_AI_GUARDRAILS).trim().slice(0, 2400) || DEFAULT_AI_GUARDRAILS,
      defaultTone: normalizeAiReplyTone(String(formData.get("defaultTone") ?? "FRIENDLY")),
      protectionRules: normalizeAiProtectionRules(JSON.parse(String(formData.get("protectionRules") ?? "{}"))),
      knowledge: current.knowledge,
    };

    await client.instagramAiConfig.upsert({
      where: { integrationId: profile.integrationId },
      create: { userId: profile.id, integrationId: profile.integrationId, ...next },
      update: next,
    });
    revalidatePath(`/dashboard/${profile.clerkId}/ai`);
    return { status: 200 as const, data: "AP3K AI settings saved." };
  } catch (error) {
    return { status: 400 as const, data: error instanceof Error ? error.message : "Could not save AP3K AI settings." };
  }
}

export async function addAiKnowledgeAction(formData: FormData) {
  try {
    const profile = await currentProfile(String(formData.get("integrationId") ?? ""));
    if (!hasAiPlan(profile.subscription?.plan)) return { status: 403 as const, data: "Upgrade to Pro to add AI knowledge." };
    const title = String(formData.get("title") ?? "").trim().slice(0, 80);
    const content = String(formData.get("content") ?? "").trim().slice(0, 5000);
    if (!title || !content) return { status: 400 as const, data: "Add a title and the facts AI may use." };
    const existing = await client.instagramAiConfig.findUnique({ where: { integrationId: profile.integrationId } });
    const current = normalizeAiWorkspace(existing);
    if (current.knowledge.length >= 12) return { status: 400 as const, data: "You can save up to 12 focused knowledge notes." };
    const knowledge = normalizeKnowledge([...current.knowledge, { id: crypto.randomUUID(), title, content }]);
    await client.instagramAiConfig.upsert({
      where: { integrationId: profile.integrationId },
      create: { userId: profile.id, integrationId: profile.integrationId, knowledge },
      update: { knowledge },
    });
    revalidatePath(`/dashboard/${profile.clerkId}/ai`);
    return { status: 200 as const, data: "Knowledge added.", knowledge };
  } catch (error) {
    return { status: 400 as const, data: error instanceof Error ? error.message : "Could not add knowledge." };
  }
}

export async function deleteAiKnowledgeAction(id: string, expectedIntegrationId = "") {
  try {
    const profile = await currentProfile(expectedIntegrationId);
    if (!hasAiPlan(profile.subscription?.plan)) {
      return { status: 403 as const, data: "AP3K AI is available on Pro and Business plans.", knowledge: [] };
    }
    const existing = await client.instagramAiConfig.findUnique({ where: { integrationId: profile.integrationId } });
    const knowledge = normalizeAiWorkspace(existing).knowledge.filter((item) => item.id !== id);
    await client.instagramAiConfig.updateMany({ where: { integrationId: profile.integrationId }, data: { knowledge } });
    revalidatePath(`/dashboard/${profile.clerkId}/ai`);
    return { status: 200 as const, data: "Knowledge removed.", knowledge };
  } catch {
    return { status: 400 as const, data: "Could not remove knowledge." };
  }
}

export async function testAiWorkspaceAction(message: string, expectedIntegrationId = "") {
  try {
    const profile = await currentProfile(expectedIntegrationId);
    if (!hasAiPlan(profile.subscription?.plan)) return { status: 403 as const, data: "AP3K AI is available on Pro and Business plans." };
    const prompt = message.trim().slice(0, 1000);
    if (!prompt) return { status: 400 as const, data: "Write a message to test." };
    const workspace = normalizeAiWorkspace(await client.instagramAiConfig.findUnique({ where: { integrationId: profile.integrationId } }));
    const history = await client.aiChatMessage.findMany({
      where: { userId: profile.id, integrationId: profile.integrationId, context: "PLAYGROUND" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    });
    const quota = await reserveAiReplyQuota({ userId: profile.id, channel: "PLAYGROUND" });
    if (!quota.ok) return { status: 429 as const, data: "Your monthly AI reply limit has been reached." };
    const userMessage = await client.aiChatMessage.create({
      data: { userId: profile.id, integrationId: profile.integrationId, context: "PLAYGROUND", role: "user", content: prompt },
      select: { id: true, role: true, content: true, createdAt: true },
    });
    const result = await generateAiDmReply({
      message: prompt,
      workspace,
      history: history.reverse().map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: item.content })),
    });
    if (!result.ok) {
      await releaseAiReplyReservation(quota.reservationId);
      return { status: 503 as const, data: "The AI provider is unavailable. Check the Admin provider connection.", userMessage };
    }
    await completeAiReplyReservation(quota.reservationId, { channel: "PLAYGROUND", outcome: "generated" });
    const assistantMessage = await client.aiChatMessage.create({
      data: { userId: profile.id, integrationId: profile.integrationId, context: "PLAYGROUND", role: "assistant", content: result.reply },
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return { status: 200 as const, data: result.reply, userMessage, assistantMessage };
  } catch (error) {
    if (error instanceof Error && error.message === "Your Instagram account changed. Reload this page before saving.") return { status: 400 as const, data: error.message };
    console.error("[ap3k-ai] playground request failed", error);
    return {
      status: 503 as const,
      data: "AP3K AI could not complete this test. Please try again; if it continues, check the active provider in Admin.",
    };
  }
}

export async function clearAiPlaygroundAction(expectedIntegrationId = "") {
  try {
    const profile = await currentProfile(expectedIntegrationId);
    await client.aiChatMessage.deleteMany({ where: { userId: profile.id, integrationId: profile.integrationId, context: "PLAYGROUND" } });
    return { status: 200 as const, data: "Conversation cleared." };
  } catch {
    return { status: 400 as const, data: "Could not clear the conversation." };
  }
}

export async function savePlaygroundMessageAsKnowledgeAction(messageId: string, expectedIntegrationId = "") {
  try {
    const profile = await currentProfile(expectedIntegrationId);
    if (!hasAiPlan(profile.subscription?.plan)) return { status: 403 as const, data: "Upgrade to Pro to add AI knowledge." };
    const message = await client.aiChatMessage.findFirst({ where: { id: messageId, userId: profile.id, integrationId: profile.integrationId, context: "PLAYGROUND", role: "user" } });
    if (!message) return { status: 404 as const, data: "Message not found." };
    const existing = await client.instagramAiConfig.findUnique({ where: { integrationId: profile.integrationId } });
    const current = normalizeAiWorkspace(existing);
    if (current.knowledge.length >= 12) return { status: 400 as const, data: "You can save up to 12 focused knowledge notes." };
    const knowledge = normalizeKnowledge([...current.knowledge, {
      id: crypto.randomUUID(),
      title: `Playground note ${current.knowledge.length + 1}`,
      content: message.content,
    }]);
    await client.instagramAiConfig.upsert({ where: { integrationId: profile.integrationId }, create: { userId: profile.id, integrationId: profile.integrationId, knowledge }, update: { knowledge } });
    revalidatePath(`/dashboard/${profile.clerkId}/ai`);
    return { status: 200 as const, data: "Saved to Knowledge. Review it there before using AI live.", knowledge };
  } catch {
    return { status: 400 as const, data: "Could not save this message to Knowledge." };
  }
}
