import { withAutomationPlanWrite } from "@/lib/automation-plan-entitlements";
import { prepareNextPost, readNextPost } from "@/lib/next-post";
import "server-only";
import { normalizeStepDelays } from "@/lib/automation-step-delays";
import { normalizeStoryConfig, readStoryConfig } from "@/lib/story-automation";
import {attachmentId} from "@/lib/message-attachment";
import {attachmentScopeFilter} from "@/lib/attachment-scope";
import { normalizeEngagementSettings } from "@/lib/automation-engagement-settings";
import {
  normalizeCopyList,
  readCommentReplies,
  MAX_MESSAGE_VARIATIONS,
} from "@/lib/automation-copy";

import { readAiConversation } from "@/lib/ai-conversation";

import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { client } from "@/lib/prisma";
import type { NormalizedCampaignPayload } from "@/lib/campaign-save";
import type { NormalizedMessageAutomationPayload } from "@/lib/message-automation";
import {
  resolveFollowRequestButtonText,
  resolveFollowRequestDmText,
} from "@/lib/comment-dm-flow";
import { readLegacyQuickReplies, readLinkButtons } from "@/lib/link-buttons";
import { Prisma, type MATCHING_MODE } from "@prisma/client";
import {
  normalizeAiProtectionRules,
  normalizeAiReplyTone,
} from "@/lib/ai-reply-config";

export type CampaignPayload = NormalizedCampaignPayload;

export const logTenantAccessDenied = async ({
  route,
  clerkId,
  resource,
  resourceId,
}: {
  route: string;
  clerkId?: string;
  resource: string;
  resourceId?: string;
}) => {
  let targetResourceExists = false;

  try {
    if (resource === "Automation" && resourceId) {
      targetResourceExists = Boolean(
        await client.automation.findUnique({
          where: { id: resourceId },
          select: { id: true },
        }),
      );
    }
  } catch {
    targetResourceExists = false;
  }

  console.warn("[tenant-denied]", {
    route,
    currentUserExists: Boolean(clerkId),
    targetResourceExists,
    ownershipMatch: false,
    resource,
  });
};

export const createAutomation = async (clerkId: string, id?: string) => {
  return await client.user.update({
    where: {
      clerkId,
    },
    data: {
      automations: {
        create: {
          integrationId: await currentInstagramAccountId(clerkId),
          ...(id && { id }),
        },
      },
    },
  });
};

export const createCompleteAutomation = async (
  clerkId: string,
  payload: CampaignPayload,
) => {
  const automationId = crypto.randomUUID();
  return withAutomationPlanWrite(clerkId, async (tx) => tx.user.update({
    where: { clerkId },
    data: {
      automations: {
        create: {
          id: automationId,
          integrationId: await currentInstagramAccountId(clerkId),
          name: payload.name,
          adAutomation: payload.adAutomation ?? false,
          active: payload.active,
          needsReview: false,
          reviewReason: null,
          matchingMode: payload.matchingMode,
          triggerMode: payload.triggerMode,
          sendPrivateDm: payload.sendPrivateDm,
          source: "COMMENT",
          storyTriggerType: null,
          followGateRequired: payload.followGateRequired,
          typingIndicator: payload.typingIndicator,
          deliveryDelaySeconds: payload.deliveryDelaySeconds,
          stepDelays: payload.stepDelays ?? Prisma.DbNull,
          ...("triggerOnShares" in payload ? { triggerOnShares: payload.triggerOnShares, oneDmPerUser: payload.oneDmPerUser } : {}),
          postConfig: prepareNextPost(payload.post.postid, payload.active, null) ?? Prisma.DbNull,
          posts: {
            create: payload.post,
          },
          ...(payload.keywords.length > 0 && {
            keywords: {
              createMany: {
                data: payload.keywords.map((word) => ({ word })),
                skipDuplicates: true,
              },
            },
          }),
          trigger: {
            create: { type: "COMMENT" },
          },
          listener: {
            create: payload.listener,
          },
        },
      },
    },
    select: {
      automations: {
        where: { id: automationId },
        select: { id: true },
      },
    },
  }), () => automationId);
};

function messageTriggers(payload: NormalizedMessageAutomationPayload) {
  if (payload.source === "DM") return [{type:"DM"}];
  return payload.storyConfig && payload.storyConfig.scope !== "MENTION" ? [{type:"STORY_REPLY"},{type:"STORY_REACTION"}] : [{type:`STORY_${payload.storyTriggerType}`}];
}

