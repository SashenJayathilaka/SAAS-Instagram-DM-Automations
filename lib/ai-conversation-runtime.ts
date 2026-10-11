import { client } from "@/lib/prisma";
import { conversationInstructions, conversationWorkspace, explicitConversationEmail, readConversationHistory, type AiConversationConfig } from "@/lib/ai-conversation";
import { generateAiDmReply } from "@/lib/ai-reply";
import { reserveAiReplyQuota, completeAiReplyReservation, releaseAiReplyReservation } from "@/actions/usage/queries";
import { messagingWindowOpen } from "@/lib/automation-engagement-settings";

/** Claim a turn before generating; only the lease owner may complete it. */
export async function prepareAiConversationTurn(input: {
  automationId: string; userId: string; integrationId: string; recipientIgId: string;
  message: string; inboundAt?: Date | null; config: AiConversationConfig;
}) {
  if (!input.inboundAt || !messagingWindowOpen(input.inboundAt)) return null;
  const key = { integrationId: input.integrationId, recipientIgId: input.recipientIgId };
  const now = new Date();
  const expiresAt = new Date(input.inboundAt.getTime() + 24 * 60 * 60 * 1000);
  const session = await client.aiConversationSession.upsert({ where: { integrationId_recipientIgId: key },
    create: { ...key, automationId: input.automationId, expiresAt }, update: {} });
  if (session.status === "STOPPED" && session.expiresAt > now) return null;
  if (session.status.startsWith("PROCESSING:") && session.updatedAt.getTime() > now.getTime() - 90_000) return null;
  const lease = `PROCESSING:${crypto.randomUUID()}`;
  const claimed = await client.aiConversationSession.updateMany({ where: { id: session.id, updatedAt: session.updatedAt, status: session.status }, data: { status: lease, automationId: input.automationId, expiresAt } });
  if (!claimed.count) return null;
  const history = session.automationId === input.automationId && session.expiresAt > now ? readConversationHistory(session.history) : [];
  let reservationId: string | undefined;
  try {
    const quota = await reserveAiReplyQuota({ userId: input.userId, automationId: input.automationId, channel: "DM", igUserId: input.recipientIgId });
    if (!quota.ok) {
      await client.aiConversationSession.updateMany({ where: { id: session.id, status: lease }, data: { status: "ACTIVE" } });
      return null;
    }
    reservationId = quota.reservationId;
    const result = await generateAiDmReply({ message: input.message, workspace: conversationWorkspace(input.config), automationInstructions: conversationInstructions(input.config), history });
    if (result.ok) { await completeAiReplyReservation(reservationId, { channel: "DM", outcome: "generated" }); reservationId = undefined; }
    else { await releaseAiReplyReservation(reservationId); reservationId = undefined; }
    const stillOwned = await client.aiConversationSession.updateMany({ where: { id: session.id, status: lease }, data: { status: lease } });
    if (!stillOwned.count) return null;
    return { sessionId: session.id, lease, history, reply: result.ok ? result.reply : input.config.fallback, linkButton: result.ok ? result.linkButton : undefined,
      email: input.config.collectEmail ? explicitConversationEmail(input.message) : null };
  } catch (error) {
    if (reservationId) await releaseAiReplyReservation(reservationId);
    await client.aiConversationSession.updateMany({ where: { id: session.id, status: lease }, data: { status: "ACTIVE" } });
    throw error;
  }
}
export async function finishAiConversationTurn(turn: NonNullable<Awaited<ReturnType<typeof prepareAiConversationTurn>>>, input: { message: string; sent: boolean; automationId: string; recipientIgId: string }) {
  await client.aiConversationSession.updateMany({ where: { id: turn.sessionId, status: turn.lease }, data: {
    status: "ACTIVE", ...(input.sent ? { history: [...turn.history, { role: "user", content: input.message.slice(0, 1000) }, { role: "assistant", content: turn.reply }].slice(-12) } : {}),
  } });
  if (input.sent && turn.email) await client.lead.upsert({ where: { automationId_igUserId: { automationId: input.automationId, igUserId: input.recipientIgId } },
    create: { automationId: input.automationId, igUserId: input.recipientIgId, email: turn.email, emailCollectedAt: new Date() },
    update: { email: turn.email, emailCollectedAt: new Date() } });
}
