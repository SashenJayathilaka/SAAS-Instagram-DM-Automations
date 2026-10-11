"use server";

import { normalizeCopyList, readCommentReplies, MAX_MESSAGE_VARIATIONS } from "@/lib/automation-copy";

import {
  adminFormString,
  createAdminAuditLog,
  requireAdminAction,
  requireReason,
  requireTypedConfirmation,
} from "@/actions/admin/safe-actions";
import { subscribeInstagramWebhooks, formatSafeMetaError } from "@/lib/fetch";
import { planReconnectCleanup } from "@/lib/account-webhook-diagnostics";
import { client } from "@/lib/prisma";
import { canActivateCampaign } from "@/actions/usage/queries";
import { revalidatePath } from "next/cache";

function safeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function adminMutation<T>(input: {
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  reason?: string | null;
  confirmation?: string | null;
  metadata?: unknown;
  run: (admin: Awaited<ReturnType<typeof requireAdminAction>>) => Promise<{ before?: unknown; after?: unknown; metadata?: unknown; result?: T }>;
}) {
  const admin = await requireAdminAction();
  try {
    const result = await input.run(admin);
    await createAdminAuditLog({
      admin,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      reason: input.reason,
      confirmation: input.confirmation,
      before: result.before,
      after: result.after,
      metadata: { ...((input.metadata as object) ?? {}), ...((result.metadata as object) ?? {}), result: result.result },
      status: "SUCCESS",
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard", "layout");
    return { status: 200 as const, data: result.result ?? "OK" };
  } catch (error) {
    await createAdminAuditLog({
      admin,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      reason: input.reason,
      confirmation: input.confirmation,
      metadata: input.metadata,
      status: "FAILED",
      error: safeError(error),
    });
    return { status: 500 as const, data: safeError(error) };
  }
}

export async function suspendUserAction(formData: FormData) {
  const admin = await requireAdminAction();
  const userId = adminFormString(formData, "userId");
  const reason = adminFormString(formData, "reason");
  const confirmation = adminFormString(formData, "confirmation");
  requireReason(reason);
  await requireTypedConfirmation({ admin, action: "SUSPEND_USER", targetType: "User", targetId: userId, reason, confirmation, expected: "SUSPEND" });

  return adminMutation({
    action: "SUSPEND_USER",
    targetType: "User",
    targetId: userId,
    reason,
    confirmation,
    run: async () => {
      const before = await client.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, status: true, suspendedAt: true, suspendedReason: true },
      });
      if (!before) throw new Error("User not found.");
      const after = await client.user.update({
        where: { id: userId },
        data: { status: "SUSPENDED", suspendedAt: new Date(), suspendedReason: reason },
        select: { id: true, email: true, status: true, suspendedAt: true, suspendedReason: true },
      });
      await client.automation.updateMany({ where: { userId }, data: { active: false } });
      return { before, after, result: "User suspended and active campaigns paused." };
    },
  });
}

export async function unsuspendUserAction(formData: FormData) {
  const userId = adminFormString(formData, "userId");
  const reason = adminFormString(formData, "reason");
  requireReason(reason);

  return adminMutation({
    action: "UNSUSPEND_USER",
    targetType: "User",
    targetId: userId,
    reason,
    run: async () => {
      const before = await client.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, status: true, suspendedAt: true, suspendedReason: true },
      });
      if (!before) throw new Error("User not found.");
      const after = await client.user.update({
        where: { id: userId },
        data: { status: "ACTIVE", suspendedAt: null, suspendedReason: null },
        select: { id: true, email: true, status: true, suspendedAt: true, suspendedReason: true },
      });
      return { before, after, result: "User unsuspended." };
    },
  });
}

export async function markIntegrationReconnectRequiredAction(formData: FormData) {
  const integrationId = adminFormString(formData, "integrationId");
  const reason = adminFormString(formData, "reason");
  requireReason(reason);

  return adminMutation({
    action: "MARK_INTEGRATION_RECONNECT_REQUIRED",
    targetType: "Integration",
    targetId: integrationId,
    reason,
    run: async () => {
      const before = await client.integrations.findUnique({
        where: { id: integrationId },
        select: { id: true, status: true, reconnectRequired: true, instagramUsername: true, lastAdminNote: true },
      });
      if (!before) throw new Error("Integration not found.");
      const after = await client.integrations.update({
        where: { id: integrationId },
        data: {
          status: "ERROR",
          reconnectRequired: true,
          lastAdminNote: reason,
          lastAdminActionAt: new Date(),
        },
        select: { id: true, status: true, reconnectRequired: true, instagramUsername: true, lastAdminNote: true, lastAdminActionAt: true },
      });
      return { before, after, result: "Reconnect required." };
    },
  });
}

