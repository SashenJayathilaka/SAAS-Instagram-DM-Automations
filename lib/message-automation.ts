import { normalizeStepDelays, stepDelay } from "@/lib/automation-step-delays";
import { normalizeStoryConfig, validateStoryCards, type StoryConfig } from "@/lib/story-automation";
import { normalizeDeliveryDelay } from "@/lib/campaign-save";
import { attachmentId, normalizeAttachmentType } from "@/lib/message-attachment";
import {
  normalizeEngagementSettings,
  validateEngagementSettings,
  type EngagementSettings,
} from "./automation-engagement-settings";
import {
  normalizeCopyList,
  MAX_MESSAGE_VARIATIONS,
} from "@/lib/automation-copy";
import {
  readAiConversation,
  type AiConversationConfig,
} from "@/lib/ai-conversation";
import {
  resolveFollowRequestButtonText,
  resolveFollowRequestDmText,
} from "@/lib/comment-dm-flow";
import {
  linkButtonsAreComplete,
  normalizeLinkButtons,
  readLegacyQuickReplies,
  type LinkButton,
} from "@/lib/link-buttons";

export type MessageAutomationSource = "STORY" | "DM";
export type StoryTriggerType = "MENTION" | "REACTION" | "REPLY";
export type MessageResponseFormat = "TEXT" | "LINK" | "ATTACHMENT" | "MEDIA" | "PRODUCT_CARD" | "CAROUSEL";
export type MessageTriggerMode = "SPECIFIC_KEYWORD" | "ANY_MESSAGE" | "INTENT_MATCH";
export type DeliveryDelaySeconds = number;

export type RawMessageAutomationPayload = EngagementSettings & {
  aiConversation?: unknown;
  name?: string;
  active?: boolean;
  source?: string;
  storyTriggerType?: string | null;
  storyConfig?: unknown;
  oneDmPerUser?: boolean;
  openingDmEnabled?: boolean;
  openingDmFormat?: "BUTTON" | "QUICK_REPLY";
  openingDmText?: string | null;
  openingDmButtonText?: string | null;
  triggerMode?: string;
  keywords?: string[];
  responseFormat?: string;
  message?: string | null;
  messageVariations?: unknown;
  quickReplies?: unknown;
  linkButtons?: unknown;
  ctaLink?: string | null;
  ctaButtonTitle?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  followGateRequired?: boolean;
  typingIndicator?: boolean;
  deliveryDelaySeconds?: number;
  stepDelays?: import("@/lib/automation-step-delays").StepDelays;
  followRequestDmText?: string | null;
  followRequestButtonText?: string | null;
  aiReplyEnabled?: boolean;
};

export type NormalizedMessageAutomationPayload = ReturnType<
  typeof normalizeEngagementSettings
> & {
  aiConversation?: AiConversationConfig;
  name: string;
  active: boolean;
  source: MessageAutomationSource;
  storyTriggerType: StoryTriggerType | null;
  storyConfig?: StoryConfig;
  oneDmPerUser?: boolean;
  openingDmEnabled?: boolean;
  openingDmFormat?: "BUTTON" | "QUICK_REPLY";
  openingDmText?: string;
  openingDmButtonText?: string;
  triggerMode: MessageTriggerMode;
  keywords: string[];
  responseFormat: MessageResponseFormat;
  message: string;
  messageVariations?: string[];
  quickReplies: Array<string | LinkButton>;
  ctaLink?: string;
  ctaButtonTitle?: string;
  mediaUrl?: string;
  mediaType?: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
  followGateRequired: boolean;
  typingIndicator: boolean;
  deliveryDelaySeconds: DeliveryDelaySeconds;
  stepDelays?: import("@/lib/automation-step-delays").StepDelays;
  followRequestDmText: string;
  followRequestButtonText: string;
  aiReplyEnabled: boolean;
};

