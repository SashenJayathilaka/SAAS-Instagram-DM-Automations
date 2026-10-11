import { scheduleDeliveryWake } from "@/lib/qstash-delivery-wake";
import { observeAutomationFollow } from "./automation-tracking";
import { client } from "@/lib/prisma";
import { canSendStaticReply } from "@/actions/usage/queries";
import {
  createMessageLog,
  recordOutboundInboxMessage,
  trackResponse,
} from "@/actions/webhook/queries";
import { resolveIntegrationSendToken } from "@/lib/send-token";
import {
  getInstagramRecipientProfile,
  sendInstagramDirectResponse,
} from "@/lib/instagram-dm";
import { personalizeUsername } from "@/lib/automation-copy";
import {
  followUpEligible,
  MESSAGING_WINDOW_MS,
  messagingWindowOpen,
  parseEmailReply,
  parsePhoneReply,
  followUpConditionMatches,
  DEFAULT_EMAIL_CAPTURE_RETRY,
  DEFAULT_PHONE_CAPTURE_RETRY,
} from "./automation-engagement-settings";

export async function followUpSchedulerReady(now = new Date()) {
  const heartbeat = await client.automationSchedulerHeartbeat.findUnique({
    where: { id: "follow-ups" },
  });
  return Boolean(
    heartbeat &&
    now.getTime() >= heartbeat.lastRunAt.getTime() &&
    now.getTime() - heartbeat.lastRunAt.getTime() < 20 * 60_000,
  );
}

export async function cancelPendingFollowUps(
  integrationId: string,
  recipientIgId: string,
  inboundAt: Date,
) {
  await client.automationEngagementJob.updateMany({
    where: {
      recipientIgId,
      kind: "FOLLOW_UP",
      status: { in: ["PENDING", "PROCESSING"] },
      inboundAt: { lt: inboundAt },
      automation: { integrationId },
    },
    data: { status: "CANCELLED" },
  });
}

