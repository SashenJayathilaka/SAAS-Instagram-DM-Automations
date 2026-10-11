import { normalizeStepDelays, stepDelay } from "@/lib/automation-step-delays";
import { attachmentId, normalizeAttachmentType } from "@/lib/message-attachment";
import {
  normalizeCopyList,
  readCommentReplies,
  normalizeReplyLimit,
  MAX_MESSAGE_VARIATIONS,
} from "@/lib/automation-copy";
import { validateEngagementSettings } from "@/lib/automation-engagement-settings";
import { validateProductCard } from "@/lib/product-card";
import {
  resolveFollowRequestButtonText,
  resolveFollowRequestDmText,
  resolveOpeningDmButtonText,
  resolveOpeningDmText,
} from "@/lib/comment-dm-flow";
import {
  linkButtonsAreComplete,
  normalizeLinkButtons,
  readLegacyQuickReplies,
  type LinkButton,
} from "@/lib/link-buttons";
import {
  normalizeAiProtectionRules,
  normalizeAiReplyTone,
  type AiProtectionRules,
  type AiReplyTone,
} from "@/lib/ai-reply-config";

export type CampaignTriggerMode = "SPECIFIC_KEYWORD" | "ANY_COMMENT";
export type CampaignMatchingMode = "EXACT" | "CONTAINS" | "SMART_AI";
export type CampaignMediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

export type RawCampaignPayload = {
  adAutomation?: boolean;
  name?: string;
  active?: boolean;
  matchingMode?: string;
  triggerMode?: string;
  post?: {
    postid?: string | null;
    caption?: string | null;
    media?: string | null;
    mediaType?: string | null;
  } | null;
  keywords?: string[];
  publicReplyEnabled?: boolean;
  sendPrivateDm?: boolean;
  followGateRequired?: boolean;
  typingIndicator?: boolean;
  deliveryDelaySeconds?: number;
  stepDelays?: import("@/lib/automation-step-delays").StepDelays;
  triggerOnShares?: boolean;
  oneDmPerUser?: boolean;
  aiMode?: boolean;
  listener?: {
    listener?: string;
    prompt?: string | null;
    commentReply?: string | null;
    commentReply2?: string | null;
    commentReply3?: string | null;
    commentReplies?: unknown;
    messageVariations?: unknown;
    publicReplyLimit?: number;
    aiReplyEnabled?: boolean;
    aiReplyTone?: string | null;
    aiReplyInstructions?: string | null;
    aiProtectionRules?: unknown;
    ctaLink?: string | null;
    ctaButtonTitle?: string | null;
    responseFormat?: string | null;
    quickReplies?: unknown;
    linkButtons?: unknown;
    cardSubtitle?: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    openingDmText?: string | null;
    openingDmButtonText?: string | null;
    openingDmEnabled?: boolean;
  openingDmFormat?: "BUTTON" | "QUICK_REPLY";
    followRequestDmText?: string | null;
    followRequestButtonText?: string | null;
    phoneCaptureEnabled?: boolean;
    phoneCapturePrompt?: string;
    phoneCaptureRetryMessage?: string;
    followUpCondition?: string;
    emailCaptureEnabled?: boolean;
    emailCapturePrompt?: string;
    emailCaptureRetryMessage?: string;
    followUpEnabled?: boolean;
    followUpMessage?: string;
    followUpDelayMinutes?: number;
  } | null;
};

