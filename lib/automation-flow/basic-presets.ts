import type { WizardData } from "@/hooks/use-wizard";
import { templateById, templatePreset } from "./templates";

export function commentTemplateDefaults(id: string): Partial<WizardData> {
  const template = templateById(id);
  if (!template) return {};
  const preset = templatePreset(id);
  return {
    campaignName: template.name,
    triggerMode: preset.anyMessage ? "ANY_COMMENT" : "SPECIFIC_KEYWORD",
    keywords: preset.keyword ? [preset.keyword] : [],
    matchingMode: "CONTAINS",
    post: preset.postScope === "all" ? { postid: "ANY", media: "", mediaType: "IMAGE" } : null,
    sendPrivateDm: true,
    oneDmPerUser: true,
    openingDmEnabled: Boolean(preset.opening || preset.followGateRequired || ["comment-leads", "follow-up"].includes(id)),
    openingDmText: "Thanks for your comment! Tap below to get the resource you requested.",
    openingDmButtonText: "Send me the link",
    followGateRequired: Boolean(preset.followGateRequired),
    dmMessage: id === "youtube" ? "Here’s the video you asked for. Enjoy watching!" : "Here’s the resource you requested! Tap below to open it. 🎁",
    messageFormat: "LINK",
    linkButtons: [{ label: id === "youtube" ? "Watch the video" : "Get the Link", url: "" }],
    publicReplyEnabled: true,
    aiReplyEnabled: false,
    publicReply: "{{username}} Thanks! I’ve sent you a DM. ✨",
    publicReply2: "{{username}} Check your DMs for the next step!",
    publicReply3: "{{username}} Your message is on its way. 💌",
    emailCaptureEnabled: id === "comment-leads",
    phoneCaptureEnabled: id === "comment-leads",
    emailCapturePrompt: "What’s your email address? I’ll save your details and share the resource here.",
    phoneCapturePrompt: "What’s your phone number, including country code?",
    followUpEnabled: id === "follow-up",
    followUpCondition: "NOT_CLICKED",
    followUpDelayMinutes: 30,
    followUpMessage: "Did you get a chance to open the link above? Reply here if you need any help.",
  };
}

export function messageTemplateDefaults(id: string) {
  const template = templateById(id);
  const preset = templatePreset(id);
  const textOnly = ["all-dms", "story-mentions"].includes(id);
  return {
    name: template?.name ?? "",
    storyTriggerType: preset.storyTrigger,
    triggerMode: preset.anyMessage ? "ANY_MESSAGE" as const : "SPECIFIC_KEYWORD" as const,
    keywords: preset.keyword ? [preset.keyword] : [],
    messageFormat: textOnly ? "TEXT" as const : "LINK" as const,
    message: id === "story-mentions" ? "Thanks for mentioning us in your story! We appreciate you sharing the love. 💜" : id === "all-dms" ? "Thanks for reaching out! What can we help you with today?" : id === "coupons" ? "Here’s the offer you asked about! Tap below to see the details." : id === "whatsapp" ? "Want to continue on WhatsApp? Tap below to start a conversation." : id === "sms" ? "You can sign up for text updates below. The signup page explains what to expect and asks for your consent." : "Thanks for your message! Here’s the link you requested. ✨",
    linkButtons: textOnly ? [] : [{ label: "Get the Link", url: "" }],
  };
}
