"use client";
import { commentTemplateDefaults } from "@/lib/automation-flow/basic-presets";

import {
  DEFAULT_EMAIL_CAPTURE_PROMPT,
  DEFAULT_FOLLOW_UP_MESSAGE,
  validateEngagementSettings,
} from "@/lib/automation-engagement-settings";
import { DEFAULT_COMMENT_ONLY_PROMPT, DEFAULT_COMMENT_PROMPT } from "@/lib/automation-copy";
import { createCommentEditorPayload } from "@/lib/comment-editor-payload";
import { validateProductCard } from "@/lib/product-card";
import { useUi } from "@/components/i18n/use-ui";
import { saveCampaign } from "@/actions/automation";
import { canAdvanceTriggerStep } from "@/lib/campaign-validation";
import {
  DEFAULT_FOLLOW_REQUEST_BUTTON_TEXT,
  DEFAULT_FOLLOW_REQUEST_DM_TEXT,
  DEFAULT_OPENING_DM_BUTTON_TEXT,
  DEFAULT_OPENING_DM_TEXT,
} from "@/lib/comment-dm-flow";
import {
  DEFAULT_LINK_BUTTON_LABEL,
  linkButtonsAreComplete,
  type LinkButton,
} from "@/lib/link-buttons";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { refreshSavedAutomation } from "@/lib/automation-query-cache";
import { useState, useEffect, useRef } from "react";
import {
  DEFAULT_AI_PROTECTION_RULES,
  type AiProtectionRules,
  type AiReplyTone,
} from "@/lib/ai-reply-config";

export type WizardStep = 1 | 2 | 3 | 4;

type SelectedPost = {
  postid: string;
  caption?: string;
  media: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
};

export type WizardData = {
  post: SelectedPost | null;
  adAutomation?: boolean;
  campaignName: string;
  triggerMode: "SPECIFIC_KEYWORD" | "ANY_COMMENT";
  keywords: string[];
  matchingMode: "EXACT" | "CONTAINS";
  sendPrivateDm: boolean;
  triggerOnShares?: boolean;
  oneDmPerUser?: boolean;
  deliveryDelaySeconds?: number;
  stepDelays?: import("@/lib/automation-step-delays").StepDelays;
  dmMessage: string;
  messageVariations?: string[];
  commentReplies?: string[];
  publicReplyLimit?: number;
  messageFormat?: "TEXT" | "LINK" | "ATTACHMENT";
  attachment?: import("@/lib/message-attachment").MessageAttachment;
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
  productCard?: boolean;
  productImageUrl?: string;
  productSubtitle?: string;
  linkButtons: LinkButton[];
  followGateRequired: boolean;
  openingDmText: string;
  openingDmButtonText: string;
  openingDmEnabled: boolean;
  openingDmFormat?: "BUTTON" | "QUICK_REPLY";
  followRequestDmText: string;
  followRequestButtonText: string;
  publicReply: string;
  publicReply2: string;
  publicReply3: string;
  publicReplyEnabled: boolean;
  aiReplyEnabled: boolean;
  aiReplyTone: AiReplyTone;
  aiReplyInstructions: string;
  aiProtectionRules: AiProtectionRules;
  active: boolean;
};

export const DEFAULT_PUBLIC_REPLIES = [
  "Thanks! Please see DMs.",
  "Sent you a message! Check it out!",
  "Nice! Check your DMs!",
] as const;

export const DEFAULT_DM_MESSAGE = "Here's the link I promised! 🎁";
export const DEFAULT_CTA_BUTTON_TITLE = "Get the Link";

const INITIAL: WizardData = {
  post: null,
  campaignName: "",
  phoneCaptureEnabled: false,
  phoneCapturePrompt: "Enter your phone number",
  followUpCondition: "ALWAYS",
  emailCaptureEnabled: false,
  emailCapturePrompt: DEFAULT_EMAIL_CAPTURE_PROMPT,
  followUpEnabled: false,
  followUpMessage: DEFAULT_FOLLOW_UP_MESSAGE,
  followUpDelayMinutes: 30,
  triggerMode: "SPECIFIC_KEYWORD",
  keywords: ["send", "dm me"],
  triggerOnShares: false,
  oneDmPerUser: false,
  deliveryDelaySeconds: 0,
  matchingMode: "CONTAINS",
  sendPrivateDm: false,
  dmMessage: DEFAULT_DM_MESSAGE,
  messageFormat: "LINK",
  linkButtons: [{ label: DEFAULT_LINK_BUTTON_LABEL, url: "" }],
  followGateRequired: false,
  openingDmText: DEFAULT_OPENING_DM_TEXT,
  openingDmButtonText: DEFAULT_OPENING_DM_BUTTON_TEXT,
  openingDmEnabled: false,
  followRequestDmText: DEFAULT_FOLLOW_REQUEST_DM_TEXT,
  followRequestButtonText: DEFAULT_FOLLOW_REQUEST_BUTTON_TEXT,
  publicReply: DEFAULT_PUBLIC_REPLIES[0],
  publicReply2: DEFAULT_PUBLIC_REPLIES[1],
  publicReply3: DEFAULT_PUBLIC_REPLIES[2],
  publicReplyEnabled: false,
  aiReplyEnabled: false,
  aiReplyTone: "FRIENDLY",
  aiReplyInstructions: "",
  aiProtectionRules: DEFAULT_AI_PROTECTION_RULES,
  active: true,
};