export const createCompleteMessageAutomation = async (
  clerkId: string,
  payload: NormalizedMessageAutomationPayload,
) => {
  const user = await client.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) return null;

  return withAutomationPlanWrite(clerkId, async (tx) => tx.automation.create({
    data: {
      userId: user.id,
      integrationId: await currentInstagramAccountId(clerkId),
      name: payload.name,
      active: payload.active,
      source: payload.source,
      storyTriggerType: payload.storyTriggerType,
      storyConfig: payload.storyConfig ? payload.storyConfig as unknown as Prisma.InputJsonValue : Prisma.DbNull,
      oneDmPerUser: payload.oneDmPerUser ?? false,
      triggerMode: payload.triggerMode,
      matchingMode: "CONTAINS",
      sendPrivateDm: true,
      followGateRequired: payload.followGateRequired,
      typingIndicator: payload.typingIndicator,
      deliveryDelaySeconds: payload.deliveryDelaySeconds,
          stepDelays: payload.stepDelays ?? Prisma.DbNull,
      needsReview: false,
      reviewReason: null,
      ...(payload.keywords.length > 0 && {
        keywords: {
          createMany: {
            data: payload.keywords.map((word) => ({ word })),
            skipDuplicates: true,
          },
        },
      }),
      trigger: { create: messageTriggers(payload) },
      listener: {
        create: {
          listener: "MESSAGE",
          ...normalizeEngagementSettings(payload),
          prompt: payload.message,
          openingDmFormat: payload.openingDmFormat || "BUTTON",
          openingDmEnabled: payload.openingDmEnabled ?? false,
          openingDmText: payload.openingDmText,
          openingDmButtonText: payload.openingDmButtonText,
          cardSubtitle: payload.storyConfig?.cards[0]?.subtitle,
          messageVariations: payload.messageVariations ?? [],
          responseFormat: payload.responseFormat,
          quickReplies: payload.quickReplies,
          ctaLink: payload.ctaLink,
          ctaButtonTitle: payload.ctaButtonTitle,
          mediaUrl: payload.mediaUrl,
          mediaType: payload.mediaType,
          followRequestDmText: payload.followRequestDmText,
          followRequestButtonText: payload.followRequestButtonText,
          aiDmReplyEnabled: payload.aiReplyEnabled,
          aiConversation: payload.aiConversation,
        },
      },
    },
    select: { id: true },
  }), result => result.id);
};

export const updateCompleteMessageAutomation = async (
  automationId: string,
  clerkId: string,
  payload: NormalizedMessageAutomationPayload,
) => {
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    select: { id: true },
  });
  if (!automation) return null;

  return withAutomationPlanWrite(clerkId, async (tx) => {
    await tx.keyword.deleteMany({ where: { automationId } });
    await tx.trigger.deleteMany({ where: { automationId } });
    await tx.listener.deleteMany({ where: { automationId } });

    return tx.automation.update({
      where: { id: automationId },
      data: {
        name: payload.name,
        active: payload.active,
        source: payload.source,
        storyTriggerType: payload.storyTriggerType,
      storyConfig: payload.storyConfig ? payload.storyConfig as unknown as Prisma.InputJsonValue : Prisma.DbNull,
      oneDmPerUser: payload.oneDmPerUser ?? false,
        triggerMode: payload.triggerMode,
        matchingMode: "CONTAINS",
        sendPrivateDm: true,
        followGateRequired: payload.followGateRequired,
        typingIndicator: payload.typingIndicator,
        deliveryDelaySeconds: payload.deliveryDelaySeconds,
          stepDelays: payload.stepDelays ?? Prisma.DbNull,
        needsReview: false,
        reviewReason: null,
        ...(payload.keywords.length > 0 && {
          keywords: {
            createMany: {
              data: payload.keywords.map((word) => ({ word })),
              skipDuplicates: true,
            },
          },
        }),
        trigger: { create: messageTriggers(payload) },
        listener: {
          create: {
            listener: "MESSAGE",
            ...normalizeEngagementSettings(payload),
            prompt: payload.message,
          openingDmFormat: payload.openingDmFormat || "BUTTON",
          openingDmEnabled: payload.openingDmEnabled ?? false,
          openingDmText: payload.openingDmText,
          openingDmButtonText: payload.openingDmButtonText,
          cardSubtitle: payload.storyConfig?.cards[0]?.subtitle,
            messageVariations: payload.messageVariations ?? [],
            responseFormat: payload.responseFormat,
            quickReplies: payload.quickReplies,
            ctaLink: payload.ctaLink,
            ctaButtonTitle: payload.ctaButtonTitle,
            mediaUrl: payload.mediaUrl,
            mediaType: payload.mediaType,
            followRequestDmText: payload.followRequestDmText,
            followRequestButtonText: payload.followRequestButtonText,
            aiDmReplyEnabled: payload.aiReplyEnabled,
            aiConversation: payload.aiConversation,
          },
        },
      },
      select: { id: true },
    });
  }, result => result.id);
};

