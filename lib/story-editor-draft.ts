import { normalizeEngagementSettings } from "@/lib/automation-engagement-settings";
import { normalizeStoryConfig, type StoryConfig } from "@/lib/story-automation";
import { normalizeMessageAutomationPayload, type RawMessageAutomationPayload, type MessageResponseFormat, type MessageTriggerMode } from "@/lib/message-automation";
import { readLinkButtons, readLegacyQuickReplies, type LinkButton } from "@/lib/link-buttons";
import { normalizeCopyList, MAX_MESSAGE_VARIATIONS } from "@/lib/automation-copy";
import { messageTemplateDefaults } from "@/lib/automation-flow/basic-presets";

export type StoryEditorDraft = ReturnType<typeof normalizeEngagementSettings> & {
  name:string; storyConfig:StoryConfig; triggerMode:MessageTriggerMode; keywords:string[];
  responseFormat:MessageResponseFormat; message:string; messageVariations:string[];
  linkButtons:LinkButton[]; quickReplies:string[]; mediaUrl:string; mediaType:string;
  stepDelays?:import("@/lib/automation-step-delays").StepDelays; deliveryDelaySeconds:number; oneDmPerUser:boolean; aiReplyEnabled:boolean;
  followGateRequired:boolean; followRequestDmText:string; followRequestButtonText:string;
  openingDmFormat?:"BUTTON"|"QUICK_REPLY"; openingDmEnabled:boolean; openingDmText:string; openingDmButtonText:string;
};
export function createStoryEditorDraft(automation?:any,templateId?:string):StoryEditorDraft {
  const listener=automation?.listener;
  const template=templateId ? messageTemplateDefaults(templateId) : null;
  const payload=normalizeMessageAutomationPayload({source:"STORY",storyTriggerType:automation?.storyTriggerType,storyConfig:automation?.storyConfig || (listener ? undefined : {scope:templateId === "story-mentions" ? "MENTION":"SPECIFIC"})});
  return {
    ...normalizeEngagementSettings(listener || {}),
    name:automation?.name || template?.name || "",
    storyConfig:normalizeStoryConfig(automation?.storyConfig || (!listener ? {scope:templateId === "story-mentions" ? "MENTION":"SPECIFIC"}:{}),automation?.storyTriggerType),
    triggerMode:listener ? automation.triggerMode === "INTENT_MATCH" ? "INTENT_MATCH" : automation.triggerMode === "SPECIFIC_KEYWORD" ? "SPECIFIC_KEYWORD":"ANY_MESSAGE" : templateId === "story-mentions" ? "ANY_MESSAGE":"SPECIFIC_KEYWORD",
    keywords:listener ? (automation.keywords || []).map((k:any)=>k.word).filter(Boolean) : ["send","dm me"],
    responseFormat:listener && ["TEXT","LINK","ATTACHMENT","MEDIA","PRODUCT_CARD","CAROUSEL"].includes(listener.responseFormat) ? listener.responseFormat : template?.messageFormat || "TEXT",
    message:listener?.prompt ?? template?.message ?? "Here’s the link I promised! 🎁",
    messageVariations:normalizeCopyList(listener?.messageVariations,MAX_MESSAGE_VARIATIONS),
    linkButtons:listener ? readLinkButtons(listener.quickReplies,listener.ctaButtonTitle,listener.ctaLink) : template?.linkButtons.length ? template.linkButtons : [{label:"Get the Link",url:""}],
    quickReplies:readLegacyQuickReplies(listener?.quickReplies),mediaUrl:listener?.mediaUrl || "",mediaType:listener?.mediaType || "IMAGE",
    stepDelays:automation?.stepDelays || undefined,
    deliveryDelaySeconds:automation?.deliveryDelaySeconds || 0,oneDmPerUser:automation?.oneDmPerUser ?? true,aiReplyEnabled:Boolean(listener?.aiDmReplyEnabled),
    followGateRequired:Boolean(automation?.followGateRequired),followRequestDmText:listener?.followRequestDmText || payload.followRequestDmText,followRequestButtonText:listener?.followRequestButtonText || payload.followRequestButtonText,
    openingDmFormat:listener?.openingDmFormat === "QUICK_REPLY" ? "QUICK_REPLY":"BUTTON",
    openingDmEnabled:Boolean(listener?.openingDmEnabled && listener?.openingDmText),openingDmText:listener?.openingDmText || "Hey! Ready for the link?",openingDmButtonText:listener?.openingDmButtonText || "Get the Link",
  };
}
export function storyEditorPayload(draft:StoryEditorDraft,active:boolean):RawMessageAutomationPayload {
  return {...draft,source:"STORY",active,storyTriggerType:draft.storyConfig.scope === "MENTION" ? "MENTION":"REPLY",linkButtons:draft.responseFormat === "LINK" ? draft.linkButtons:undefined,quickReplies:draft.quickReplies};
}