export function useWizard(
  slug: string,
  automationId?: string,
  integrationId = "",
  templateId?: string,
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tr = useUi();
  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>(() => ({
    ...INITIAL,
    // Existing automations are hydrated from their saved settings; new drafts start with AI.
    aiReplyEnabled: !automationId,
    aiReplyInstructions: automationId ? "" : tr(DEFAULT_COMMENT_ONLY_PROMPT),
    dmMessage: tr(INITIAL.dmMessage),
    publicReply: tr(INITIAL.publicReply),
    publicReply2: tr(INITIAL.publicReply2),
    publicReply3: tr(INITIAL.publicReply3),
    openingDmText: tr(INITIAL.openingDmText),
    openingDmButtonText: tr(INITIAL.openingDmButtonText),
    followRequestDmText: tr(INITIAL.followRequestDmText),
    followRequestButtonText: tr(INITIAL.followRequestButtonText),
    linkButtons: INITIAL.linkButtons.map((button) => ({
      ...button,
      label: tr(button.label),
    })),
    ...(!automationId && templateId ? commentTemplateDefaults(templateId) : {}),
  }));
  const draftKey = `ap3k:comment-draft:${slug}:${integrationId}:${automationId || templateId || "new"}`;
  const restoredKey = useRef("");
  useEffect(() => {
    if (!integrationId || automationId || restoredKey.current === draftKey) return;
    restoredKey.current = draftKey;
    try { const raw=sessionStorage.getItem(draftKey); if(raw) setData(prev=>({...prev,...JSON.parse(raw)})); } catch { /* browser storage may be unavailable */ }
  },[draftKey,integrationId,automationId]);
  const previousTr = useRef(tr);
  useEffect(() => {
    const before = previousTr.current;
    previousTr.current = tr;
    if (automationId || before === tr) return;
    setData((current) => {
      const next = { ...current };
      const fields = [
        "dmMessage",
        "publicReply",
        "publicReply2",
        "publicReply3",
        "openingDmText",
        "openingDmButtonText",
        "followRequestDmText",
        "followRequestButtonText",
      ] as const;
      for (const field of fields)
        if (current[field] === before(INITIAL[field]))
          next[field] = tr(INITIAL[field]);
      next.linkButtons = current.linkButtons.map((button) =>
        button.label === before(DEFAULT_LINK_BUTTON_LABEL)
          ? { ...button, label: tr(DEFAULT_LINK_BUTTON_LABEL) }
          : button,
      );
      return next;
    });
  }, [tr, automationId]);
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (partial: Partial<WizardData>) =>
    setData((prev) => {
      const next={...prev,...partial};
      // Adapt untouched starter copy when DM delivery is enabled or disabled.
      if (partial.sendPrivateDm !== undefined && partial.aiReplyInstructions === undefined &&
        [tr(DEFAULT_COMMENT_ONLY_PROMPT), tr(DEFAULT_COMMENT_PROMPT)].includes(prev.aiReplyInstructions)) {
        next.aiReplyInstructions = tr(partial.sendPrivateDm ? DEFAULT_COMMENT_PROMPT : DEFAULT_COMMENT_ONLY_PROMPT);
      }
      if(integrationId && !automationId) try { sessionStorage.setItem(draftKey,JSON.stringify(next)); } catch { /* publishing still works */ }
      return next;
    });

  const next = () => setStep((s) => Math.min(4, s + 1) as WizardStep);
  const back = () => setStep((s) => Math.max(1, s - 1) as WizardStep);
  const goTo = (s: WizardStep) => setStep(s);

  const hasCommentReply =
    data.aiReplyEnabled ||
    (data.publicReplyEnabled &&
      [data.publicReply, data.publicReply2, data.publicReply3].some((reply) =>
        reply.trim(),
      ));

  const canAdvance = (): boolean => {
    if (step === 1) return !!data.post;
    if (step === 2)
      return canAdvanceTriggerStep(data.triggerMode, data.keywords);
    if (step === 3) {
      if (
        validateEngagementSettings(
          data,
          data.sendPrivateDm,
          data.openingDmEnabled,
        )
      )
        return false;
      if (
        data.sendPrivateDm &&
        data.productCard &&
        validateProductCard(
          data.dmMessage,
          data.productImageUrl,
          data.productSubtitle,
        )
      )
        return false;
      if (!hasCommentReply && !data.sendPrivateDm) return false;
      if (
        data.sendPrivateDm &&
        data.openingDmEnabled &&
        (!data.openingDmText.trim() || !data.openingDmButtonText.trim())
      )
        return false;
      if (
        data.sendPrivateDm &&
        data.openingDmEnabled &&
        data.followGateRequired &&
        (!data.followRequestDmText.trim() ||
          !data.followRequestButtonText.trim())
      )
        return false;
      if (data.sendPrivateDm && data.messageFormat === "ATTACHMENT" && !data.attachment) return false;
      if (data.sendPrivateDm && data.messageFormat !== "ATTACHMENT" && !data.dmMessage.trim()) return false;
      if (
        data.sendPrivateDm &&
        (data.productCard || (data.messageFormat ?? "LINK") === "LINK") &&
        !linkButtonsAreComplete(data.linkButtons)
      )
        return false;
      return true;
    }
    return true;
  };

  const activate = async (activeOverride?: boolean) => {
    if (submitting.current) return;
    if (
      !data.post ||
      (data.sendPrivateDm &&
        ((data.messageFormat === "ATTACHMENT" ? !data.attachment : !data.dmMessage.trim()) ||
          (data.openingDmEnabled &&
            (!data.openingDmText.trim() || !data.openingDmButtonText.trim()))))
    ) {
      setError("Please complete all required steps before activating.");
      return;
    }
    if (data.triggerMode === "SPECIFIC_KEYWORD" && data.keywords.length === 0) {
      setError(
        "Add at least one keyword or switch the trigger to Any comment.",
      );
      return;
    }
    if (!hasCommentReply && !data.sendPrivateDm) {
      setError(
        "Choose a comment reply or DM before activating this automation.",
      );
      return;
    }
    if (
      data.sendPrivateDm &&
      (data.productCard || (data.messageFormat ?? "LINK") === "LINK") &&
      !linkButtonsAreComplete(data.linkButtons)
    ) {
      setError("Complete every link label and add a valid destination URL.");
      return;
    }
    if (
      data.sendPrivateDm &&
      data.openingDmEnabled &&
      data.followGateRequired &&
      (!data.followRequestDmText.trim() || !data.followRequestButtonText.trim())
    ) {
      setError("Add the follow request message and verification button.");
      return;
    }

    if (data.sendPrivateDm && data.productCard) {
      const cardError = validateProductCard(
        data.dmMessage,
        data.productImageUrl,
        data.productSubtitle,
      );
      if (cardError) {
        setError(cardError);
        return;
      }
    }

    const engagementError = validateEngagementSettings(
      data,
      data.sendPrivateDm,
      data.openingDmEnabled,
    );
    if (engagementError) {
      setError(engagementError);
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = createCommentEditorPayload(
        { ...data, post: data.post },
        activeOverride,
      );

      if (process.env.NODE_ENV !== "production") {
        console.info("[campaign-wizard] save payload", {
          name: payload.name,
          active: payload.active,
          triggerMode: payload.triggerMode,
          matchingMode: payload.matchingMode,
          postid: payload.post.postid,
          keywordsCount: payload.keywords.length,
          listenerPromptPresent: Boolean(payload.listener.prompt?.trim()),
          sendPrivateDm: payload.sendPrivateDm,
          publicReplyEnabled: payload.publicReplyEnabled,
          publicReplyCount: [
            payload.listener.commentReply,
            payload.listener.commentReply2,
            payload.listener.commentReply3,
          ].filter(Boolean).length,
          linkButtonsCount: payload.listener.linkButtons.length,
        });
      }

      const saved = await saveCampaign(payload, automationId, integrationId);

      const savedData = saved.data;
      const campaignId =
        typeof savedData === "object" && savedData !== null && "id" in savedData
          ? String(savedData.id)
          : null;

      if (saved.status !== 200 || !campaignId) {
        throw new Error(
          typeof saved.data === "string"
            ? saved.data
            : "Could not save automation. Please try again.",
        );
      }

      try { sessionStorage.removeItem(draftKey); } catch {}
      await refreshSavedAutomation(queryClient, campaignId);
      router.push(`/dashboard/${slug}/automation${payload.active ? `?published=${encodeURIComponent(campaignId)}` : ""}`);
      router.refresh();
    } catch (err) {
      console.error("[campaign-wizard] save failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not save automation. Please try again.",
      );
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    step,
    data,
    update,
    next,
    back,
    goTo,
    canAdvance,
    activate,
    isSubmitting,
    error,
  };
}