export const getAutomation = async (clerkId: string) => {
  return await client.user.findUnique({
    where: {
      clerkId,
    },
    select: {
      automations: {
        orderBy: {
          createdAt: "asc",
        },
        where: {
          archivedAt: null,
          integrationId: await currentInstagramAccountId(clerkId),
        },
        include: {
          keywords: true,
          listener: true,
          posts: {
            select: {
              postid: true,
              media: true,
              caption: true,
              mediaType: true,
            },
          },
          _count: { select: { leads: true } },
        },
      },
    },
  });
};

export const findAutomationForUser = async (id: string, clerkId: string) => {
  return await client.automation.findFirst({
    where: {
      id,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    include: {
      keywords: true,
      trigger: true,
      posts: true,
      listener: true,
      User: {
        select: {
          subscription: true,
          integrations: {
            where: { id: await currentInstagramAccountId(clerkId) },
          },
        },
      },
    },
  });
};

export const updateAutomation = async (
  automationId: string,
  clerkId: string,
  update: { name?: string; active?: boolean; matchingMode?: MATCHING_MODE },
) => {
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    select: {
      id: true,
      posts: { select: { postid: true } },
      postConfig: true,
      userId: true,
      needsReview: true,
      reviewReason: true,
      User: {
        select: {
          status: true,
          integrations: {
            where: { id: await currentInstagramAccountId(clerkId) },
            select: { status: true, reconnectRequired: true, planLocked: true },
          },
        },
      },
    },
  });

  if (!automation) {
    await logTenantAccessDenied({
      route: "actions/automation/updateAutomation",
      clerkId,
      resource: "Automation",
      resourceId: automationId,
    });
    return null;
  }

  if (update.active === true) {
    if (automation.needsReview) return null;
    if (automation.User?.status === "SUSPENDED") return null;
    if (
      automation.User?.integrations.some(
        (item) =>
          item.status === "DISCONNECTED" ||
          item.reconnectRequired ||
          item.planLocked,
      )
    ) {
      return null;
    }
  }

  return withAutomationPlanWrite(clerkId, async (tx) => tx.automation.update({
    where: { id: automation.id },
    data: {
      ...(update.active === true && automation.posts?.[0]?.postid === "NEXT" && !readNextPost(automation.postConfig)?.armedAt ? { postConfig: prepareNextPost("NEXT", true, automation.postConfig)! } : {}),
      name: update.name,
      active: update.active,
      ...(update.active === true
        ? { needsReview: false, reviewReason: null }
        : {}),
      matchingMode: update.matchingMode,
    },
  }), result => result.id);
};