export type NormalizedCampaignPayload = {
  adAutomation?: boolean;
  name: string;
  active: boolean;
  matchingMode: "EXACT" | "CONTAINS";
  triggerMode: CampaignTriggerMode;
  sendPrivateDm: boolean;
  followGateRequired?: boolean;
  typingIndicator?: boolean;
  deliveryDelaySeconds?: number;
  stepDelays?: import("@/lib/automation-step-delays").StepDelays;
  triggerOnShares?: boolean;
  oneDmPerUser?: boolean;
  post: {
    postid: string;
    caption?: string;
    media: string;
    mediaType: CampaignMediaType;
  };
  keywords: string[];
  listener: {
    listener: "MESSAGE";
    prompt: string;
    commentReply?: string;
    commentReply2?: string;
    commentReply3?: string;
    commentReplies?: string[];
    messageVariations?: string[];
    publicReplyLimit?: number;
    aiReplyEnabled?: boolean;
    aiReplyTone?: AiReplyTone;
    aiReplyInstructions?: string;
    aiProtectionRules?: AiProtectionRules;
    ctaLink?: string;
    ctaButtonTitle?: string;
    responseFormat?: "TEXT" | "LINK" | "ATTACHMENT" | "MEDIA" | "PRODUCT_CARD";
    quickReplies?: Array<string | LinkButton>;
    cardSubtitle?: string;
    mediaUrl?: string;
    mediaType?: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
    openingDmText?: string;
    openingDmButtonText?: string;
    openingDmEnabled?: boolean;
  openingDmFormat?: "BUTTON" | "QUICK_REPLY";
    followRequestDmText?: string;
    followRequestButtonText?: string;
    phoneCaptureEnabled?: boolean;
    phoneCapturePrompt?: string;
    phoneCaptureRetryMessage?: string;
    followUpCondition?: string;
    emailCaptureEnabled?: boolean;
    emailCapturePrompt?: string;
    emailCaptureRetryMessage?: string;
    followUpEnabled?: boolean;
    followUpMessage?: string;
    followUpDelayMinutes?: number;
  };
};

export type CampaignPayloadSummary = {
  adAutomation?: boolean;
  name: string;
  active: boolean;
  triggerMode: CampaignTriggerMode;
  matchingMode: "EXACT" | "CONTAINS";
  postid: string;
  keywordsCount: number;
  listenerPromptPresent: boolean;
  publicReplyEnabled: boolean;
  sendPrivateDm: boolean;
  publicReplyCount: number;
  ctaTitlePresent: boolean;
  ctaUrlPresent: boolean;
  mediaType: CampaignMediaType;
};

export function normalizeDeliveryDelay(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(23 * 3600, Math.max(0, Math.floor(value))) : 0;
}

