"use server";

import { onCurrentUser } from "@/actions/user";
import { completeAiReplyReservation, releaseAiReplyReservation, reserveAiReplyQuota } from "@/actions/usage/queries";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { client } from "@/lib/prisma";
import { consumeWebhookAccountRateLimit } from "@/lib/webhook-rate-limit";
import { generateFlowAssistantDraft, normalizeFlowAssistantInput, type FlowAssistantDraft, type FlowAssistantInput } from "@/lib/automation-flow/ai";

/** Produces a proposal only. The editor applies it to an undoable draft; saving/publishing is separate. */
export async function generateAutomationFlow(raw: FlowAssistantInput): Promise<({ status: number; error?: string } & Partial<FlowAssistantDraft>)> {
  let reservationId: string | null = null;
  let input: FlowAssistantInput;
  try { input = normalizeFlowAssistantInput(raw); }
  catch { return { status: 400, error: "Use a prompt of 1–4,000 characters, up to eight conversation messages and a valid flow of at most 50 steps." }; }
  let clerk: { id: string };
  try { clerk = await onCurrentUser(); }
  catch { return { status: 401, error: "Sign in to use the flow assistant." }; }
  try {
    const accountId = await currentInstagramAccountId(clerk.id);
    if (accountId !== input.integrationId) return { status: 409, error: "Your Instagram account changed. Reload before generating a flow." };
    const user = await client.user.findUnique({ where: { clerkId: clerk.id }, include: { subscription: true } });
    if (!user || user.status === "SUSPENDED") return { status: 403, error: "This account cannot use the flow assistant." };
    if (!["PRO", "BUSINESS"].includes(user.subscription?.plan ?? "FREE")) return { status: 403, error: "The AI flow assistant requires Pro or Business." };
    const integration = await client.integrations.findFirst({ where: { id: accountId, userId: user.id } });
    if (!integration || integration.planLocked) return { status: 403, error: "Select an Instagram account available on your plan." };
    const rate = await consumeWebhookAccountRateLimit([`flow-assistant:${user.id}:${accountId}`], { limit: 6 });
    if (!rate.allowed) return { status: 429, error: "You can generate six flow drafts per minute. Please try again shortly." };
    const quota = await reserveAiReplyQuota({ userId: user.id, channel: "PLAYGROUND" });
    if (!quota.ok) return { status: 429, error: "Your monthly AI allowance has been reached." };
    reservationId = quota.reservationId;
    const draft = await generateFlowAssistantDraft(input);
    await completeAiReplyReservation(reservationId, { channel: "PLAYGROUND", outcome: "flow_draft_generated", integrationId: accountId, nodes: draft.flow.nodes.length });
    reservationId = null;
    return { status: 200, ...draft };
  } catch (error) {
    if (reservationId) {
      try { await releaseAiReplyReservation(reservationId); }
      catch { console.error("[flow-assistant] AI quota reservation could not be released"); }
    }
    // Only our validated provider errors are safe to return. Never expose DB errors, keys or request headers.
    const message = error instanceof Error ? error.message : "";
    const safe = /^(The AI provider|AI generation is disabled|The generated flow)/.test(message);
    return { status: 503, error: safe ? message : "The flow assistant could not complete this request. Please try again." };
  }
}