export const updateCompleteAutomation = async (
  automationId: string,
  clerkId: string,
  payload: CampaignPayload,
) => {
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    select: { id: true, postConfig: true },
  });

  if (!automation) return null;

  return withAutomationPlanWrite(clerkId, async (tx) => {
    await tx.keyword.deleteMany({ where: { automationId } });
    await tx.post.deleteMany({ where: { automationId } });
    await tx.trigger.deleteMany({ where: { automationId } });

    return tx.automation.update({
      where: { id: automationId },
      data: {
        name: payload.name,
        adAutomation: payload.adAutomation ?? false,
        active: payload.active,
        needsReview: false,
        reviewReason: null,
        matchingMode: payload.matchingMode,
        triggerMode: payload.triggerMode,
        sendPrivateDm: payload.sendPrivateDm,
        source: "COMMENT",
        storyTriggerType: null,
        followGateRequired: payload.followGateRequired,
        typingIndicator: payload.typingIndicator,
        deliveryDelaySeconds: payload.deliveryDelaySeconds,
          stepDelays: payload.stepDelays ?? Prisma.DbNull,
          ...("triggerOnShares" in payload ? { triggerOnShares: payload.triggerOnShares, oneDmPerUser: payload.oneDmPerUser } : {}),
        ...(payload.post.postid === "NEXT" && readNextPost(automation.postConfig)?.armedAt ? {} : { postConfig: prepareNextPost(payload.post.postid, payload.active, automation.postConfig) ?? Prisma.DbNull }),
        posts: { create: payload.post },
        ...(payload.keywords.length > 0 && {
          keywords: {
            createMany: {
              data: payload.keywords.map((word) => ({ word })),
              skipDuplicates: true,
            },
          },
        }),
        trigger: { create: { type: "COMMENT" } },
        listener: { upsert: { create: payload.listener, update: { ...payload.listener, ...Object.fromEntries(["commentReply", "commentReply2", "commentReply3", "aiReplyInstructions", "ctaLink", "ctaButtonTitle", "mediaUrl", "mediaType", "cardSubtitle", "openingDmText", "openingDmButtonText", "followRequestDmText", "followRequestButtonText", "phoneCapturePrompt", "phoneCaptureRetryMessage", "emailCapturePrompt", "emailCaptureRetryMessage", "followUpMessage"].map(key => [key, (payload.listener as Record<string, unknown>)[key] ?? null])), flowDefinition: Prisma.DbNull, flowDraft: Prisma.DbNull, flowTriggers: Prisma.DbNull } } },
      },
      select: { id: true },
    });
  }, result => result.id);
};

function duplicateBaseName(value?: string | null) {
  const raw = value?.trim() || "Untitled automation";
  return raw
    .replace(/\s+(?:copy|–\s*copy)(?:\s+\d+)?$/i, "")
    .trim() || "Untitled automation";
}

