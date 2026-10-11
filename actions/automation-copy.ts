"use server";

import { onCurrentUser } from "@/actions/user";
import { findUser } from "@/actions/user/queries";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { reserveAiReplyQuota, completeAiReplyReservation, releaseAiReplyReservation } from "@/actions/usage/queries";
import { generateAutomationCopy } from "@/lib/ai-reply";
import { variationGenerationError, type AutomationCopyInput } from "@/lib/automation-copy";

/** Generates drafts only. No Instagram send or automation mutation occurs here. */
export async function generateAutomationCopyAction(input: AutomationCopyInput) {
  let reservationId: string | null = null;
  try {
    const clerk = await onCurrentUser();
    const profile = await findUser(clerk.id);
    if (!profile?.id || (profile as { status?: string }).status === "SUSPENDED") return { ok: false as const, error: "Your account cannot generate AI copy." };
    const commentPreview = ["COMMENT_REPLIES", "COMMENT_PROMPT", "COMMENT_SAMPLES"].includes(input?.mode);
    if (!commentPreview && !["PRO", "BUSINESS"].includes(profile.subscription?.plan ?? "FREE")) return { ok: false as const, error: "AI generation is available on Pro and Business plans." };
    if (!input || input.integrationId !== await currentInstagramAccountId(clerk.id)) return { ok: false as const, error: "Your Instagram account changed. Reload this page before generating." };
    if (!["COMMENT_REPLIES", "COMMENT_PROMPT", "COMMENT_SAMPLES", "MESSAGE", "MESSAGE_VARIATIONS"].includes(input.mode)) return { ok: false as const, error: "Choose a supported generation mode." };
    if (input.mode === "MESSAGE_VARIATIONS") {
      const error = variationGenerationError(input);
      if (error) return { ok: false as const, error };
    }
    const quota = await reserveAiReplyQuota({ userId: profile.id, channel: "PLAYGROUND", allowFreePreview: commentPreview });
    if (!quota.ok) return { ok: false as const, error: "Your monthly AI draft or reply limit has been reached." };
    reservationId = quota.reservationId;
    const items = await generateAutomationCopy(input);
    if (!items?.length) throw new Error("generation_unavailable");
    await completeAiReplyReservation(reservationId, { purpose: "AUTOMATION_EDITOR", mode: input.mode });
    reservationId = null;
    return { ok: true as const, items };
  } catch {
    if (reservationId) await releaseAiReplyReservation(reservationId).catch(() => undefined);
    return { ok: false as const, error: "AI could not generate copy. Your saved text is unchanged. Try again." };
  }
}
