import { client } from "@/lib/prisma";
import { normalizeReplyLimit } from "@/lib/automation-copy";

/** Lock the automation row only for the count-and-reserve transaction, never the API call. */
export async function reservePublicReplySlot(input: { automationId: string; mediaId: string; commentId: string; limit?: number }) {
  return client.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Automation" WHERE "id" = ${input.automationId}::uuid FOR UPDATE`;
    const existing = await tx.publicReplySlot.findUnique({ where: { automationId_commentId: { automationId: input.automationId, commentId: input.commentId } } });
    if (existing) return { ok: false as const, reason: "duplicate_public_reply" };
    const limit = normalizeReplyLimit(input.limit);
    if (limit) {
      const used = await tx.publicReplySlot.count({ where: { automationId: input.automationId, mediaId: input.mediaId, createdAt: { gt: new Date(Date.now() - 7 * 86400000) } } });
      if (used >= limit) return { ok: false as const, reason: "public_reply_weekly_limit" };
    }
    const slot = await tx.publicReplySlot.create({ data: { automationId: input.automationId, mediaId: input.mediaId, commentId: input.commentId } });
    return { ok: true as const, id: slot.id };
  });
}

export async function finishPublicReplySlot(id: string, sent: boolean) {
  // Failed API requests may have been accepted before a timeout. Keep that slot
  // in the rolling count rather than risk exceeding the owner's configured cap.
  await client.publicReplySlot.update({ where: { id }, data: { status: sent ? "SENT" : "UNCERTAIN" } });
}