export async function takeEmailReply(
  integrationId: string,
  recipientIgId: string,
  text: string,
  inboundAt: Date,
  messageMid?: string,
) {
  if (!messagingWindowOpen(inboundAt)) return null;
  if (
    messageMid &&
    (await client.automationEngagementJob.findFirst({
      where: {
        replyMessageId: messageMid,
        recipientIgId,
        automation: { integrationId },
      },
      select: { id: true },
    }))
  )
    return { kind: "waiting" as const };
  const pending = await client.automationEngagementJob.findFirst({
    where: {
      recipientIgId,
      OR: [
        {
          kind: "EMAIL",
          automation: { listener: { emailCaptureEnabled: true } },
        },
        {
          kind: "PHONE",
          automation: { listener: { phoneCaptureEnabled: true } },
        },
      ],
      status: "WAITING",
      expiresAt: { gt: new Date() },
      createdAt: { lte: inboundAt },
      automation: {
        integrationId,
        active: true,
        archivedAt: null,
        sendPrivateDm: true,
        listener: {
          OR: [{ emailCaptureEnabled: true }, { phoneCaptureEnabled: true }],
        },
        User: {
          status: { not: "SUSPENDED" },
          subscription: { plan: { in: ["PRO", "BUSINESS"] } },
        },
        integration: {
          status: "CONNECTED",
          reconnectRequired: false,
          planLocked: false,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!pending) return null;
  const reply =
    pending.kind === "PHONE" ? parsePhoneReply(text) : parseEmailReply(text);
  if (reply.kind === "invalid") {
    // Claim each inbound message before sending: webhook retries must not repeat
    // the retry prompt, and an invalid value must never advance the sequence.
    if (!messageMid) return { kind: "waiting" as const };
    const claimed = await client.automationEngagementJob.updateMany({
      where: { id:pending.id, status:"WAITING", OR:[{replyMessageId:null},{replyMessageId:{not:messageMid}}] },
      data:{replyMessageId:messageMid},
    });
    if (claimed.count) await sendCaptureRetry(pending.automationId, integrationId, recipientIgId, pending.kind, pending.flowId);
    return { kind: "waiting" as const };
  }
  const claimed = await client.automationEngagementJob.updateMany({
    where: { id: pending.id, status: "WAITING" },
    data: {
      status: reply.kind === "stop" ? "CANCELLED" : "PROCESSING",
      replyMessageId: messageMid,
    },
  });
  if (!claimed.count || reply.kind === "stop")
    return { kind: "waiting" as const };
  if (reply.kind === "email") {
    // No marketing subscription is inferred from supplying an email in a DM.
    await client.lead.upsert({
      where: {
        automationId_igUserId: {
          automationId: pending.automationId,
          igUserId: recipientIgId,
        },
      },
      create: {
        automationId: pending.automationId,
        igUserId: recipientIgId,
        email: reply.email,
        emailCollectedAt: new Date(),
      },
      update: { email: reply.email, emailCollectedAt: new Date() },
    });
  }
  if (reply.kind === "phone")
    await client.lead.upsert({
      where: {
        automationId_igUserId: {
          automationId: pending.automationId,
          igUserId: recipientIgId,
        },
      },
      create: {
        automationId: pending.automationId,
        igUserId: recipientIgId,
        phone: reply.phone,
      },
      update: { phone: reply.phone },
    });
  return {
    captureKind: pending.kind,
    kind: "continue" as const,
    jobId: pending.id,
    automationId: pending.automationId,
    flowId: pending.flowId,
  };
}

async function sendCaptureRetry(automationId:string,integrationId:string,recipientIgId:string,kind:string,flowId:string) {
  const automation=await client.automation.findUnique({where:{id:automationId},include:{listener:true,integration:true,User:{select:{status:true,subscription:{select:{plan:true}}}}}});
  const integration=automation?.integration, listener=automation?.listener;
  if (!automation?.userId || !automation.active || automation.archivedAt || !automation.sendPrivateDm || automation.User?.status === "SUSPENDED" || !["PRO","BUSINESS"].includes(automation.User?.subscription?.plan??"FREE") || integration?.id!==integrationId || integration.status!=="CONNECTED" || integration.planLocked || integration.reconnectRequired || !integration.instagramId || !(kind==="PHONE"?listener?.phoneCaptureEnabled:listener?.emailCaptureEnabled)) return;
  const token=resolveIntegrationSendToken(integration);
  if(!token.ok || !(await canSendStaticReply(automation.userId)).ok)return;
  const prompt=(kind==="PHONE"?listener?.phoneCaptureRetryMessage||DEFAULT_PHONE_CAPTURE_RETRY:listener?.emailCaptureRetryMessage||DEFAULT_EMAIL_CAPTURE_RETRY).trim();
  const contact=await client.conversation.findUnique({where:{integrationId_recipientIgId:{integrationId,recipientIgId}},select:{recipientUsername:true}});
  const message=personalizeUsername(prompt,contact?.recipientUsername);
  const sent=await sendInstagramDirectResponse({token:token.token,igBusinessAccountId:integration.instagramId,recipientId:recipientIgId,automationId,message,responseFormat:"TEXT"});
  await createMessageLog({automationId,recipientIgId,commentId:flowId,messageType:"DM",status:sent.ok?"SENT":"FAILED",errorMessage:sent.ok?"capture_retry_sent":"capture_retry_failed"});
  if(sent.ok){await trackResponse(automationId,"DM");await recordOutboundInboxMessage({userId:automation.userId,integrationId,recipientIgId,automationId,content:message,metaMessageId:sent.messageIds[0]});}
}

export async function beginEmailRequest(
  automationId: string,
  recipientIgId: string,
  flowId: string,
  inboundAt: Date,
  kind: "EMAIL" | "PHONE" = "EMAIL",
) {
  const existingLead = await client.lead.findUnique({
    where: { automationId_igUserId: { automationId, igUserId: recipientIgId } },
    select: { email: true, phone: true },
  });
  if (kind === "PHONE" ? existingLead?.phone : existingLead?.email)
    return { kind: "complete" as const };
  const existing = await client.automationEngagementJob.findUnique({
    where: {
      automationId_recipientIgId_flowId_kind: {
        automationId,
        recipientIgId,
        flowId,
        kind,
      },
    },
  });
  if (existing)
    return {
      kind:
        existing.status === "COMPLETED"
          ? ("complete" as const)
          : ("waiting" as const),
    };
  try {
    const job = await client.automationEngagementJob.create({
      data: {
        automationId,
        recipientIgId,
        flowId,
        kind,
        dueAt: new Date(),
        inboundAt,
        expiresAt: new Date(inboundAt.getTime() + MESSAGING_WINDOW_MS),
      },
    });
    // Only the newest request for this account owns the next email reply.
    const automation = await client.automation.findUniqueOrThrow({
      where: { id: automationId },
      select: { integrationId: true },
    });
    await client.automationEngagementJob.updateMany({
      where: {
        id: { not: job.id },
        recipientIgId,
        kind: { in: ["EMAIL", "PHONE"] },
        status: "WAITING",
        automation: { integrationId: automation.integrationId },
      },
      data: { status: "CANCELLED" },
    });
    return { kind: "request" as const, jobId: job.id };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    )
      return { kind: "waiting" as const };
    throw error;
  }
}

export async function finishEngagementJob(
  id: string,
  status: "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED",
) {
  await client.automationEngagementJob.updateMany({
    where: { id, status: { in: ["PENDING", "PROCESSING"] } },
    data: { status },
  });
}

export async function scheduleFollowUp(
  automationId: string,
  recipientIgId: string,
  flowId: string,
  inboundAt: Date,
  delayMinutes: number,
  evidence: {
    messageId?: string;
    condition?: string;
    baselineFollows?: boolean | null;
  } = {},
) {
  if (!messagingWindowOpen(inboundAt) || !(await followUpSchedulerReady()))
    return;
  const dueAt = new Date(Date.now() + delayMinutes * 60_000);
  const expiresAt = new Date(inboundAt.getTime() + MESSAGING_WINDOW_MS);
  if (dueAt >= expiresAt) return;
  const scheduledJob = await client.automationEngagementJob.upsert({
    where: {
      automationId_recipientIgId_flowId_kind: {
        automationId,
        recipientIgId,
        flowId,
        kind: "FOLLOW_UP",
      },
    },
    create: {
      automationId,
      recipientIgId,
      flowId,
      kind: "FOLLOW_UP",
      inboundAt,
      dueAt,
      expiresAt,
      sentMessageId: evidence.messageId,
      condition: evidence.condition || "ALWAYS",
      baselineFollows: evidence.baselineFollows,
    },
    update: {},
  });
  if (scheduledJob?.status === "PENDING") await scheduleDeliveryWake(scheduledJob);
}

export async function processAutomationFollowUps(now = new Date()) {
  const startedAt = Date.now();
  await client.automationSchedulerHeartbeat.upsert({
    where: { id: "follow-ups" },
    create: { id: "follow-ups", lastRunAt: now },
    update: { lastRunAt: now },
  });
  await client.automationEngagementJob.updateMany({
    where: { status: { in: ["PENDING", "WAITING"] }, expiresAt: { lte: now } },
    data: { status: "CANCELLED" },
  });
  // A crash after claiming may have happened after Meta accepted the send.
  // Never retry an ambiguous send; fail closed to prevent duplicate reminders.
  await client.automationEngagementJob.updateMany({
    where: {
      status: "PROCESSING",
      updatedAt: { lt: new Date(now.getTime() - 10 * 60_000) },
    },
    data: { status: "FAILED" },
  });
  const jobs = await client.automationEngagementJob.findMany({
    where: {
      kind: "FOLLOW_UP",
      status: "PENDING",
      dueAt: { lte: now },
      expiresAt: { gt: now },
    },
    orderBy: { dueAt: "asc" },
    take: 20,
  });
  let sent = 0;
  for (const job of jobs) {
    if (Date.now() - startedAt > 40_000) break;
    const claimed = await client.automationEngagementJob.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (!claimed.count) continue;
    try {
      const automation = await client.automation.findUnique({
        where: { id: job.automationId },
        include: {
          listener: true,
          integration: true,
          User: {
            select: { status: true, subscription: { select: { plan: true } } },
          },
        },
      });
      const integration = automation?.integration;
      const listener = automation?.listener;
      const conversation = integration
        ? await client.conversation.findUnique({
            where: {
              integrationId_recipientIgId: {
                integrationId: integration.id,
                recipientIgId: job.recipientIgId,
              },
            },
            select: { lastInboundAt: true, lastMessageAt: true },
          })
        : null;
      const allowed =
        automation?.active &&
        !automation.archivedAt &&
        automation.sendPrivateDm &&
        automation.User?.status !== "SUSPENDED" &&
        ["PRO", "BUSINESS"].includes(
          automation.User?.subscription?.plan ?? "FREE",
        ) &&
        listener?.followUpEnabled &&
        listener.followUpMessage?.trim() &&
        integration?.status === "CONNECTED" &&
        !integration.reconnectRequired &&
        !integration.planLocked &&
        followUpEligible(
          { ...job, latestInboundAt: conversation?.lastInboundAt ?? null },
          now,
        );
      if (
        !allowed ||
        !automation?.userId ||
        !integration?.instagramId ||
        !listener
      ) {
        await client.automationEngagementJob.update({
          where: { id: job.id },
          data: { status: "CANCELLED" },
        });
        continue;
      }
      // A human or another automation already replied after the original delivery.
      const newerOutbound = await client.inboxMessage.findFirst({
        where: {
          conversation: {
            integrationId: integration.id,
            recipientIgId: job.recipientIgId,
          },
          direction: "OUTBOUND",
          createdAt: { gt: job.createdAt },
        },
        select: { id: true },
      });
      const token = resolveIntegrationSendToken(integration);
      if (
        newerOutbound ||
        !token.ok ||
        !messagingWindowOpen(job.inboundAt) ||
        !(await canSendStaticReply(automation.userId)).ok
      ) {
        await client.automationEngagementJob.update({
          where: { id: job.id },
          data: { status: "CANCELLED" },
        });
        continue;
      }
      const condition = job.condition || "ALWAYS";
      const profile = (["FOLLOWED", "UNFOLLOWED"].includes(condition) || /\{\{username\}\}|\bUsername\b/i.test(listener.followUpMessage || ""))
        ? await getInstagramRecipientProfile({
            token: token.token,
            recipientId: job.recipientIgId,
          })
        : null;
      if (profile)
        await observeAutomationFollow({
          integrationId: integration.id,
          automationId: automation.id,
          recipientIgId: job.recipientIgId,
          followsBusiness: profile.followsBusiness,
        });
      // Refresh receipts at send time. Unknown follow status never means unfollowed.
      const evidence = await client.automationEngagementJob.findUnique({
        where: { id: job.id },
      });
      if (
        !followUpConditionMatches(condition, {
          seen: Boolean(evidence?.seenAt),
          reacted: Boolean(evidence?.reactedAt),
          clicked: Boolean(evidence?.clickedAt),
          baselineFollows: job.baselineFollows ?? null,
          follows: profile?.followsBusiness ?? null,
        })
      ) {
        await client.automationEngagementJob.update({
          where: { id: job.id },
          data: { status: "CANCELLED" },
        });
        continue;
      }
      // An inbound event can cancel a job while quota/token checks are running.
      const current = await client.automationEngagementJob.findUnique({
        where: { id: job.id },
        select: { status: true },
      });
      if (
        current?.status !== "PROCESSING" ||
        !messagingWindowOpen(job.inboundAt)
      )
        continue;
      const message = personalizeUsername(listener.followUpMessage!, profile?.username);
      const result = await sendInstagramDirectResponse({
        token: token.token,
        igBusinessAccountId: integration.instagramId,
        recipientId: job.recipientIgId,
        automationId: automation.id,
        message,
        responseFormat: "TEXT",
      });
      // Persist terminal state before secondary bookkeeping.
      await finishEngagementJob(job.id, result.ok ? "COMPLETED" : "FAILED");
      await createMessageLog({
        automationId: automation.id,
        recipientIgId: job.recipientIgId,
        commentId: job.flowId,
        messageType: "DM",
        status: result.ok ? "SENT" : "FAILED",
        errorMessage: result.ok ? "follow_up_dm_sent" : "follow_up_dm_failed",
      });
      if (result.ok) {
        sent++;
        await trackResponse(automation.id, "DM");
        await recordOutboundInboxMessage({
          userId: automation.userId,
          integrationId: integration.id,
          recipientIgId: job.recipientIgId,
          automationId: automation.id,
          content: message,
          metaMessageId: result.messageIds[0],
        });
      }
    } catch {
      await finishEngagementJob(job.id, "FAILED");
      console.warn("[automation-follow-up] job failed", { jobId: job.id });
    }
  }
  // This table holds operational state, not a permanent recipient history.
  await client.automationEngagementJob.deleteMany({
    where: {
      status: { in: ["COMPLETED", "FAILED", "CANCELLED"] },
      updatedAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60_000) },
    },
  });
  return { checked: jobs.length, sent };
}

// Verified webhook receipts are scoped to the account, recipient and sent message.
// They never extend the messaging window or trigger an incoming-DM automation.
export async function recordEngagementReceipt(
  integrationId: string,
  recipientIgId: string,
  event: unknown,
) {
  if (!event || typeof event !== "object") return;
  const e = event as {
    read?: { mid?: string; watermark?: number };
    reaction?: { mid?: string; action?: string };
    timestamp?: number;
  };
  const mid = e.read?.mid || e.reaction?.mid;
  const time = new Date(e.timestamp || Date.now());
  if (!Number.isFinite(time.getTime()) || time.getTime() > Date.now() + 60000)
    return;
  if (e.read && (mid || Number.isFinite(e.read.watermark)))
    await client.automationEngagementJob.updateMany({
      where: {
        automation: { integrationId },
        recipientIgId,
        kind: "FOLLOW_UP",
        status: { in: ["PENDING", "PROCESSING"] },
        ...(mid
          ? { sentMessageId: mid }
          : { createdAt: { lte: new Date(e.read.watermark!) } }),
      },
      data: { seenAt: time },
    });
  if (e.reaction?.mid && ["react", "unreact"].includes(e.reaction.action || ""))
    await client.automationEngagementJob.updateMany({
      where: {
        automation: { integrationId },
        recipientIgId,
        kind: "FOLLOW_UP",
        sentMessageId: e.reaction.mid,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      data: { reactedAt: e.reaction.action === "react" ? time : null },
    });
}
