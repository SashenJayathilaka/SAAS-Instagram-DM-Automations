"use client";
import StoryAutomationWizard from "./story-automation-wizard";
import PolicyScanDialog from "./policy-scan-dialog";
import { mapMessagePolicy, applyMessagePolicy } from "@/lib/automation-policy-input";
import type { PolicyScanInput } from "@/lib/automation-policy";
import AttachmentPicker from "./attachment-picker";
import { attachmentId, normalizeAttachmentType } from "@/lib/message-attachment";
import {
  QuickEngagementRows,
  QuickEngagementButtons,
} from "./quick-engagement";
import {
  normalizeEngagementSettings,
  type EngagementSettings,
} from "@/lib/automation-engagement-settings";
import { messageTemplateDefaults } from "@/lib/automation-flow/basic-presets";
import { templateById } from "@/lib/automation-flow/templates";

import EditorLayout, {
  EditorGroup,
  EditorRow,
  editorStyles as s,
} from "./editor-layout";
import EditorPreview from "./editor-preview";
import type { WizardData } from "@/hooks/use-wizard";
import { DEFAULT_AI_PROTECTION_RULES } from "@/lib/ai-reply-config";
import {
  normalizeMessageAutomationPayload,
  validateMessageAutomationPayload,
} from "@/lib/message-automation";
import {
  AtSign,
  MessageCircleReply,
  SmilePlus,
  Target,
  Text,
  UserRoundCheck,
  X,
  Plus,
} from "lucide-react";
import { useUi } from "@/components/i18n/use-ui";
import { UiMessage } from "@/components/i18n/dashboard-values";
import { saveMessageAutomation } from "@/actions/automation";
import { getAiWorkspace } from "@/actions/ai-workspace";
import { MessageCopyComposer } from "./copy-composer";
import {
  normalizeCopyList,
  MAX_MESSAGE_VARIATIONS,
} from "@/lib/automation-copy";
import MessageResponseEditor from "@/components/automations/message-response-editor";
import {
  DEFAULT_FOLLOW_REQUEST_BUTTON_TEXT,
  DEFAULT_FOLLOW_REQUEST_DM_TEXT,
  resolveFollowRequestButtonText,
  resolveFollowRequestDmText,
} from "@/lib/comment-dm-flow";
import {
  DEFAULT_LINK_BUTTON_LABEL,
  readLinkButtons,
  type LinkButton,
} from "@/lib/link-buttons";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { refreshSavedAutomation } from "@/lib/automation-query-cache";
import { useEffect, useRef, useState } from "react";

type Source = "STORY" | "DM";
type StoryTrigger = "MENTION" | "REACTION" | "REPLY";

type Draft = Partial<ReturnType<typeof normalizeEngagementSettings>> & {
  name: string;
  storyTriggerType: StoryTrigger;
  triggerMode: "SPECIFIC_KEYWORD" | "ANY_MESSAGE";
  keywords: string[];
  message: string;
  messageVariations?: string[];
  messageFormat: "TEXT" | "LINK" | "ATTACHMENT";
  attachment?: import("@/lib/message-attachment").MessageAttachment;
  linkButtons: LinkButton[];
  followGateRequired: boolean;
  followRequestDmText: string;
  followRequestButtonText: string;
  aiReplyEnabled: boolean;
};

const STORY_TRIGGERS = [
  {
    value: "MENTION",
    title: "Mentions me",
    description: "Tagged in a story",
    icon: AtSign,
  },
  {
    value: "REACTION",
    title: "Reacts",
    description: "Sends an emoji reaction",
    icon: SmilePlus,
  },
  {
    value: "REPLY",
    title: "Replies",
    description: "Sends a text reply to your story",
    icon: MessageCircleReply,
  },
] as const;

const INITIAL: Draft = {
  ...normalizeEngagementSettings({}),
  name: "",
  messageFormat: "LINK",
  storyTriggerType: "MENTION",
  triggerMode: "ANY_MESSAGE",
  keywords: [],
  message: "Thanks for reaching out! Here's what you asked for ✨",
  linkButtons: [{ label: DEFAULT_LINK_BUTTON_LABEL, url: "" }],
  followGateRequired: false,
  followRequestDmText: DEFAULT_FOLLOW_REQUEST_DM_TEXT,
  followRequestButtonText: DEFAULT_FOLLOW_REQUEST_BUTTON_TEXT,
  aiReplyEnabled: false,
};