export function normalizeCampaignPayload(
  payload: RawCampaignPayload,
): NormalizedCampaignPayload {
  const triggerMode: CampaignTriggerMode =
    payload.triggerMode === "ANY_COMMENT" ? "ANY_COMMENT" : "SPECIFIC_KEYWORD";

  const matchingMode =
    payload.matchingMode === "EXACT" || payload.matchingMode === "EQUAL"
      ? "EXACT"
      : "CONTAINS";

  const postid = payload.post?.postid?.trim() ?? "";
  const publicReplyEnabled = payload.publicReplyEnabled !== false;
  const aiReplyEnabled = payload.listener?.aiReplyEnabled === true;
  const sendPrivateDm = payload.sendPrivateDm !== false;
  const openingDmEnabled =
    sendPrivateDm && payload.listener?.openingDmEnabled !== false;
  const responseFormat =
    payload.listener?.responseFormat === "ATTACHMENT"
      ? "ATTACHMENT"
      : payload.listener?.responseFormat === "PRODUCT_CARD"
      ? "PRODUCT_CARD"
      : payload.listener?.responseFormat === "MEDIA"
        ? "MEDIA"
        : payload.listener?.responseFormat === "LINK" ||
            payload.listener?.ctaLink
          ? "LINK"
          : "TEXT";
  const linkButtons = normalizeLinkButtons(
    payload.listener?.linkButtons ?? payload.listener?.quickReplies,
    payload.listener?.ctaButtonTitle,
    payload.listener?.ctaLink,
  );
  const firstLink = linkButtons[0];
  const replies = publicReplyEnabled
    ? readCommentReplies(payload.listener ?? {})
    : [];

  return {
    adAutomation: payload.adAutomation === true,
    name: payload.name?.trim() || "Untitled automation",
    active: Boolean(payload.active),
    matchingMode,
    triggerMode,
    sendPrivateDm,
    followGateRequired: openingDmEnabled && Boolean(payload.followGateRequired),
    typingIndicator: false,
    deliveryDelaySeconds: payload.stepDelays ? 0 : normalizeDeliveryDelay(payload.deliveryDelaySeconds),
    stepDelays: normalizeStepDelays(payload.stepDelays),
    triggerOnShares: sendPrivateDm && payload.triggerOnShares === true,
    oneDmPerUser: payload.oneDmPerUser === true,
    post: {
      postid,
      caption: cleanOptional(payload.post?.caption),
      media: cleanOptional(payload.post?.media) ?? "",
      mediaType: normalizeCampaignMediaType(payload.post?.mediaType),
    },
    keywords: cleanKeywords(triggerMode, payload.keywords ?? []),
    listener: {
      listener: "MESSAGE",
      prompt: responseFormat === "ATTACHMENT" ? "" : payload.listener?.prompt?.trim() ?? "",
      commentReply: replies[0],
      commentReply2: replies[1],
      commentReply3: replies[2],
      commentReplies: replies,
      messageVariations:
        sendPrivateDm && responseFormat !== "ATTACHMENT" && responseFormat !== "PRODUCT_CARD"
          ? normalizeCopyList(
              payload.listener?.messageVariations,
              MAX_MESSAGE_VARIATIONS,
            )
          : [],
      publicReplyLimit: normalizeReplyLimit(payload.listener?.publicReplyLimit),
      aiReplyEnabled,
      aiReplyTone: normalizeAiReplyTone(payload.listener?.aiReplyTone),
      aiReplyInstructions: aiReplyEnabled
        ? cleanOptional(payload.listener?.aiReplyInstructions)?.slice(0, 1600)
        : undefined,
      aiProtectionRules: normalizeAiProtectionRules(
        payload.listener?.aiProtectionRules,
      ),
      ctaLink:
        sendPrivateDm &&
        (responseFormat === "LINK" || responseFormat === "PRODUCT_CARD")
          ? firstLink?.url
          : undefined,
      ctaButtonTitle:
        sendPrivateDm &&
        (responseFormat === "LINK" || responseFormat === "PRODUCT_CARD")
          ? firstLink?.label
          : undefined,
      responseFormat,
      quickReplies: sendPrivateDm && responseFormat !== "ATTACHMENT"
        ? responseFormat === "LINK" || responseFormat === "PRODUCT_CARD"
          ? linkButtons
          : readLegacyQuickReplies(payload.listener?.quickReplies)
        : [],
      mediaUrl:
        sendPrivateDm &&
        (responseFormat === "ATTACHMENT" || responseFormat === "MEDIA" || responseFormat === "PRODUCT_CARD")
          ? normalizeUrl(payload.listener?.mediaUrl)
          : undefined,
      cardSubtitle:
        responseFormat === "PRODUCT_CARD"
          ? cleanOptional(payload.listener?.cardSubtitle)
          : undefined,
      mediaType:
        responseFormat === "ATTACHMENT" ? normalizeAttachmentType(payload.listener?.mediaType) : sendPrivateDm &&
        responseFormat === "MEDIA" &&
        payload.listener?.mediaType === "VIDEO"
          ? "VIDEO"
          : responseFormat === "MEDIA"
            ? "IMAGE"
            : undefined,
      openingDmText: sendPrivateDm
        ? resolveOpeningDmText(payload.listener?.openingDmText)
        : undefined,
      openingDmButtonText: sendPrivateDm
        ? resolveOpeningDmButtonText(payload.listener?.openingDmButtonText)
        : undefined,
      openingDmEnabled,
      openingDmFormat: payload.listener?.openingDmFormat === "QUICK_REPLY" ? "QUICK_REPLY" : "BUTTON",
      phoneCaptureEnabled:
        sendPrivateDm && payload.listener?.phoneCaptureEnabled === true,
      phoneCapturePrompt: cleanOptional(payload.listener?.phoneCapturePrompt),
      phoneCaptureRetryMessage: payload.listener?.phoneCaptureRetryMessage?.trim(),
      followUpCondition: payload.listener?.followUpCondition || "ALWAYS",
      emailCaptureEnabled:
        sendPrivateDm && payload.listener?.emailCaptureEnabled === true,
      emailCapturePrompt: cleanOptional(payload.listener?.emailCapturePrompt),
      emailCaptureRetryMessage: payload.listener?.emailCaptureRetryMessage?.trim(),
      followUpEnabled:
        sendPrivateDm && payload.listener?.followUpEnabled === true,
      followUpMessage: cleanOptional(payload.listener?.followUpMessage),
      followUpDelayMinutes: payload.listener?.followUpDelayMinutes ?? 30,
      followRequestDmText: sendPrivateDm
        ? resolveFollowRequestDmText(payload.listener?.followRequestDmText)
        : undefined,
      followRequestButtonText: sendPrivateDm
        ? resolveFollowRequestButtonText(
            payload.listener?.followRequestButtonText,
          )
        : undefined,
    },
  };
}