async function nextDuplicateAutomationName(
  userId: string | null | undefined,
  integrationId: string | null,
  currentName?: string | null,
) {
  const base = duplicateBaseName(currentName);
  if (!userId) return `${base} – Copy`;
  const matches = await client.automation.findMany({
    where: {
      userId,
      integrationId,
      archivedAt: null,
      OR: [
        { name: base },
        { name: { startsWith: `${base} – Copy` } },
        { name: { startsWith: `${base} copy` } },
      ],
    },
    select: { name: true },
    take: 100,
  });
  const used = new Set(matches.map((item) => item.name.trim().toLowerCase()));
  const first = `${base} – Copy`;
  if (!used.has(first.toLowerCase())) return first;
  for (let index = 2; index <= 101; index += 1) {
    const candidate = `${base} – Copy ${index}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} – Copy ${Date.now().toString().slice(-6)}`;
}

export const duplicateAutomationQuery = async (
  automationId: string,
  clerkId: string,
) => {
  const automation = await findAutomationForUser(automationId, clerkId);
  if (!automation?.listener || !automation.userId) return null;
  if (automation.listener.responseFormat === "ATTACHMENT") {
    const id = attachmentId(automation.listener.mediaUrl);
    const file = id ? await client.automationAttachment.findFirst({
      where: { id, userId: automation.userId, status: "READY", ...attachmentScopeFilter() },
      select: { id: true },
    }) : null;
    if (!file) return null;
  }
  const integrationId = await currentInstagramAccountId(clerkId);
  const duplicateName = await nextDuplicateAutomationName(
    automation.userId,
    integrationId,
    automation.name,
  );

  if (automation.listener.flowDefinition) {
    const {
      id: listenerId,
      automationId: listenerAutomationId,
      dmCount,
      commentCount,
      ...listener
    } = automation.listener;
    return client.automation.create({
      data: {
        userId: automation.userId,
        integrationId,
        name: duplicateName,
        active: false,
        source: automation.source,
        storyTriggerType: automation.storyTriggerType,
        triggerMode: automation.triggerMode,
        matchingMode: automation.matchingMode,
        sendPrivateDm: true,
        posts: {
          create: automation.posts.map(
            ({ postid, caption, media, mediaType }) => ({
              postid,
              caption,
              media,
              mediaType,
            }),
          ),
        },
        keywords: { create: automation.keywords.map(({ word }) => ({ word })) },
        trigger: {
          create: {
            type:
              automation.source === "STORY"
                ? `STORY_${automation.storyTriggerType}`
                : automation.source,
          },
        },
        listener: {
          create: {
            ...listener,
            flowTriggers: listener.flowTriggers ?? undefined,
            flowDraft: undefined,
            flowRevision: 0,
            commentReplies: undefined,
            messageVariations: undefined,
            aiProtectionRules: undefined,
            aiConversation: undefined,
            quickReplies: undefined,
            flowDefinition: automation.listener.flowDefinition,
          },
        },
      },
      select: { id: true },
    });
  }

  if (automation.source === "STORY" || automation.source === "DM") {
    return createCompleteMessageAutomation(clerkId, {
      ...normalizeEngagementSettings(automation.listener ?? {}),
      name: duplicateName,
      active: false,
      source: automation.source,
      storyConfig: automation.source === "STORY" && readStoryConfig(automation.storyConfig) ? {...normalizeStoryConfig(automation.storyConfig),armedAt:undefined,baselineIds:undefined,boundStoryId:undefined} : undefined,
      oneDmPerUser: automation.oneDmPerUser,
      openingDmFormat: automation.listener.openingDmFormat === "QUICK_REPLY" ? "QUICK_REPLY" : "BUTTON",
      openingDmEnabled: automation.listener.openingDmEnabled && Boolean(automation.listener.openingDmText),
      openingDmText: automation.listener.openingDmText ?? undefined,
      openingDmButtonText: automation.listener.openingDmButtonText ?? undefined,
      storyTriggerType:
        automation.storyTriggerType === "REACTION" ||
        automation.storyTriggerType === "REPLY"
          ? automation.storyTriggerType
          : automation.source === "STORY"
            ? "MENTION"
            : null,
      triggerMode:
        automation.triggerMode === "INTENT_MATCH" ? "INTENT_MATCH" : automation.triggerMode === "SPECIFIC_KEYWORD"
          ? "SPECIFIC_KEYWORD"
          : "ANY_MESSAGE",
      keywords: automation.keywords.map((keyword) => keyword.word),
      responseFormat:
        automation.listener.responseFormat === "PRODUCT_CARD" ||
        automation.listener.responseFormat === "CAROUSEL" ||
        automation.listener.responseFormat === "LINK" ||
        automation.listener.responseFormat === "ATTACHMENT" ||
        automation.listener.responseFormat === "MEDIA"
          ? automation.listener.responseFormat
          : "TEXT",
      message: automation.listener.prompt,
      messageVariations: normalizeCopyList(
        automation.listener.messageVariations,
        MAX_MESSAGE_VARIATIONS,
      ),
      quickReplies:
        automation.listener.responseFormat === "LINK"
          ? readLinkButtons(
              automation.listener.quickReplies,
              automation.listener.ctaButtonTitle,
              automation.listener.ctaLink,
            )
          : readLegacyQuickReplies(automation.listener.quickReplies),
      ctaLink: automation.listener.ctaLink ?? undefined,
      ctaButtonTitle: automation.listener.ctaButtonTitle ?? undefined,
      mediaUrl: automation.listener.mediaUrl ?? undefined,
      mediaType:
        automation.listener.mediaType === "AUDIO" ? "AUDIO" : automation.listener.mediaType === "FILE" ? "FILE" : automation.listener.mediaType === "VIDEO"
          ? "VIDEO"
          : automation.listener.mediaType === "IMAGE"
            ? "IMAGE"
            : undefined,
      followGateRequired: automation.followGateRequired,
      typingIndicator: false,
      deliveryDelaySeconds: automation.deliveryDelaySeconds,
      stepDelays: normalizeStepDelays(automation.stepDelays),
      followRequestDmText: resolveFollowRequestDmText(
        automation.listener.followRequestDmText,
      ),
      followRequestButtonText: resolveFollowRequestButtonText(
        automation.listener.followRequestButtonText,
      ),
      aiReplyEnabled: automation.listener.aiDmReplyEnabled,
      aiConversation:
        readAiConversation(automation.listener.aiConversation) ?? undefined,
    });
  }

  if (!automation.posts[0]) return null;

  const payload: CampaignPayload = {
    adAutomation: automation.adAutomation,
    name: duplicateName,
    active: false,
    matchingMode: automation.matchingMode === "EXACT" ? "EXACT" : "CONTAINS",
    triggerMode:
      (automation.triggerMode as "SPECIFIC_KEYWORD" | "ANY_COMMENT") ??
      "SPECIFIC_KEYWORD",
    sendPrivateDm: automation.sendPrivateDm,
    followGateRequired: automation.followGateRequired,
    typingIndicator: false,
    deliveryDelaySeconds: automation.deliveryDelaySeconds,
      stepDelays: normalizeStepDelays(automation.stepDelays),
      triggerOnShares: automation.triggerOnShares,
      oneDmPerUser: automation.oneDmPerUser,
    post: {
      postid: automation.posts[0].postid,
      caption: automation.posts[0].caption ?? undefined,
      media: automation.posts[0].media,
      mediaType: automation.posts[0].mediaType,
    },
    keywords: automation.keywords.map((keyword) => keyword.word),
    listener: {
      listener: "MESSAGE",
      prompt: automation.listener.prompt,
      messageVariations: normalizeCopyList(
        automation.listener.messageVariations,
        MAX_MESSAGE_VARIATIONS,
      ),
      commentReplies: readCommentReplies(automation.listener),
      publicReplyLimit: automation.listener.publicReplyLimit,
      commentReply: automation.listener.commentReply ?? undefined,
      commentReply2: automation.listener.commentReply2 ?? undefined,
      commentReply3: automation.listener.commentReply3 ?? undefined,
      aiReplyEnabled: automation.listener.aiReplyEnabled,
      aiReplyTone: normalizeAiReplyTone(automation.listener.aiReplyTone),
      aiReplyInstructions: automation.listener.aiReplyInstructions ?? undefined,
      aiProtectionRules: normalizeAiProtectionRules(
        automation.listener.aiProtectionRules,
      ),
      ctaLink: automation.listener.ctaLink ?? undefined,
      ctaButtonTitle: automation.listener.ctaButtonTitle ?? undefined,
      responseFormat:
        automation.listener.responseFormat === "LINK" ||
        automation.listener.responseFormat === "ATTACHMENT" ||
        automation.listener.responseFormat === "MEDIA" ||
        automation.listener.responseFormat === "PRODUCT_CARD"
          ? automation.listener.responseFormat
          : "TEXT",
      quickReplies:
        automation.listener.responseFormat === "LINK" ||
        automation.listener.responseFormat === "PRODUCT_CARD"
          ? readLinkButtons(
              automation.listener.quickReplies,
              automation.listener.ctaButtonTitle,
              automation.listener.ctaLink,
            )
          : readLegacyQuickReplies(automation.listener.quickReplies),
      cardSubtitle: automation.listener.cardSubtitle ?? undefined,
      phoneCaptureEnabled: automation.listener.phoneCaptureEnabled,
      phoneCapturePrompt: automation.listener.phoneCapturePrompt ?? undefined,
      phoneCaptureRetryMessage: automation.listener.phoneCaptureRetryMessage ?? undefined,
      followUpCondition: automation.listener.followUpCondition,
      emailCaptureEnabled: automation.listener.emailCaptureEnabled,
      emailCapturePrompt: automation.listener.emailCapturePrompt ?? undefined,
      emailCaptureRetryMessage: automation.listener.emailCaptureRetryMessage ?? undefined,
      followUpEnabled: automation.listener.followUpEnabled,
      followUpMessage: automation.listener.followUpMessage ?? undefined,
      followUpDelayMinutes: automation.listener.followUpDelayMinutes,
      mediaUrl: automation.listener.mediaUrl ?? undefined,
      mediaType:
        automation.listener.mediaType === "AUDIO" ? "AUDIO" : automation.listener.mediaType === "FILE" ? "FILE" : automation.listener.mediaType === "VIDEO"
          ? "VIDEO"
          : automation.listener.mediaType === "IMAGE"
            ? "IMAGE"
            : undefined,
      openingDmText: automation.listener.openingDmText ?? undefined,
      openingDmButtonText: automation.listener.openingDmButtonText ?? undefined,
      openingDmFormat: automation.listener.openingDmFormat === "QUICK_REPLY" ? "QUICK_REPLY" : "BUTTON",
      openingDmEnabled: automation.listener.openingDmEnabled,
      followRequestDmText: automation.listener.followRequestDmText ?? undefined,
      followRequestButtonText:
        automation.listener.followRequestButtonText ?? undefined,
    },
  };

  return createCompleteAutomation(clerkId, payload);
};

export const deleteAutomationQuery = async (
  automationId: string,
  clerkId: string,
) => {
  return await client.automation.deleteMany({
    where: {
      id: automationId,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
  });
};

export const addListener = async (
  automationId: string,
  clerkId: string,
  listener: "SMARTAI" | "MESSAGE",
  prompt: string,
  reply?: string,
  ctaLink?: string,
) => {
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    select: { id: true },
  });

  if (!automation) {
    await logTenantAccessDenied({
      route: "actions/automation/addListener",
      clerkId,
      resource: "Automation",
      resourceId: automationId,
    });
    return null;
  }

  return withAutomationPlanWrite(clerkId, async (tx) => tx.automation.update({
    where: {
      id: automation.id,
    },
    data: {
      listener: {
        create: {
          listener,
          prompt,
          commentReply: reply,
          ctaLink,
        },
      },
    },
  }), result => result.id);
};

