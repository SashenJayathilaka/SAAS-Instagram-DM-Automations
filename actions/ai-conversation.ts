"use server";
import { z } from "zod";
import { onCurrentUser } from "@/actions/user";
import { findUser } from "@/actions/user/queries";
import { currentInstagramAccountId, NO_INSTAGRAM_ACCOUNT } from "@/lib/instagram-account-scope";
import { aiConversationSchema, conversationInstructions, conversationWorkspace } from "@/lib/ai-conversation";
import { generateAiConversationTasks, generateAiDmReply } from "@/lib/ai-reply";
import { reserveAiReplyQuota, completeAiReplyReservation, releaseAiReplyReservation } from "@/actions/usage/queries";

async function authorize(integrationId: string) {
  const clerk = await onCurrentUser();
  const [profile, currentId] = await Promise.all([findUser(clerk.id), currentInstagramAccountId(clerk.id)]);
  if (!profile || (profile as { status?: string }).status === "SUSPENDED") throw new Error("This account cannot use AI conversations.");
  if (!integrationId || currentId === NO_INSTAGRAM_ACCOUNT || integrationId !== currentId) throw new Error("Your Instagram account changed. Reload this page.");
  if (!["PRO", "BUSINESS"].includes(profile.subscription?.plan ?? "FREE")) throw new Error("AI conversations are available on Pro and Business plans.");
  return profile.id;
}
const historySchema = z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(1000) })).max(12);
export async function previewAiConversation(input: unknown, message: string, history: unknown, integrationId: string) {
  let reservationId: string | undefined;
  try {
    const userId = await authorize(integrationId);
    const config = aiConversationSchema.parse(input);
    const prompt = z.string().trim().min(1).max(1000).parse(message);
    const turns = historySchema.parse(history);
    const quota = await reserveAiReplyQuota({ userId, channel: "PLAYGROUND" });
    if (!quota.ok) return { ok: false as const, error: "Your monthly AI limit has been reached." };
    reservationId = quota.reservationId;
    const result = await generateAiDmReply({ message: prompt, history: turns, workspace: conversationWorkspace(config), automationInstructions: conversationInstructions(config) });
    if (!result.ok) throw new Error("The AI provider could not respond. Your draft is safe; try again.");
    await completeAiReplyReservation(reservationId, { channel: "PLAYGROUND", outcome: "generated" });
    reservationId = undefined;
    return { ok: true as const, reply: result.reply, linkButton: result.linkButton };
  } catch (error) {
    if (reservationId) await releaseAiReplyReservation(reservationId);
    return { ok: false as const, error: error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : "Preview unavailable." };
  }
}
export async function generateConversationPlan(input: unknown, integrationId: string) {
  let reservationId: string | undefined;
  try {
    const userId = await authorize(integrationId);
    const config = aiConversationSchema.parse(input);
    const quota = await reserveAiReplyQuota({ userId, channel: "PLAYGROUND" });
    if (!quota.ok) return { ok: false as const, error: "Your monthly AI limit has been reached." };
    reservationId = quota.reservationId;
    const tasks = await generateAiConversationTasks(config.goal, config.context);
    if (!tasks) throw new Error("AI could not generate tasks. You can edit the tasks yourself or try again.");
    await completeAiReplyReservation(reservationId, { channel: "PLAYGROUND", outcome: "generated" });
    reservationId = undefined;
    return { ok: true as const, tasks };
  } catch (error) {
    if (reservationId) await releaseAiReplyReservation(reservationId);
    return { ok: false as const, error: error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : "Generation unavailable." };
  }
}