function LegacyMessageAutomationWizard({
  integrationId = "",
  slug,
  source,
  automationId,
  automation,
  templateId,
  username,
  avatar,
  paid = false,
  followUpsReady = false,
}: {
  paid?: boolean;
  followUpsReady?: boolean;
  avatar?: string | null;
  username?: string | null;
  integrationId?: string;
  slug: string;
  source: Source;
  automationId?: string;
  automation?: any;
  templateId?: string;
}) {
  const tr = useUi();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openTrigger, setOpenTrigger] = useState(true);
  const [messagePreview, setMessagePreview] = useState<string | null>(null);
  const [openMessage, setOpenMessage] = useState<string | null>("message");
  const submitting = useRef(false);
  const [draft, setDraft] = useState<Draft>(() => ({
    ...INITIAL,
    message: tr(INITIAL.message),
    followRequestDmText: tr(INITIAL.followRequestDmText),
    followRequestButtonText: tr(INITIAL.followRequestButtonText),
    linkButtons: INITIAL.linkButtons.map((button) => ({
      ...button,
      label: tr(button.label),
    })),
  }));
  const previousTr = useRef(tr);
  useEffect(() => {
    const before = previousTr.current;
    previousTr.current = tr;
    if (automation || before === tr) return;
    setDraft((current) => {
      const next = { ...current };
      for (const field of [
        "message",
        "followRequestDmText",
        "followRequestButtonText",
      ] as const) {
        if (current[field] === before(INITIAL[field]))
          next[field] = tr(INITIAL[field]);
      }
      next.linkButtons = current.linkButtons.map((button) =>
        button.label === before(DEFAULT_LINK_BUTTON_LABEL)
          ? { ...button, label: tr(DEFAULT_LINK_BUTTON_LABEL) }
          : button,
      );
      return next;
    });
  }, [tr, automation]);
  const initializedTemplate = useRef(false);
  useEffect(() => {
    const template = templateById(templateId);
    if (automationId || !template || initializedTemplate.current) return;
    initializedTemplate.current = true;
    setDraft((value) => ({
      ...value,
      ...messageTemplateDefaults(template.id),
    }));
  }, [automationId, templateId]);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState<PolicyScanInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    if (!automation?.listener) return;
    const storedLinks = readLinkButtons(
      automation.listener.quickReplies,
      automation.listener.ctaButtonTitle,
      automation.listener.ctaLink,
    );
    setDraft({
      ...normalizeEngagementSettings(automation.listener || {}),
      name: automation.name ?? "",
      messageFormat:
        automation.listener.responseFormat === "ATTACHMENT" ? "ATTACHMENT" : automation.listener.responseFormat === "TEXT" ? "TEXT" : "LINK",
      attachment: automation.listener.responseFormat === "ATTACHMENT" && attachmentId(automation.listener.mediaUrl) ? {id:attachmentId(automation.listener.mediaUrl)!,url:automation.listener.mediaUrl,name:"Attachment",mediaType:normalizeAttachmentType(automation.listener.mediaType)} : undefined,
      storyTriggerType:
        automation.storyTriggerType === "REACTION" ||
        automation.storyTriggerType === "REPLY"
          ? automation.storyTriggerType
          : "MENTION",
      triggerMode:
        automation.triggerMode === "SPECIFIC_KEYWORD"
          ? "SPECIFIC_KEYWORD"
          : "ANY_MESSAGE",
      keywords: Array.isArray(automation.keywords)
        ? automation.keywords.map((item: any) => item.word).filter(Boolean)
        : [],
      message: automation.listener.prompt ?? "",
      messageVariations: normalizeCopyList(
        automation.listener.messageVariations,
        MAX_MESSAGE_VARIATIONS,
      ),
      linkButtons: storedLinks.length
        ? storedLinks
        : [{ label: DEFAULT_LINK_BUTTON_LABEL, url: "" }],
      followGateRequired: Boolean(automation.followGateRequired),
      followRequestDmText: resolveFollowRequestDmText(
        automation.listener.followRequestDmText,
      ),
      followRequestButtonText: resolveFollowRequestButtonText(
        automation.listener.followRequestButtonText,
      ),
      aiReplyEnabled: Boolean(automation.listener.aiDmReplyEnabled),
    });
  }, [automation]);

  useEffect(() => {
    if (!integrationId) return;
    void getAiWorkspace()
      .then((result) => {
        const paid = result.plan === "PRO" || result.plan === "BUSINESS";
        setAiAvailable(paid);
      })
      .catch(() => setAiAvailable(false));
  }, [integrationId]);

  const summarySource =
    source === "STORY"
      ? draft.storyTriggerType === "MENTION"
        ? "When someone mentions you in a story, AP3K sends them a DM."
        : draft.storyTriggerType === "REACTION"
          ? "When someone reacts to your story, AP3K sends them a DM."
          : "When someone replies to your story, AP3K sends them a DM."
      : draft.triggerMode === "ANY_MESSAGE"
        ? "When someone sends you a DM, AP3K sends them a DM."
        : "When someone sends a DM containing {keywords}, AP3K sends them a DM.";
  const ruleSummary = (
    <UiMessage
      source={summarySource}
      values={{
        keywords: <bdi>{draft.keywords.join(", ") || tr("your keyword")}</bdi>,
      }}
    />
  );

  const addKeyword = () => {
    const word = keywordDraft.trim().toLowerCase();
    if (!word || draft.keywords.includes(word)) return;
    setDraft((current) => ({
      ...current,
      keywords: [...current.keywords, word],
    }));
    setKeywordDraft("");
  };

  const save = async (active: boolean, skipScan = false) => {
    if (submitting.current) return;
    const withLinks = !draft.aiReplyEnabled && draft.messageFormat === "LINK";
    const firstLink = withLinks ? draft.linkButtons[0] : undefined;
    const payload = {
      ...draft,
      source,
      active,
      responseFormat: draft.messageFormat === "ATTACHMENT" && !draft.aiReplyEnabled ? "ATTACHMENT" : withLinks ? "LINK" : "TEXT",
      mediaUrl:draft.attachment?.url,mediaType:draft.attachment?.mediaType,
      linkButtons: withLinks ? draft.linkButtons : undefined,
      ctaLink: firstLink?.url,
      ctaButtonTitle: firstLink?.label,
    };
    const invalid = validateMessageAutomationPayload(
      normalizeMessageAutomationPayload(payload),
    );
    if (invalid) {
      setError(invalid);
      return;
    }
    if (
      !draft.aiReplyEnabled &&
      draft.followGateRequired &&
      (!draft.followRequestDmText.trim() ||
        !draft.followRequestButtonText.trim())
    ) {
      setError("Add the follow request message and verification button.");
      return;
    }
    if (active && draft.aiReplyEnabled && !paid) { setError("AI only available on paid plans."); return; }
    if (active && !skipScan) { setScanInput(mapMessagePolicy(draft, integrationId, source)); return; }
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await saveMessageAutomation(
        payload,
        automationId,
        integrationId,
      );
      if (
        result.status === 200 &&
        typeof result.data === "object" &&
        result.data?.id
      ) {
        await refreshSavedAutomation(queryClient, result.data.id);
        router.push(`/dashboard/${slug}/automation${active ? `?published=${encodeURIComponent(result.data.id)}` : ""}`);
        router.refresh();
        return;
      }
      setError(
        typeof result.data === "string"
          ? result.data
          : "Could not save automation.",
      );
    } catch {
      setError("Could not save automation.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  const previewData: WizardData = {
    ...normalizeEngagementSettings(draft),
    post: null,
    campaignName: draft.name,
    triggerMode: "ANY_COMMENT",
    keywords: draft.keywords,
    matchingMode: "CONTAINS",
    sendPrivateDm: true,
    dmMessage: messagePreview ?? draft.message,
    messageFormat:draft.messageFormat,attachment:draft.attachment,
    linkButtons:
      draft.messageFormat === "LINK" && !draft.aiReplyEnabled
        ? draft.linkButtons
        : [],
    followGateRequired: !draft.aiReplyEnabled && draft.followGateRequired,
    openingDmEnabled: false,
    openingDmText: "",
    openingDmButtonText: "",
    followRequestDmText: draft.followRequestDmText,
    followRequestButtonText: draft.followRequestButtonText,
    publicReply: "",
    publicReply2: "",
    publicReply3: "",
    publicReplyEnabled: false,
    aiReplyEnabled: false,
    aiReplyTone: "FRIENDLY",
    aiReplyInstructions: "",
    aiProtectionRules: DEFAULT_AI_PROTECTION_RULES,
    active: Boolean(automation?.active),
  };
  const interaction =
    source === "STORY"
      ? STORY_TRIGGERS.find((t) => t.value === draft.storyTriggerType)
          ?.description
      : "When someone sends you a DM";
  return (
    <>
    {scanInput && <PolicyScanDialog open onOpenChange={open => { if (!open) setScanInput(null); }} input={scanInput} slug={slug} onPublish={() => { setScanInput(null); void save(true, true); }} onApply={findings => { setDraft(current => applyMessagePolicy(current, findings)); setScanInput(null); }} />}
    <EditorLayout
      slug={slug}
      name={draft.name}
      onNameChange={(name) => setDraft((v) => ({ ...v, name }))}
      active={Boolean(automation?.active)}
      saving={saving}
      onSave={(active) => void save(active)}
      error={error}
      accountName={username || undefined}
      preview={
        <EditorPreview
          data={previewData}
          mode="dm"
          onModeChange={() => {}}
          username={username}
          avatar={avatar}
          source={source}
          interaction={interaction}
          aiDmReply={draft.aiReplyEnabled}
        />
      }
    >
      <EditorGroup title="Setup Triggers">
        <EditorRow
          title={source === "STORY" ? "Story interaction" : "Trigger"}
          icon={<Target />}
          open={openTrigger}
          onOpen={() => setOpenTrigger(!openTrigger)}
          controls={
            source === "STORY" ? (
              <select
                aria-label={tr("Story interaction")}
                value={draft.storyTriggerType}
                onChange={(e) =>
                  setDraft((v) => ({
                    ...v,
                    storyTriggerType: e.target.value as StoryTrigger,
                  }))
                }
              >
                {STORY_TRIGGERS.map((t) => (
                  <option value={t.value} key={t.value}>
                    {tr(t.title)}
                  </option>
                ))}
              </select>
            ) : (
              <select
                aria-label={tr("Trigger type")}
                value={draft.triggerMode}
                onChange={(e) =>
                  setDraft((v) => ({
                    ...v,
                    triggerMode: e.target.value as Draft["triggerMode"],
                  }))
                }
              >
                <option value="SPECIFIC_KEYWORD">
                  {tr("a specific word (s)")}
                </option>
                <option value="ANY_MESSAGE">{tr("Any incoming DM")}</option>
              </select>
            )
          }
        >
          {source === "DM" && draft.triggerMode === "SPECIFIC_KEYWORD" && (
            <div className={s.chips}>
              {draft.keywords.map((word) => (
                <span key={word}>
                  <bdi>{word}</bdi>
                  <button
                    type="button"
                    aria-label={`${tr("Remove keyword")} ${word}`}
                    onClick={() =>
                      setDraft((v) => ({
                        ...v,
                        keywords: v.keywords.filter((w) => w !== word),
                      }))
                    }
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
              <input
                aria-label={tr("Add keyword")}
                placeholder={tr("Add keyword")}
                value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
              />
              <button
                type="button"
                aria-label={tr("Add keyword")}
                onClick={addKeyword}
              >
                <Plus size={16} />
              </button>
            </div>
          )}
          <p className={`${s.hint} mt-3`}>{ruleSummary}</p>
        </EditorRow>
      </EditorGroup>
      <EditorGroup title="Setup Direct Message">
        {!draft.aiReplyEnabled && (
          <QuickEngagementRows
            data={draft}
            update={(v) => setDraft((d) => ({ ...d, ...v }))}
            open={openMessage}
            setOpen={setOpenMessage}
            part="before"
          />
        )}
        <EditorRow
          title="Message"
          icon={<Text />}
          open={openMessage === "message"}
          onOpen={() =>
            setOpenMessage((v) => (v === "message" ? null : "message"))
          }
          controls={
            <select
              aria-label={tr("Message format")}
              value={draft.aiReplyEnabled ? "AI" : draft.messageFormat}
              onChange={(e) => {
                const value = e.target.value;
                setMessagePreview(null);
                setDraft((v) => ({
                  ...v,
                  aiReplyEnabled: value === "AI",
                  messageFormat: value === "ATTACHMENT" ? "ATTACHMENT" : value === "LINK" ? "LINK" : "TEXT",
                  ...(value === "AI"
                    ? {
                        followGateRequired: false,
                        emailCaptureEnabled: false,
                        phoneCaptureEnabled: false,
                        followUpEnabled: false,
                      }
                    : {}),
                }));
                setOpenMessage("message");
              }}
            >
              <option value="TEXT">{tr("plain text")}</option>
              <option value="LINK">{tr("text with button")}</option>
              <option value="ATTACHMENT">{tr("attachment")}</option>
              <option
                value="AI"
                disabled={!aiAvailable && !draft.aiReplyEnabled}
              >
                {tr("AP3K AI reply")} · {tr("Pro")}
              </option>
            </select>
          }
        >
          {draft.aiReplyEnabled && (
            <p className={`${s.hint} mb-4`}>
              {tr(
                "AP3K AI uses the incoming DM plus your knowledge, behavior, and guardrails. When a saved knowledge URL answers the request, AI can attach it as one native Instagram button. The message below is sent only if the provider is unavailable.",
              )}
            </p>
          )}
          {draft.aiReplyEnabled ? (
            <label className={s.field}>
              {tr("Safe fallback message")}
              <textarea
                rows={5}
                maxLength={1000}
                dir="auto"
                value={draft.message}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, message: e.target.value }))
                }
              />
            </label>
          ) : draft.messageFormat === "ATTACHMENT" ? (<AttachmentPicker value={draft.attachment} onChange={attachment=>setDraft(v=>({...v,attachment}))}/>) : (
            <>
              <MessageCopyComposer
                message={draft.message}
                onMessageChange={(message) =>
                  setDraft((v) => ({ ...v, message }))
                }
                variations={draft.messageVariations || []}
                onVariationsChange={(messageVariations) =>
                  setDraft((v) => ({ ...v, messageVariations }))
                }
                context={{
                  integrationId,
                  available: aiAvailable,
                  sendDm: true,
                  hasButtons: draft.messageFormat === "LINK",
                }}
                linkButtons={draft.linkButtons}
                onPreview={setMessagePreview}
              >
                {draft.messageFormat === "LINK" && (
                  <MessageResponseEditor
                    hideMessage
                    message={draft.message}
                    linkButtons={draft.linkButtons}
                    onChange={(next) => setDraft((v) => ({ ...v, ...next }))}
                  />
                )}
              </MessageCopyComposer>
            </>
          )}
          {!aiAvailable && (
            <p className={s.hint}>
              {tr("AI generation is available on Pro and Business plans.")}
            </p>
          )}
        </EditorRow>
        {!draft.aiReplyEnabled && (
          <>
            <QuickEngagementRows
              data={draft}
              update={(v) => setDraft((d) => ({ ...d, ...v }))}
              open={openMessage}
              setOpen={setOpenMessage}
              part="after"
            />
            <QuickEngagementButtons
              data={draft}
              update={(v) => setDraft((d) => ({ ...d, ...v }))}
              paid={paid}
              followUpsReady={followUpsReady}
              open={openMessage}
              setOpen={setOpenMessage}
            />
          </>
        )}
      </EditorGroup>
    </EditorLayout>
    </>
  );
}

export default function MessageAutomationWizard(props: Parameters<typeof LegacyMessageAutomationWizard>[0]) {
  return props.source === "STORY" ? <StoryAutomationWizard key={`${props.integrationId}:${props.automationId || props.templateId || "new"}`} {...props}/> : <LegacyMessageAutomationWizard {...props}/>;
}