export function normalizeMessageAutomationPayload(
  payload: RawMessageAutomationPayload,
): NormalizedMessageAutomationPayload {
  const source: MessageAutomationSource =
    payload.source === "DM" ? "DM" : "STORY";
  const storyConfig = source === "STORY" && payload.storyConfig ? normalizeStoryConfig(payload.storyConfig, payload.storyTriggerType) : undefined;
  const responseFormat: MessageResponseFormat = payload.aiReplyEnabled
    ? "TEXT"
    : payload.responseFormat === "PRODUCT_CARD" || payload.responseFormat === "CAROUSEL" ? payload.responseFormat
    : payload.responseFormat === "ATTACHMENT" ? "ATTACHMENT" : payload.linkButtons || payload.responseFormat === "LINK"
      ? "LINK"
      : payload.responseFormat === "MEDIA"
        ? "MEDIA"
        : "TEXT";
  const mention = source === "STORY" && (storyConfig ? storyConfig.scope === "MENTION" : normalizeStoryTrigger(payload.storyTriggerType) === "MENTION");
  const triggerMode: MessageTriggerMode = mention ? "ANY_MESSAGE" : source === "STORY" && payload.triggerMode === "INTENT_MATCH" ? "INTENT_MATCH" : payload.triggerMode === "SPECIFIC_KEYWORD" ? "SPECIFIC_KEYWORD" : "ANY_MESSAGE";
  const linkButtons = normalizeLinkButtons(
    responseFormat === "PRODUCT_CARD" ? storyConfig?.cards[0]?.links : payload.linkButtons ?? payload.quickReplies,
    payload.ctaButtonTitle,
    payload.ctaLink,
  );
  const firstLink = linkButtons[0];

  return {
    ...normalizeEngagementSettings(payload),
    aiConversation: readAiConversation(payload.aiConversation) ?? undefined,
    name:
      cleanOptional(payload.name)?.slice(0, 120) ||
      `Untitled ${source === "STORY" ? "story" : "DM"} automation`,
    active: Boolean(payload.active),
    source,
    storyTriggerType: source === "STORY" ? storyConfig ? storyConfig.scope === "MENTION" ? "MENTION" : "REPLY" : normalizeStoryTrigger(payload.storyTriggerType) : null,
    storyConfig,
    oneDmPerUser: payload.oneDmPerUser === true,
    openingDmFormat: payload.openingDmFormat === "QUICK_REPLY" ? "QUICK_REPLY" : "BUTTON",
    openingDmEnabled: !payload.aiReplyEnabled && payload.openingDmEnabled === true,
    openingDmText: cleanOptional(payload.openingDmText)?.slice(0,640) || "Hey! Ready for the link?",
    openingDmButtonText: cleanOptional(payload.openingDmButtonText)?.slice(0,20) || "Get the Link",
    triggerMode,
    keywords:
      triggerMode === "SPECIFIC_KEYWORD"
        ? Array.from(
            new Set(
              (payload.keywords ?? [])
                .map((word) => word.trim().toLowerCase())
                .filter(Boolean),
            ),
          ).slice(0, 20)
        : [],
    responseFormat,
    messageVariations: ["ATTACHMENT","PRODUCT_CARD","CAROUSEL"].includes(responseFormat) || payload.aiReplyEnabled
      ? []
      : normalizeCopyList(payload.messageVariations, MAX_MESSAGE_VARIATIONS).map(text=>text.slice(0,source === "STORY" ? 900:1000)),
    message: responseFormat === "PRODUCT_CARD" || responseFormat === "CAROUSEL" ? storyConfig?.cards[0]?.title || "" : responseFormat === "ATTACHMENT" ? "" : (payload.message ?? "").trim().slice(0, source === "STORY" ? 900 : 1000),
    quickReplies: responseFormat === "ATTACHMENT" || payload.aiReplyEnabled
      ? []
      : (responseFormat === "LINK" || responseFormat === "PRODUCT_CARD")
        ? [...linkButtons,...readLegacyQuickReplies(payload.quickReplies)]
        : readLegacyQuickReplies(payload.quickReplies),
    ctaLink:
      !payload.aiReplyEnabled && (responseFormat === "LINK" || responseFormat === "PRODUCT_CARD")
        ? firstLink?.url
        : undefined,
    ctaButtonTitle:
      !payload.aiReplyEnabled && (responseFormat === "LINK" || responseFormat === "PRODUCT_CARD")
        ? firstLink?.label
        : undefined,
    mediaUrl:
      responseFormat === "PRODUCT_CARD" ? storyConfig?.cards[0]?.image : (responseFormat === "MEDIA" || responseFormat === "ATTACHMENT") ? normalizeUrl(payload.mediaUrl) : undefined,
    mediaType:
      responseFormat === "ATTACHMENT" ? normalizeAttachmentType(payload.mediaType) : responseFormat === "MEDIA" && payload.mediaType === "VIDEO"
        ? "VIDEO"
        : responseFormat === "MEDIA"
          ? "IMAGE"
          : undefined,
    // AI answers the inbound message immediately. A follow gate would consume
    // quota before hiding that generated answer and later send the fallback,
    // so it is intentionally unavailable for AI responses.
    followGateRequired: payload.aiReplyEnabled
      ? false
      : Boolean(payload.followGateRequired),
    typingIndicator: false,
    deliveryDelaySeconds: payload.stepDelays ? 0 : normalizeDeliveryDelay(payload.deliveryDelaySeconds),
    stepDelays: normalizeStepDelays(payload.stepDelays),
    followRequestDmText: resolveFollowRequestDmText(
      payload.followRequestDmText,
    ),
    followRequestButtonText: resolveFollowRequestButtonText(
      payload.followRequestButtonText,
    ),
    aiReplyEnabled: payload.aiReplyEnabled === true,
  };
}