export function validateNormalizedCampaignPayload(
  payload: NormalizedCampaignPayload,
): string | null {
  const engagementError = validateEngagementSettings(
    payload.listener,
    payload.sendPrivateDm,
    payload.listener.openingDmEnabled === true,
  );
  if (engagementError) return engagementError;
  if (payload.sendPrivateDm && payload.listener.followUpEnabled && stepDelay(payload,"MESSAGE") + (payload.listener.followUpDelayMinutes || 0) * 60 >= 86400) return "Shorten the message delay or follow-up so both fit inside Instagram’s 24-hour messaging window.";
  if (
    payload.adAutomation &&
    (!payload.post.postid || ["ANY", "NEXT"].includes(payload.post.postid))
  )
    return "Select the Instagram post used by your ad.";
  if (!payload.post.postid) {
    return "This automation needs a post.";
  }

  if (
    payload.triggerMode === "SPECIFIC_KEYWORD" &&
    payload.keywords.length === 0
  ) {
    return "Specific keyword automations need at least one keyword.";
  }

  if (payload.sendPrivateDm && payload.listener.responseFormat !== "ATTACHMENT" && !payload.listener.prompt) {
    return "This automation needs a DM message.";
  }

  if (
    payload.sendPrivateDm &&
    (payload.listener.responseFormat === "LINK" ||
      payload.listener.responseFormat === "PRODUCT_CARD") &&
    !linkButtonsAreComplete(
      normalizeLinkButtons(
        payload.listener.quickReplies,
        payload.listener.ctaButtonTitle,
        payload.listener.ctaLink,
      ),
    )
  ) {
    return "Complete every link label and add a valid destination URL.";
  }

  if (payload.sendPrivateDm && payload.listener.responseFormat === "ATTACHMENT" && !attachmentId(payload.listener.mediaUrl)) return "Choose an uploaded attachment.";

  if (
    payload.sendPrivateDm &&
    payload.listener.responseFormat === "MEDIA" &&
    !payload.listener.mediaUrl
  ) {
    return "Add a valid public image or video URL.";
  }

  if (
    payload.sendPrivateDm &&
    payload.listener.responseFormat === "PRODUCT_CARD"
  ) {
    const error = validateProductCard(
      payload.listener.prompt,
      payload.listener.mediaUrl,
      payload.listener.cardSubtitle,
    );
    if (error) return error;
  }

  const publicReplyCount = [
    payload.listener.commentReply,
    payload.listener.commentReply2,
    payload.listener.commentReply3,
  ].filter(Boolean).length;
  if (
    !payload.sendPrivateDm &&
    publicReplyCount === 0 &&
    !payload.listener.aiReplyEnabled
  ) {
    return "Choose a comment reply or DM before activating this automation.";
  }

  return null;
}

export function summarizeCampaignPayload(
  payload: NormalizedCampaignPayload,
  publicReplyEnabled = Boolean(
    payload.listener.aiReplyEnabled ||
    payload.listener.commentReply ||
    payload.listener.commentReply2 ||
    payload.listener.commentReply3,
  ),
): CampaignPayloadSummary {
  return {
    name: payload.name,
    active: payload.active,
    triggerMode: payload.triggerMode,
    matchingMode: payload.matchingMode,
    sendPrivateDm: payload.sendPrivateDm,
    postid: payload.post.postid,
    keywordsCount: payload.keywords.length,
    listenerPromptPresent: Boolean(payload.listener.prompt),
    publicReplyEnabled,
    publicReplyCount: [
      payload.listener.commentReply,
      payload.listener.commentReply2,
      payload.listener.commentReply3,
    ].filter(Boolean).length,
    ctaTitlePresent: Boolean(payload.listener.ctaButtonTitle),
    ctaUrlPresent: Boolean(payload.listener.ctaLink),
    mediaType: payload.post.mediaType,
  };
}

export function normalizeCampaignMediaType(
  value?: string | null,
): CampaignMediaType {
  if (value === "VIDEO") return "VIDEO";
  if (value === "CAROUSEL_ALBUM" || value === "CAROSEL_ALBUM")
    return "CAROUSEL_ALBUM";
  return "IMAGE";
}

function cleanKeywords(triggerMode: CampaignTriggerMode, keywords: string[]) {
  if (triggerMode === "ANY_COMMENT") return [];
  return Array.from(
    new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean)),
  );
}

function cleanOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function normalizeUrl(value?: string | null) {
  const raw = cleanOptional(value);
  if (!raw) return undefined;
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