export const addTrigger = async (
  automationId: string,
  clerkId: string,
  trigger: string[],
) => {
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    select: { id: true },
  });

  if (!automation) {
    await logTenantAccessDenied({
      route: "actions/automation/addTrigger",
      clerkId,
      resource: "Automation",
      resourceId: automationId,
    });
    return null;
  }

  if (trigger.length === 2) {
    return await client.automation.update({
      where: {
        id: automation.id,
      },
      data: {
        trigger: {
          createMany: {
            data: [{ type: trigger[0] }, { type: trigger[1] }],
          },
        },
      },
    });
  }

  return await client.automation.update({
    where: {
      id: automation.id,
    },
    data: {
      trigger: {
        create: {
          type: trigger[0],
        },
      },
    },
  });
};

export const addKeyWords = async (
  automationId: string,
  clerkId: string,
  keywords: string,
) => {
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    select: { id: true },
  });

  if (!automation) {
    await logTenantAccessDenied({
      route: "actions/automation/addKeyWords",
      clerkId,
      resource: "Automation",
      resourceId: automationId,
    });
    return null;
  }

  return await client.automation.update({
    where: {
      id: automation.id,
    },
    data: {
      keywords: {
        create: {
          word: keywords,
        },
      },
    },
  });
};

export const deleteKeywordsQuery = async (
  automationId: string,
  clerkId: string,
) => {
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    select: { id: true },
  });

  if (!automation) {
    await logTenantAccessDenied({
      route: "actions/automation/deleteKeywordsQuery",
      clerkId,
      resource: "Automation",
      resourceId: automationId,
    });
    return null;
  }

  return await client.keyword.deleteMany({
    where: { automationId: automation.id },
  });
};