export async function disconnectIntegrationAction(formData: FormData) {
  const admin = await requireAdminAction();
  const integrationId = adminFormString(formData, "integrationId");
  const reason = adminFormString(formData, "reason");
  const confirmation = adminFormString(formData, "confirmation");
  requireReason(reason);
  await requireTypedConfirmation({ admin, action: "DISCONNECT_INTEGRATION", targetType: "Integration", targetId: integrationId, reason, confirmation, expected: "DISCONNECT" });

  return adminMutation({
    action: "DISCONNECT_INTEGRATION",
    targetType: "Integration",
    targetId: integrationId,
    reason,
    confirmation,
    run: async () => {
      const before = await client.integrations.findUnique({
        where: { id: integrationId },
        select: { id: true, userId: true, status: true, reconnectRequired: true, instagramUsername: true, pageId: true, instagramId: true },
      });
      if (!before) throw new Error("Integration not found.");
      if (!before.userId) throw new Error("Integration is not attached to a user.");
      const [after, paused] = await client.$transaction([
        client.integrations.update({
          where: { id: integrationId },
          data: {
            status: "DISCONNECTED",
            disconnectedAt: new Date(),
            disconnectedReason: reason,
            reconnectRequired: true,
            lastAdminNote: reason,
            lastAdminActionAt: new Date(),
          },
          select: { id: true, userId: true, status: true, reconnectRequired: true, disconnectedAt: true, disconnectedReason: true },
        }),
        client.automation.updateMany({
          where: { userId: before.userId, active: true },
          data: { active: false },
        }),
      ]);
      return { before, after, metadata: { pausedCampaigns: paused.count }, result: `${paused.count} active campaign(s) paused.` };
    },
  });
}

export async function resubscribeIntegrationAction(formData: FormData) {
  const integrationId = adminFormString(formData, "integrationId");
  const reason = adminFormString(formData, "reason") || "Admin webhook resubscribe";

  return adminMutation({
    action: "RESUBSCRIBE_INTEGRATION_WEBHOOKS",
    targetType: "Integration",
    targetId: integrationId,
    reason,
    run: async () => {
      const before = await client.integrations.findUnique({
        where: { id: integrationId },
        select: { id: true, pageId: true, token: true, webhookSubscriptionMode: true, webhookSubscriptionSubscribed: true, webhookSubscriptionError: true },
      });
      if (!before) throw new Error("Integration not found.");
      if (!before.pageId || !before.token) throw new Error("Integration is missing page connection data.");

      const attemptedAt = new Date();
      try {
        const subscription = await subscribeInstagramWebhooks(before.pageId, before.token);
        const subscribed = subscription.status >= 200 && subscription.status < 300;
        const after = await client.integrations.update({
          where: { id: integrationId },
          data: {
            webhookSubscriptionLastAttemptedAt: attemptedAt,
            webhookSubscriptionStatusCode: subscription.status,
            webhookSubscriptionSubscribed: subscribed,
            webhookSubscriptionMode: subscribed ? "API_SUBSCRIBED" : "FAILED",
            webhookSubscriptionError: subscribed ? null : "Meta rejected webhook subscription.",
            lastAdminActionAt: attemptedAt,
            lastAdminNote: reason,
          },
          select: { id: true, webhookSubscriptionMode: true, webhookSubscriptionSubscribed: true, webhookSubscriptionStatusCode: true, webhookSubscriptionError: true },
        });
        return { before, after, result: subscribed ? "Webhook subscription refreshed." : "Webhook subscription attempted but Meta rejected it." };
      } catch (error) {
        const after = await client.integrations.update({
          where: { id: integrationId },
          data: {
            webhookSubscriptionLastAttemptedAt: attemptedAt,
            webhookSubscriptionSubscribed: false,
            webhookSubscriptionMode: "FAILED",
            webhookSubscriptionError: formatSafeMetaError(error) || "Meta rejected webhook subscription.",
            lastAdminActionAt: attemptedAt,
            lastAdminNote: reason,
          },
          select: { id: true, webhookSubscriptionMode: true, webhookSubscriptionSubscribed: true, webhookSubscriptionStatusCode: true, webhookSubscriptionError: true },
        });
        return { before, after, result: "Webhook subscription failed." };
      }
    },
  });
}

