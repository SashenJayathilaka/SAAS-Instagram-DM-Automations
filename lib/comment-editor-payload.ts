import type { WizardData } from "@/hooks/use-wizard";

/** Preserve saved settings while mapping the editor’s response format to delivery. */
export function createCommentEditorPayload(
  data: WizardData & { post: NonNullable<WizardData["post"]> },
  activeOverride?: boolean,
) {
  const withLinks =
    data.sendPrivateDm && (data.productCard || (data.messageFormat ?? "LINK") === "LINK");
  const firstLink = withLinks ? data.linkButtons[0] : undefined;
  return {
    name: data.campaignName,
    adAutomation: data.adAutomation,
    active: typeof activeOverride === "boolean" ? activeOverride : data.active,
    matchingMode: data.matchingMode,
    triggerMode: data.triggerMode,
    sendPrivateDm: data.sendPrivateDm,
    followGateRequired: data.followGateRequired,
    typingIndicator: false,
    stepDelays: data.stepDelays,
    deliveryDelaySeconds: data.deliveryDelaySeconds ?? 0,
    triggerOnShares: data.triggerOnShares === true,
    oneDmPerUser: data.oneDmPerUser === true,
    post: data.post,
    keywords: data.triggerMode === "ANY_COMMENT" ? [] : data.keywords,
    publicReplyEnabled: data.publicReplyEnabled,
    listener: {
      listener: "MESSAGE",
      phoneCaptureEnabled: data.sendPrivateDm && data.phoneCaptureEnabled,
      phoneCapturePrompt: data.phoneCapturePrompt,
      phoneCaptureRetryMessage: data.phoneCaptureRetryMessage,
      followUpCondition: data.followUpCondition,
      emailCaptureEnabled: data.sendPrivateDm && data.emailCaptureEnabled,
      emailCapturePrompt: data.emailCapturePrompt,
      emailCaptureRetryMessage: data.emailCaptureRetryMessage,
      followUpEnabled: data.sendPrivateDm && data.followUpEnabled,
      followUpMessage: data.followUpMessage,
      followUpDelayMinutes: data.followUpDelayMinutes,
      prompt: data.messageFormat === "ATTACHMENT" ? "" : data.dmMessage,
      messageVariations: data.messageVariations ?? [],
      commentReplies: data.publicReplyEnabled ? data.commentReplies : [],
      publicReplyLimit: data.publicReplyLimit ?? 0,
      commentReply: data.publicReplyEnabled
        ? data.publicReply || undefined
        : undefined,
      commentReply2: data.publicReplyEnabled
        ? data.publicReply2 || undefined
        : undefined,
      commentReply3: data.publicReplyEnabled
        ? data.publicReply3 || undefined
        : undefined,
      aiReplyEnabled: data.aiReplyEnabled,
      aiReplyTone: data.aiReplyTone,
      aiReplyInstructions: data.aiReplyEnabled
        ? data.aiReplyInstructions
        : undefined,
      aiProtectionRules: data.aiProtectionRules,
      ctaLink: data.sendPrivateDm ? firstLink?.url || undefined : undefined,
      ctaButtonTitle: data.sendPrivateDm
        ? firstLink?.label || undefined
        : undefined,
      responseFormat:
        data.sendPrivateDm && data.messageFormat === "ATTACHMENT" ? "ATTACHMENT" : data.sendPrivateDm && data.productCard
          ? "PRODUCT_CARD"
          : withLinks
            ? "LINK"
            : "TEXT",
      mediaUrl:
        data.sendPrivateDm && data.messageFormat === "ATTACHMENT" ? data.attachment?.url : data.sendPrivateDm && data.productCard
          ? data.productImageUrl
          : undefined,
      mediaType: data.messageFormat === "ATTACHMENT" ? data.attachment?.mediaType : undefined,
      cardSubtitle:
        data.sendPrivateDm && data.productCard
          ? data.productSubtitle
          : undefined,
      linkButtons: withLinks ? data.linkButtons : [],
      openingDmText: data.sendPrivateDm ? data.openingDmText : undefined,
      openingDmButtonText: data.sendPrivateDm
        ? data.openingDmButtonText
        : undefined,
      openingDmFormat: data.openingDmFormat || "BUTTON",
      openingDmEnabled: data.sendPrivateDm ? data.openingDmEnabled : false,
      followRequestDmText: data.sendPrivateDm
        ? data.followRequestDmText
        : undefined,
      followRequestButtonText: data.sendPrivateDm
        ? data.followRequestButtonText
        : undefined,
    },
  } as const;
}