export const addPosts = async (
  automationId: string,
  clerkId: string,
  posts: {
    postid: string;
    caption?: string;
    media: string;
    mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  }[],
) => {
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    select: { id: true },
  });

  if (!automation) {
    await logTenantAccessDenied({
      route: "actions/automation/addPosts",
      clerkId,
      resource: "Automation",
      resourceId: automationId,
    });
    return null;
  }

  return withAutomationPlanWrite(clerkId, async (tx) => tx.automation.update({
    where: {
      id: automation.id,
    },
    data: {
      posts: {
        createMany: {
          data: posts,
        },
      },
    },
  }), result => result.id);
};

export const getAutomationAnalytics = async (
  automationId: string,
  clerkId: string,
) => {
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    select: { id: true },
  });

  if (!automation) {
    await logTenantAccessDenied({
      route: "actions/automation/getAutomationAnalytics",
      clerkId,
      resource: "Automation",
      resourceId: automationId,
    });
    return null;
  }

  const [
    dmsSent,
    dmsFailed,
    repliesSent,
    repliesFailed,
    leadsCount,
    commentsReceived,
  ] = await Promise.all([
    client.messageLog.count({
      where: { automationId: automation.id, messageType: "DM", status: "SENT" },
    }),
    client.messageLog.count({
      where: {
        automationId: automation.id,
        messageType: "DM",
        status: "FAILED",
      },
    }),
    client.messageLog.count({
      where: {
        automationId: automation.id,
        messageType: "COMMENT_REPLY",
        status: "SENT",
      },
    }),
    client.messageLog.count({
      where: {
        automationId: automation.id,
        messageType: "COMMENT_REPLY",
        status: "FAILED",
      },
    }),
    client.lead.count({ where: { automationId: automation.id } }),
    client.automationEvent.count({
      where: { automationId: automation.id, eventType: "COMMENT_RECEIVED" },
    }),
  ]);

  return {
    commentsReceived,
    dmsSent,
    dmsFailed,
    repliesSent,
    repliesFailed,
    leadsCollected: leadsCount,
  };
};