export async function repairIntegrationConnectionAction(formData: FormData) {
  const integrationId = adminFormString(formData, "integrationId");
  const reason = adminFormString(formData, "reason") || "Repair Instagram connection";

  return adminMutation({
    action: "REPAIR_INSTAGRAM_CONNECTION",
    targetType: "Integration",
    targetId: integrationId,
    reason,
    run: async () => {
      const current = await client.integrations.findUnique({
        where: { id: integrationId },
        select: {
          id: true,
          userId: true,
          instagramId: true,
          instagramUsername: true,
          webhookAccountId: true,
          pageId: true,
          businessId: true,
          status: true,
        },
      });
      if (!current?.userId) throw new Error("Active integration not found.");

      const [integrations, campaigns] = await Promise.all([
        client.integrations.findMany({
          where: { userId: current.userId, name: "INSTAGRAM" },
          select: {
            id: true,
            userId: true,
            instagramId: true,
            instagramUsername: true,
            webhookAccountId: true,
            pageId: true,
            businessId: true,
            status: true,
          },
        }),
        client.automation.findMany({
          where: { userId: current.userId, archivedAt: null },
          select: {
            id: true,
            name: true,
            active: true,
            userId: true,
            posts: { select: { postid: true } },
            User: {
              select: {
                integrations: {
                  where: { name: "INSTAGRAM" },
                  select: {
                    id: true,
                    userId: true,
                    instagramId: true,
                    instagramUsername: true,
                    status: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      const plan = planReconnectCleanup({ current, integrations, campaigns });
      const [disabled, paused, after] = await client.$transaction([
        client.integrations.updateMany({
          where: { id: { in: plan.staleIntegrationIds } },
          data: {
            status: "DISCONNECTED",
            disconnectedAt: new Date(),
            disconnectedReason: reason,
            reconnectRequired: true,
            lastAdminNote: reason,
            lastAdminActionAt: new Date(),
          },
        }),
        client.automation.updateMany({
          where: { id: { in: plan.shouldPauseCampaignIds } },
          data: { active: false },
        }),
        client.integrations.update({
          where: { id: current.id },
          data: {
            status: "CONNECTED",
            reconnectRequired: false,
            lastAdminNote: reason,
            lastAdminActionAt: new Date(),
          },
          select: {
            id: true,
            instagramId: true,
            instagramUsername: true,
            status: true,
            reconnectRequired: true,
            lastAdminActionAt: true,
          },
        }),
      ]);

      return {
        before: { current, staleIntegrationIds: plan.staleIntegrationIds },
        after,
        metadata: {
          oldIntegrationsDisabled: disabled.count,
          activeIntegrationId: current.id,
          activeCampaignsNeedingRecreation: plan.campaignsNeedingRecreation.map((campaign) => campaign.id),
          currentInstagramId: current.instagramId,
          pausedCampaigns: paused.count,
        },
        result: {
          oldIntegrationsDisabled: disabled.count,
          activeIntegrationId: current.id,
          activeCampaignsNeedingRecreation: plan.campaignsNeedingRecreation.map((campaign) => campaign.id),
          currentInstagramId: current.instagramId,
          pausedCampaigns: paused.count,
        },
      };
    },
  });
}

export async function setCampaignActiveAction(formData: FormData) {
  const admin = await requireAdminAction();
  const automationId = adminFormString(formData, "automationId");
  const desired = adminFormString(formData, "active") === "true";
  const reason = adminFormString(formData, "reason");
  const confirmation = adminFormString(formData, "confirmation");
  const expected = desired ? "ACTIVATE" : "PAUSE";
  requireReason(reason);
  await requireTypedConfirmation({ admin, action: desired ? "ACTIVATE_CAMPAIGN" : "PAUSE_CAMPAIGN", targetType: "Automation", targetId: automationId, reason, confirmation, expected });

  return adminMutation({
    action: desired ? "ACTIVATE_CAMPAIGN" : "PAUSE_CAMPAIGN",
    targetType: "Automation",
    targetId: automationId,
    reason,
    confirmation,
    run: async () => {
      const before = await client.automation.findUnique({
        where: { id: automationId },
        include: { User: { select: { id: true, status: true } }, integration: { select: { status: true, reconnectRequired: true, planLocked: true } } },
      });
      if (!before) throw new Error("Campaign not found.");
      if (desired) {
        if (before.needsReview) throw new Error(before.reviewReason ?? "Campaign needs review before activation.");
        if (before.archivedAt) throw new Error("Archived campaigns cannot be activated.");
        if (before.User?.status === "SUSPENDED") throw new Error("Suspended users cannot activate campaigns.");
        if (!before.integration || before.integration.status !== "CONNECTED" || before.integration.reconnectRequired || before.integration.planLocked) {
          throw new Error("Campaign cannot activate while integration is disconnected or reconnect-required.");
        }
        const activation = before.userId ? await canActivateCampaign(before.userId, automationId) : { ok: false };
        if (!activation.ok) throw new Error("Plan active campaign limit reached.");
      }
      const after = await client.automation.update({
        where: { id: automationId },
        data: { active: desired },
        select: { id: true, name: true, active: true, archivedAt: true },
      });
      return { before: { id: before.id, name: before.name, active: before.active, archivedAt: before.archivedAt }, after, result: desired ? "Campaign activated." : "Campaign paused." };
    },
  });
}

export async function duplicateCampaignAction(formData: FormData) {
  const automationId = adminFormString(formData, "automationId");
  const reason = adminFormString(formData, "reason") || "Admin duplicate";

  return adminMutation({
    action: "DUPLICATE_CAMPAIGN",
    targetType: "Automation",
    targetId: automationId,
    reason,
    run: async () => {
      const before = await client.automation.findUnique({
        where: { id: automationId },
        include: { keywords: true, posts: true, listener: true },
      });
      if (!before?.listener || !before.posts[0] || !before.userId) {
        throw new Error("Campaign cannot be duplicated until it has a post and listener.");
      }
      const post = before.posts[0];
      const after = await client.automation.create({
        data: {
          userId: before.userId,
          integrationId: before.integrationId,
          name: `${before.name || "Untitled campaign"} copy`,
          active: false,
          needsReview: false,
          reviewReason: null,
          matchingMode: before.matchingMode,
          triggerMode: before.triggerMode,
          sendPrivateDm: before.sendPrivateDm,
          posts: { create: { postid: post.postid, caption: post.caption, media: post.media, mediaType: post.mediaType } },
          ...(before.keywords.length > 0 && {
            keywords: { createMany: { data: before.keywords.map((keyword) => ({ word: keyword.word })), skipDuplicates: true } },
          }),
          trigger: { create: { type: "COMMENT" } },
          listener: {
            create: {
              listener: "MESSAGE",
              prompt: before.listener.prompt,
              commentReply: before.listener.commentReply,
              commentReply2: before.listener.commentReply2,
              commentReply3: before.listener.commentReply3,
              commentReplies: readCommentReplies(before.listener),
              messageVariations: normalizeCopyList(before.listener.messageVariations, MAX_MESSAGE_VARIATIONS),
              publicReplyLimit: before.listener.publicReplyLimit,
              ctaLink: before.listener.ctaLink,
              ctaButtonTitle: before.listener.ctaButtonTitle,
            },
          },
        },
        select: { id: true, name: true, active: true },
      });
      return { before: { id: before.id, name: before.name }, after, result: after.id };
    },
  });
}

export async function archiveCampaignAction(formData: FormData) {
  const admin = await requireAdminAction();
  const automationId = adminFormString(formData, "automationId");
  const reason = adminFormString(formData, "reason");
  const confirmation = adminFormString(formData, "confirmation");
  requireReason(reason);
  await requireTypedConfirmation({ admin, action: "ARCHIVE_CAMPAIGN", targetType: "Automation", targetId: automationId, reason, confirmation, expected: "ARCHIVE" });

  return adminMutation({
    action: "ARCHIVE_CAMPAIGN",
    targetType: "Automation",
    targetId: automationId,
    reason,
    confirmation,
    run: async (adminIdentity) => {
      const before = await client.automation.findUnique({
        where: { id: automationId },
        select: { id: true, name: true, active: true, archivedAt: true, archiveReason: true },
      });
      if (!before) throw new Error("Campaign not found.");
      const after = await client.automation.update({
        where: { id: automationId },
        data: {
          active: false,
          archivedAt: new Date(),
          archivedByAdminEmail: adminIdentity.email ?? adminIdentity.clerkId,
          archiveReason: reason,
        },
        select: { id: true, name: true, active: true, archivedAt: true, archivedByAdminEmail: true, archiveReason: true },
      });
      return { before, after, result: "Campaign archived." };
    },
  });
}
