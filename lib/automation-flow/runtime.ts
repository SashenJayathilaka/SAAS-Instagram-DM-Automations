import { randomInt, createHash } from "node:crypto";
import { executeFlowWebhook } from "./webhook-request";
import { Prisma } from "@prisma/client";
import { client } from "@/lib/prisma";
import { messagingWindowOpen } from "@/lib/automation-engagement-settings";
import {
  readFlow,
  branchTarget,
  responseTarget,
  resolveFlowText,
  type FlowValues,
  isProfileField,
  PROFILE_FIELDS,
  isReservedField,
  applyFlowTag,
} from "./definition";
import { resolveIntegrationSendToken } from "@/lib/send-token";
import { getInstagramRecipientProfile, sendInstagramDirectResponse } from "@/lib/instagram-dm";
import { observeAutomationFollow } from "@/lib/automation-tracking";
import { canSendStaticReply } from "@/actions/usage/queries";
import {
  createAutomationEvent,
  createMessageLog,
  recordOutboundInboxMessage,
  trackResponse,
} from "@/actions/webhook/queries";

export type FlowInput = {
  integrationId: string;
  recipientIgId: string;
  text: string;
  inboundAt?: Date | null;
  eventId: string;
  automationId?: string;
  startEventId?: string;
  /** Opening-DM callback may already have collected the entry question. */
  startNodeId?: string | null;
  initialValues?: FlowValues;
  /** Internal scheduler claim; never sourced from a public request body. */
  scheduled?: { sessionId: string; resumeAt: Date };
  /** Vercel waitUntil, supplied only by the webhook entry point. */
  scheduleWake?: (task: Promise<unknown>) => void;
};
/** Returns true only when a custom flow owns this inbound message. */
export async function processAutomationFlow(
  input: FlowInput,
): Promise<boolean> {
  const key = {
    integrationId: input.integrationId,
    recipientIgId: input.recipientIgId,
  };
  let session = await client.automationFlowSession.findUnique({
    where: { integrationId_recipientIgId: key },
  });
  const now = new Date();
  const scheduled = Boolean(input.scheduled);
  if (input.scheduled) {
    if (!session || session.id !== input.scheduled.sessionId || session.status !== "SCHEDULED" ||
        !session.resumeAt || session.resumeAt.getTime() !== input.scheduled.resumeAt.getTime() || session.resumeAt > now) return false;
    if (session.expiresAt <= now) {
      await client.automationFlowSession.updateMany({ where: { id: session.id, status: "SCHEDULED", resumeAt: session.resumeAt }, data: { status: "CANCELLED", resumeAt: null } });
      return true;
    }
    // Scheduling cannot open or extend Instagram's customer messaging window.
    input = { ...input, inboundAt: new Date(session.expiresAt.getTime() - 86400000) };
  }
  if (/^stop$/i.test(input.text.trim())) {
    if (session)
      await client.automationFlowSession.update({
        where: { id: session.id },
        data: {
          status: "STOPPED",
          resumeAt: null,
          expiresAt: new Date(now.getTime() + 86400000),
        },
      });
    return Boolean(session);
  }
  // An unrelated reply cannot skip a pending delay or accidentally restart the flow.
  if (!scheduled && !input.automationId && session?.status === "SCHEDULED") return true;
  if (!input.inboundAt || !messagingWindowOpen(input.inboundAt))
    return Boolean(input.automationId || session?.status === "WAITING");
  if (
    session?.lastEventId === input.eventId ||
    (session?.status === "STOPPED" && session.expiresAt > now)
  )
    return true;
  // An ambiguous send is never retried automatically after a crashed worker.
  if (session?.status.startsWith("PROCESSING:")) {
    if (session.updatedAt.getTime() < now.getTime() - 90_000)
      await client.automationFlowSession.updateMany({
        where: {
          id: session.id,
          status: session.status,
          updatedAt: session.updatedAt,
        },
        data: { status: "FAILED" },
      });
    return true;
  }
  if (input.startEventId && session?.startEventId === input.startEventId)
    return true;
  const resuming =
    !input.automationId &&
    (session?.status === "WAITING" || (scheduled && session?.status === "SCHEDULED")) &&
    session.expiresAt > now;
  const automationId =
    input.automationId ?? (resuming ? session?.automationId : undefined);
  if (!automationId) return false;
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      integrationId: input.integrationId,
      active: true,
      archivedAt: null,
      User: { status: { not: "SUSPENDED" } },
    },
    include: {
      listener: true,
      integration: true,
      User: { include: { subscription: true } },
    },
  });
  const integration = automation?.integration;
  const flow = readFlow(
    resuming ? session?.definition : automation?.listener?.flowDefinition,
  );
  if (
    !flow ||
    !automation?.userId ||
    !integration ||
    integration.status !== "CONNECTED" ||
    integration.reconnectRequired ||
    integration.planLocked ||
    integration.userId !== automation.userId ||
    !["PRO", "BUSINESS"].includes(automation.User?.subscription?.plan ?? "FREE")
  ) {
    if (resuming && session)
      await client.automationFlowSession.update({
        where: { id: session.id },
        data: { status: "CANCELLED", resumeAt: null },
      });
    return Boolean(input.automationId);
  }
  const startingNode = input.startNodeId === undefined ? flow.entry : input.startNodeId;
  if (!resuming && startingNode !== null && !flow.nodes.some(node => node.id === startingNode)) return true;
  const initialValues: FlowValues = Object.fromEntries(Object.entries(input.initialValues ?? {}).filter(([key, value]) => /^[a-zA-Z0-9_-]{1,60}$/.test(key) && !isReservedField(key) && typeof value === "string" && value.length <= 1000));
  const token = resolveIntegrationSendToken(integration);
  if (!token.ok || !integration.instagramId) return true;
  if (resuming && session) {
    // A manual response ends the bot's turn rather than competing with the owner.
    const humanReply = await client.inboxMessage.findFirst({
      where: {
        conversation: {
          integrationId: integration.id,
          recipientIgId: input.recipientIgId,
        },
        direction: "OUTBOUND",
        createdAt: { gt: session.updatedAt },
      },
      select: { id: true },
    });
    if (humanReply) {
      await client.automationFlowSession.update({
        where: { id: session.id },
        data: { status: "CANCELLED", resumeAt: null },
      });
      return true;
    }
  }
  const receipt = await client.automationFlowReceipt.createMany({
    data: [{ ...key, automationId, eventId: input.eventId }],
    skipDuplicates: true,
  });
  if (!receipt.count) return true;
  const lease = `PROCESSING:${crypto.randomUUID()}`;
  const expiresAt = new Date(input.inboundAt.getTime() + 86400000);
  try {
    if (!session) {
      session = await client.automationFlowSession.create({
        data: {
          ...key,
          automationId,
          definition: flow as Prisma.InputJsonValue,
          nodeId: startingNode,
          status: lease,
          expiresAt,
          lastEventId: input.eventId,
          startEventId: input.startEventId ?? input.eventId,
        },
      });
    } else {
      const claim = await client.automationFlowSession.updateMany({
        where: {
          id: session.id,
          status: session.status,
          updatedAt: session.updatedAt,
        },
        data: {
          status: lease,
          expiresAt,
          lastEventId: input.eventId,
          ...(!resuming
            ? {
                automationId,
                definition: flow as Prisma.InputJsonValue,
                values: initialValues,
                nodeId: startingNode,
                startedAt: now,
                startEventId: input.startEventId ?? input.eventId,
              }
            : {}),
        },
      });
      if (!claim.count) return true;
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return true;
    throw e;
  }
  const sessionId = session.id;
  const persist = async (
    status: string,
    nodeId: string | null,
    values: FlowValues,
  ) =>
    client.automationFlowSession.updateMany({
      where: { id: sessionId, status: lease },
      data: { status, nodeId, values, resumeAt: null },
    });
  let values: FlowValues =
    resuming &&
    session.values &&
    typeof session.values === "object" &&
    !Array.isArray(session.values)
      ? Object.fromEntries(
          Object.entries(session.values).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : {};
  const saveContactFields = async (updates: FlowValues, remove: string[] = []) => {
    const custom = Object.fromEntries(Object.entries(updates).filter(([key]) => key !== "email" && key !== "phone" && !isReservedField(key)));
    const contactKey = { automationId_igUserId: { automationId, igUserId: input.recipientIgId } };
    const existing = Object.keys(custom).length || remove.length ? await client.lead.findUnique({ where: contactKey, select: { customFields: true } }) : null;
    const prior = existing?.customFields && typeof existing.customFields === "object" && !Array.isArray(existing.customFields) ? existing.customFields : {};
    const merged = { ...prior, ...custom };
    for (const key of remove) delete merged[key];
    const data = {
      ...(updates.email ? { email: updates.email, emailCollectedAt: now } : {}),
      ...(updates.phone ? { phone: updates.phone } : {}),
      ...((Object.keys(custom).length || remove.length) ? { customFields: merged as Prisma.InputJsonValue } : {}),
    };
    if (Object.keys(data).length) await client.lead.upsert({ where: contactKey, create: { automationId, igUserId: input.recipientIgId, ...data }, update: data });
  };
  let nodeId = resuming ? session.nodeId : startingNode;
  let sentCount = 0;
  let webhookCount = 0;
  try {
    if (!resuming) {
      const contact = await client.lead.findUnique({ where: { automationId_igUserId: { automationId, igUserId: input.recipientIgId } }, select: { email: true, phone: true, customFields: true } });
      const stored = contact?.customFields;
      if (stored && typeof stored === "object" && !Array.isArray(stored))
        for (const [key, value] of Object.entries(stored)) if (typeof value === "string" && !isReservedField(key)) values[key] = value;
      if (contact?.email) values.email = contact.email;
      if (contact?.phone) values.phone = contact.phone;
      values = { ...values, ...initialValues };
      if (Object.keys(initialValues).length) await saveContactFields(initialValues);
    }
    if (!resuming)
      await client.automationEngagementJob.updateMany({
        where: {
          recipientIgId: input.recipientIgId,
          kind: "EMAIL",
          status: { in: ["WAITING", "PENDING"] },
          automation: { integrationId: input.integrationId },
        },
        data: { status: "CANCELLED" },
      });
    if (!resuming && flow.oncePerContact) {
      const entry = await client.automationFlowEntry.createMany({
        data: [{ automationId, recipientIgId: input.recipientIgId }],
        skipDuplicates: true,
      });
      if (!entry.count) {
        await persist("COMPLETED", null, values);
        return true;
      }
    }
    if (resuming && !scheduled) {
      const waiting = flow.nodes.find((n) => n.id === nodeId);
      const response = waiting ? responseTarget(waiting, input.text) : null;
      if (!response) {
        await persist("WAITING", nodeId, values);
        return true;
      }
      values = { ...values, ...response.values };
      nodeId = response.next;
      await saveContactFields(response.values);
    }
    for (let steps = 0; nodeId && steps < 50; steps++) {
      const node = flow.nodes.find((n) => n.id === nodeId);
      if (!node) throw new Error("flow_step_missing");
      if (node.kind === "delay") {
        const resumeAt = new Date(Date.now() + node.seconds * 1000);
        await client.automationFlowSession.updateMany({
          where: { id: sessionId, status: lease },
          data: { status: resumeAt < expiresAt ? "SCHEDULED" : "CANCELLED", nodeId: node.next, values, resumeAt: resumeAt < expiresAt ? resumeAt : null },
        });
        // Persist first. A failed wake, request timeout, or deployment restart is
        // recovered by the authenticated scheduler with the very same receipt.
        if (!scheduled && input.scheduleWake && node.seconds <= 30 && resumeAt < expiresAt && Date.now() - now.getTime() < 15_000) {
          const wake = new Promise<void>(resolve => setTimeout(resolve, Math.max(0, resumeAt.getTime() - Date.now())))
            .then(() => processAutomationFlow({
              integrationId: input.integrationId, recipientIgId: input.recipientIgId,
              text: "", eventId: `delay:${sessionId}:${resumeAt.toISOString()}`,
              scheduled: { sessionId, resumeAt },
            }))
            .catch(() => { console.warn("[automation-flow] short delay wake failed", { sessionId }); });
          input.scheduleWake(wake);
        }
        return true;
      }
      // Save the selected outcome before sending. A retry cannot redraw a giveaway.
      if (
        node.kind === "random" ||
        node.kind === "condition" ||
        node.kind === "tag" ||
        node.kind === "setfield"
      ) {
        if (node.kind === "condition" && !isReservedField(node.field) && values[node.field] === undefined) {
          const lead = await client.lead.findUnique({ where: { automationId_igUserId: { automationId, igUserId: input.recipientIgId } }, select: { email: true, phone: true, customFields: true } });
          const customFields = lead?.customFields;
          const value = node.field === "email" || node.field === "phone" ? lead?.[node.field] :
            customFields && typeof customFields === "object" && !Array.isArray(customFields) ? customFields[node.field] : undefined;
          if (typeof value === "string") values[node.field] = value;
        }
        if (node.kind === "condition" && node.field === "_linkClicked") {
          const click = await client.automationClick.findUnique({ where: { automationId_recipientIgId: { automationId, recipientIgId: input.recipientIgId } }, select: { id: true } });
          values._linkClicked = String(Boolean(click));
        }
        if (node.kind === "condition" && isProfileField(node.field)) {
          // Do not trust cached or editable session fields for Meta profile facts.
          for (const field of PROFILE_FIELDS) delete values[field];
          const profile = await getInstagramRecipientProfile({ token: token.token, recipientId: input.recipientIgId });
          const fields = {
            _followsBusiness: profile?.followsBusiness, _businessFollows: profile?.businessFollows,
            _verified: profile?.verified, _followerCount: profile?.followerCount,
          };
          for (const [key, value] of Object.entries(fields))
            if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) values[key] = String(value);
          if (node.field === "_followsBusiness" && typeof profile?.followsBusiness === "boolean") await observeAutomationFollow({
            integrationId: integration.id, automationId, recipientIgId: input.recipientIgId, followsBusiness: profile.followsBusiness,
          });
        }
        if (node.kind === "setfield") {
          values[node.field] = resolveFlowText(node.value, values);
          await saveContactFields({ [node.field]: values[node.field] });
        }
        if (node.kind === "tag") {
          if (node.action === "remove") {
            values = applyFlowTag(values, node.tag, "remove");
            await saveContactFields({}, [`tag_${node.tag}`]);
          } else {
            values = applyFlowTag(values, node.tag);
            await saveContactFields({ [`tag_${node.tag}`]: "true" });
          }
        }
        nodeId = branchTarget(
          node,
          values,
          randomInt(0, 1_000_000) / 1_000_000,
        );
        if (node.kind === "random" && flow.oncePerContact) {
          await client.automationFlowEntry.updateMany({
            where: { automationId, recipientIgId: input.recipientIgId },
            data: {
              outcome:
                flow.nodes.find((n) => n.id === nodeId)?.label ?? "Finished",
            },
          });
        }
        await persist(lease, nodeId, values);
        continue;
      }
      if (node.kind === "webhook") {
        if (++webhookCount > 3) throw new Error("flow_webhook_limit");
        // This external side effect uses the same non-retriable receipt and lease
        // as message delivery. A crash or ambiguous timeout never replays it.
        const owned = await client.automationFlowSession.findFirst({ where: { id: sessionId, status: lease }, select: { id: true } });
        const active = await client.automation.findFirst({ where: {
          id: automationId, integrationId: input.integrationId, userId: automation.userId,
          active: true, archivedAt: null, integration: { status: "CONNECTED", reconnectRequired: false, planLocked: false },
          User: { status: { not: "SUSPENDED" }, subscription: { plan: { in: ["PRO", "BUSINESS"] } } },
        }, select: { id: true } });
        if (!owned || !active || !messagingWindowOpen(input.inboundAt)) { await persist("CANCELLED", nodeId, values); return true; }
        const idempotencyKey = createHash("sha256").update(`${integration.id}:${input.recipientIgId}:${input.eventId}:${node.id}`).digest("hex");
        await executeFlowWebhook({ url: node.url, body: node.body, values, idempotencyKey, beforeSend: async () => {
          const leaseOwned = await client.automationFlowSession.findFirst({ where: { id: sessionId, status: lease }, select: { id: true } });
          const stillActive = await client.automation.findFirst({ where: {
            id: automationId, integrationId: input.integrationId, userId: automation.userId, active: true, archivedAt: null,
            integration: { status: "CONNECTED", reconnectRequired: false, planLocked: false },
            User: { status: { not: "SUSPENDED" }, subscription: { plan: { in: ["PRO", "BUSINESS"] } } },
          }, select: { id: true } });
          return Boolean(leaseOwned && stillActive && input.inboundAt && messagingWindowOpen(input.inboundAt));
        } });
        nodeId = node.next;
        await persist(lease, nodeId, values);
        continue;
      }
      if (node.kind === "end") {
        nodeId = null;
        break;
      }
      if (
        ++sentCount > 6 ||
        !messagingWindowOpen(input.inboundAt) ||
        !(await canSendStaticReply(automation.userId)).ok
      )
        throw new Error("flow_delivery_limit");
      const owned = await client.automationFlowSession.findFirst({
        where: { id: sessionId, status: lease },
        select: { id: true },
      });
      const active = await client.automation.findFirst({
        where: {
          id: automationId,
          integrationId: input.integrationId,
          userId: automation.userId,
          active: true,
          archivedAt: null,
          integration: {
            status: "CONNECTED",
            reconnectRequired: false,
            planLocked: false,
          },
          User: { status: { not: "SUSPENDED" }, subscription: { plan: { in: ["PRO", "BUSINESS"] } } },
        },
        select: { id: true },
      });
      if (!owned || !active) {
        await persist("CANCELLED", nodeId, values);
        return true;
      }
      const text =
        resolveFlowText(node.text, values) +
        (node.kind === "question"
            ? "\n\nReply with one of the options below, or STOP to cancel."
            : "");
      if (!messagingWindowOpen(input.inboundAt)) { await persist("CANCELLED", nodeId, values); return true; }
      const result = await sendInstagramDirectResponse({
        token: token.token,
        igBusinessAccountId: integration.instagramId,
        recipientId: input.recipientIgId,
        automationId,
        message: text,
        responseFormat:
          node.kind === "product" || node.kind === "carousel"
            ? "PRODUCT_CARD"
            : "links" in node && node.links.length
              ? "LINK"
              : "TEXT",
        linkButtons: "links" in node ? node.links : [],
        quickReplies:
          node.kind === "question" ? node.options.map((o) => o.label) : [],
        mediaUrl: node.kind === "product" ? node.image : undefined,
        mediaType: node.kind === "product" ? "IMAGE" : undefined,
        cardSubtitle: node.kind === "product" ? node.subtitle : undefined,
        carouselCards: node.kind === "carousel" ? node.cards.map(card => ({ ...card, title: resolveFlowText(card.title, values), subtitle: resolveFlowText(card.subtitle, values) })) : undefined,
      });
      await createMessageLog({
        automationId,
        recipientIgId: input.recipientIgId,
        commentId: `${input.eventId}:${node.id}`,
        messageType: "DM",
        status: result.ok ? "SENT" : "FAILED",
        errorMessage: result.ok ? "flow_step_sent" : "flow_step_failed",
      });
      if (!result.ok) throw new Error("flow_step_failed");
      await trackResponse(automationId, "DM");
      await recordOutboundInboxMessage({
        userId: automation.userId,
        integrationId: integration.id,
        recipientIgId: input.recipientIgId,
        automationId,
        content: text,
        metaMessageId: result.messageIds[0],
      });
      await createAutomationEvent({
        automationId,
        eventType: "DM_SENT",
        igUserId: input.recipientIgId,
        meta: { flowNodeId: node.id, flowNodeKind: node.kind },
      });
      if (node.kind === "email" || node.kind === "phone" || node.kind === "capture" || node.kind === "question") {
        await persist("WAITING", node.id, values);
        return true;
      }
      nodeId = node.next;
      await persist(lease, nodeId, values);
    }
    if (nodeId) throw new Error("flow_step_limit");
    await persist("COMPLETED", null, values);
  } catch (error) {
    await persist("FAILED", nodeId, values);
    await createAutomationEvent({
      automationId,
      eventType: "DM_FAILED",
      igUserId: input.recipientIgId,
      meta: {
        reason: error instanceof Error ? error.message : "flow_failed",
        flowNodeId: nodeId,
      },
    });
  }
  return true;
}