export const getAutomationActivity = async (
  automationId: string,
  clerkId: string,
) => {
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      archivedAt: null,
      User: { clerkId },
      integrationId: await currentInstagramAccountId(clerkId),
    },
    select: { id: true },
  });

  if (!automation) {
    await logTenantAccessDenied({
      route: "actions/automation/getAutomationActivity",
      clerkId,
      resource: "Automation",
      resourceId: automationId,
    });
    return null;
  }

  const [events, messageLogs, webhookEvents] = await Promise.all([
    client.automationEvent.findMany({
      where: { automationId: automation.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    client.messageLog.findMany({
      where: { automationId: automation.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    client.webhookEvent.findMany({
      where: { automationId: automation.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return [...events, ...messageLogs, ...webhookEvents]
    .map((item: any) => ({
      id: item.id,
      createdAt: item.createdAt,
      type: item.eventType ?? `${item.messageType}_${item.status}`,
      status: item.status ?? undefined,
      igUserId: item.igUserId ?? item.recipientIgId ?? undefined,
      mediaId: item.mediaId ?? undefined,
      commentId: item.commentId ?? undefined,
      keyword: item.keyword ?? undefined,
      errorMessage: item.errorMessage ?? undefined,
      meta: item.meta ?? item.payload ?? undefined,
      source: item.messageType
        ? "message"
        : item.provider
          ? "webhook"
          : "event",
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20);
};

export const getDashboardActivity = async (clerkId: string) => {
  const user = await client.user.findUnique({
    where: { clerkId },
    select: {
      automations: {
        where: {
          archivedAt: null,
          integrationId: await currentInstagramAccountId(clerkId),
        },
        select: { id: true },
      },
      integrations: {
        where: {
          id: await currentInstagramAccountId(clerkId),
          name: "INSTAGRAM",
          status: { not: "DISCONNECTED" },
        },
        select: {
          instagramId: true,
          webhookAccountId: true,
          pageId: true,
          businessId: true,
        },
      },
    },
  });

  const automationIds =
    user?.automations.map((automation) => automation.id) ?? [];
  const integrationAccountIds = Array.from(
    new Set(
      (user?.integrations ?? [])
        .flatMap((integration) => [
          integration.instagramId,
          integration.webhookAccountId,
          integration.pageId,
          integration.businessId,
        ])
        .filter((value): value is string => Boolean(value)),
    ),
  );
  if (automationIds.length === 0 && integrationAccountIds.length === 0)
    return [];

  const [events, messageLogs, webhookEvents] = await Promise.all([
    client.automationEvent.findMany({
      where: { automationId: { in: automationIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { automation: { select: { name: true } } },
    }),
    client.messageLog.findMany({
      where: { automationId: { in: automationIds } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { automation: { select: { name: true } } },
    }),
    client.webhookEvent.findMany({
      where: {
        OR: [
          ...(automationIds.length
            ? [{ automationId: { in: automationIds } }]
            : []),
          ...(integrationAccountIds.length
            ? [
                {
                  igAccountId: { in: integrationAccountIds },
                  eventType: {
                    in: [
                      "REAL_COMMENT_EVENT",
                      "REAL_MESSAGE_EVENT",
                      "COMMENT_WEBHOOK_RECEIVED",
                      "AUTOMATION_MATCH_FAILED",
                      "ACTION_SENT",
                      "ACTION_SKIPPED",
                    ],
                  },
                },
              ]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { automation: { select: { name: true } } },
    }),
  ]);

  return [...events, ...messageLogs, ...webhookEvents]
    .map((item: any) => ({
      id: item.id,
      campaign: item.automation?.name ?? "Automation",
      createdAt: item.createdAt,
      type: item.eventType ?? `${item.messageType}_${item.status}`,
      status: item.status ?? undefined,
      igUserId: item.igUserId ?? item.recipientIgId ?? undefined,
      mediaId: item.mediaId ?? undefined,
      commentId: item.commentId ?? undefined,
      keyword: item.keyword ?? undefined,
      errorMessage: item.errorMessage ?? undefined,
      meta: item.meta ?? item.payload ?? undefined,
      source: item.messageType
        ? "message"
        : item.provider
          ? "webhook"
          : "event",
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20);
};