export function validateMessageAutomationPayload(
  payload: NormalizedMessageAutomationPayload,
): string | null {
  const engagementError = validateEngagementSettings(payload, true, true);
  if (engagementError) return engagementError;
  if (
    payload.aiReplyEnabled &&
    (payload.emailCaptureEnabled ||
      payload.phoneCaptureEnabled ||
      payload.followUpEnabled)
  )
    return "Turn off AI reply before adding conversation steps.";
  if (!payload.name) return "Give this automation a name.";
  if (payload.source === "STORY" && !payload.storyTriggerType) {
    return "Choose a story interaction.";
  }
  if (
    payload.triggerMode === "SPECIFIC_KEYWORD" &&
    payload.keywords.length === 0
  ) {
    return payload.source === "STORY" ? "Add at least one story keyword or choose any word." : "Add at least one DM keyword or choose any incoming message.";
  }
  if (payload.active && payload.source === "STORY" && payload.storyConfig?.scope === "SPECIFIC" && !payload.storyConfig.stories.length) return "Choose at least one active story.";
  if (payload.triggerMode === "INTENT_MATCH" && !payload.storyConfig?.intentPrompt) return "Describe the intent that should trigger your story reply.";
  if (payload.openingDmEnabled && (!payload.openingDmText?.trim() || !payload.openingDmButtonText?.trim())) return "Add the opener message and its continue button.";
  if (payload.followUpEnabled && (payload.deliveryDelaySeconds + stepDelay(payload,"MESSAGE")) + (payload.followUpDelayMinutes || 0) * 60 >= 86400) return "Shorten the delay or follow-up so both fit inside Instagram’s 24-hour messaging window.";
  if (payload.responseFormat === "PRODUCT_CARD" || payload.responseFormat === "CAROUSEL") {
    const error = validateStoryCards(payload.storyConfig?.cards || [], payload.responseFormat === "CAROUSEL");
    if (error) return error;
  }
  if (payload.responseFormat === "ATTACHMENT" && !attachmentId(payload.mediaUrl)) return "Choose an uploaded attachment.";
  if (payload.responseFormat !== "ATTACHMENT" && !payload.message) return "Write the DM that AP3K should send.";
  if (
    payload.responseFormat === "LINK" &&
    !linkButtonsAreComplete(
      normalizeLinkButtons(
        payload.quickReplies,
        payload.ctaButtonTitle,
        payload.ctaLink,
      ),
    )
  ) {
    return "Complete every link label and add a valid destination URL.";
  }
  if (payload.responseFormat === "MEDIA" && !payload.mediaUrl) {
    return "Add a valid public image or video URL.";
  }
  return null;
}

function normalizeStoryTrigger(value?: string | null): StoryTriggerType {
  if (value === "REACTION") return "REACTION";
  if (value === "REPLY") return "REPLY";
  return "MENTION";
}

function cleanOptional(value?: string | null) {
  const clean = value?.trim();
  return clean || undefined;
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
