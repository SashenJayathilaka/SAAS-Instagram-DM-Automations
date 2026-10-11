import { client } from "@/lib/prisma";
import { canSendStaticReply } from "@/actions/usage/queries";
import { recordOutboundInboxMessage } from "@/actions/webhook/queries";
import { messagingWindowOpen } from "@/lib/automation-engagement-settings";
import { resolveIntegrationSendToken } from "@/lib/send-token";
import { sendDm } from "@/lib/fetch";
import { STARTER_PAYLOAD_PREFIX, conversationStarterId, readConversationStarters } from "./conversation-starters";

/** Called only after the Meta signature/account mapping is verified by the webhook. */
export async function handleConversationStarter(input: {
  integrationId: string;
  recipientIgId: string;
  payload: string;
  inboundAt: Date | null | undefined;
  eventId: string;
}): Promise<boolean> {
  if (!input.payload.startsWith(STARTER_PAYLOAD_PREFIX)) return false;
  const starterId = conversationStarterId(input.payload);
  if (!starterId || !input.eventId || !input.recipientIgId || !input.inboundAt || !messagingWindowOpen(input.inboundAt)) return true;
  const integration = await client.integrations.findFirst({
    where: { id: input.integrationId, status: "CONNECTED", reconnectRequired: false, planLocked: false, User: { status: { not: "SUSPENDED" } } },
    include: { User: { select: { id: true, status: true } } },
  });
  if (!integration?.userId || integration.User?.id !== integration.userId || !integration.instagramId) return true;
  const starter = readConversationStarters(integration.conversationStarters).items.find(item => item.id === starterId);
  const token = resolveIntegrationSendToken(integration);
  if (!starter || !token.ok) return true;
  const session = await client.automationFlowSession.findUnique({ where: { integrationId_recipientIgId: { integrationId: integration.id, recipientIgId: input.recipientIgId } } });
  if (session?.status === "STOPPED" && session.expiresAt > new Date()) return true;
  if (!(await canSendStaticReply(integration.userId)).ok) return true;
  const receiptKey = { integrationId: integration.id, recipientIgId: input.recipientIgId, eventId: input.eventId };
  const receipt = await client.conversationStarterReceipt.createMany({ data: [{ ...receiptKey, status: "PROCESSING" }], skipDuplicates: true });
  if (!receipt.count) return true;
  try {
    // A new explicit starter selection supersedes delayed/waiting bot turns.
    await client.automationFlowSession.updateMany({ where: { integrationId: integration.id, recipientIgId: input.recipientIgId, OR: [{ status: { in: ["WAITING", "SCHEDULED"] } }, { status: { startsWith: "PROCESSING:" } }] }, data: { status: "CANCELLED", resumeAt: null } });
    const humanReply = await client.inboxMessage.findFirst({ where: { conversation: { integrationId: integration.id, recipientIgId: input.recipientIgId }, direction: "OUTBOUND", createdAt: { gt: input.inboundAt } }, select: { id: true } });
    const active = await client.integrations.findFirst({ where: { id: integration.id, userId: integration.userId, status: "CONNECTED", reconnectRequired: false, planLocked: false, User: { status: { not: "SUSPENDED" } } }, select: { id: true, conversationStarters: true } });
    const currentStarter = readConversationStarters(active?.conversationStarters).items.find(item => item.id === starterId);
    if (humanReply || !active || !currentStarter || currentStarter.reply !== starter.reply || !messagingWindowOpen(input.inboundAt)) {
      await client.conversationStarterReceipt.updateMany({ where: { ...receiptKey, status: "PROCESSING" }, data: { status: "CANCELLED" } });
      return true;
    }
    const sent = await sendDm(integration.instagramId, input.recipientIgId, starter.reply, token.token);
    if (typeof sent.data?.message_id !== "string") throw new Error("starter_delivery_unconfirmed");
    // Commit usage before secondary inbox bookkeeping. Never replay ambiguous sends.
    await client.conversationStarterReceipt.updateMany({ where: { ...receiptKey, status: "PROCESSING" }, data: { status: "SENT" } });
    await recordOutboundInboxMessage({ integrationId: integration.id, userId: integration.userId, recipientIgId: input.recipientIgId, content: starter.reply, metaMessageId: sent.data.message_id });
  } catch {
    await client.conversationStarterReceipt.updateMany({ where: { ...receiptKey, status: "PROCESSING" }, data: { status: "FAILED" } });
  }
  return true;
}
