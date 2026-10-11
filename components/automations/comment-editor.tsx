"use client";
import { editorStepDelays, type AutomationStep } from "@/lib/automation-step-delays";
import OpenerMessage from "./opener-message";
import PolicyScanDialog from "./policy-scan-dialog";
import { mapCommentPolicy, applyCommentPolicy } from "@/lib/automation-policy-input";
import type { PolicyScanInput } from "@/lib/automation-policy";
import { createCommentEditorPayload } from "@/lib/comment-editor-payload";
import { normalizeCampaignPayload, validateNormalizedCampaignPayload } from "@/lib/campaign-save";
import AttachmentPicker from "./attachment-picker";
import { attachmentId, normalizeAttachmentType } from "@/lib/message-attachment";

import {
  QuickEngagementRows,
  QuickEngagementButtons,
} from "./quick-engagement";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Clock3,
  Grid2X2,
  Loader2,
  Mail,
  MessageCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Text,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { WizardData } from "@/hooks/use-wizard";
import { useUi } from "@/components/i18n/use-ui";
import { FOLLOW_UP_DELAYS } from "@/lib/automation-engagement-settings";
import { PublicReplyComposer, MessageCopyComposer } from "./copy-composer";
import {
  DEFAULT_COMMENT_PROMPT,
  DEFAULT_COMMENT_ONLY_PROMPT,
  PUBLIC_REPLY_LIMITS,
} from "@/lib/automation-copy";
import { EditorSelect } from "./editor-select";
import MessageResponseEditor from "./message-response-editor";
import ProductCardEditor from "./product-card-editor";
import EditorLayout, {
  EditorGroup,
  EditorRow,
  EditorSwitch,
  editorStyles as s,
} from "./editor-layout";
import DelayControl from "./delay-control";
import EditorPreview, { type EditorPreviewMode } from "./editor-preview";

export type EditorPost = {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  media_type: string;
  timestamp?: string;
};
export type CommentEditorProps = {
  integrationId?: string;
  slug: string;
  data: WizardData;
  update: (value: Partial<WizardData>) => void;
  onSave: (active: boolean) => void;
  saving: boolean;
  error: string | null;
  editingActive: boolean;
  posts: EditorPost[];
  postsLoading: boolean;
  postsFetching: boolean;
  refreshPosts: () => void;
  username?: string | null;
  avatar?: string | null;
  connected: boolean;
  accountLoading: boolean;
  accountError: boolean;
  retryAccount: () => void;
  postsError?: string | null;
  followUpsReady: boolean;
  aiAvailable: boolean;
  paid: boolean;
  commentOnly: boolean;
};

export default function CommentEditor(p: CommentEditorProps) {
  const tr = useUi();
  const { data, update } = p;
  const [openTrigger, setOpenTrigger] = useState<string | null>("post");
  const [openMessage, setOpenMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorPreviewMode>("post");
  const [commentPreview, setCommentPreview] = useState("");
  const [messagePreview, setMessagePreview] = useState<string | null>(null);
  const [dmSettings, setDmSettings] = useState(false);
  const [replyKind, setReplyKind] = useState(data.aiReplyEnabled ? "AI" : "SAVED");
  useEffect(() => { setReplyKind(data.aiReplyEnabled ? "AI" : "SAVED"); }, [data.aiReplyEnabled]);
  const [delayEnabled, setDelayEnabled] = useState(Object.values(editorStepDelays(data)).some(n=>n>0));
  const delays = editorStepDelays(data);
  const changeDelay = (step:AutomationStep,seconds:number) => update({stepDelays:{...delays,[step]:seconds},deliveryDelaySeconds:0});
  const delayBefore = (step:AutomationStep,label:string) => delayEnabled ? <DelayControl label={label} seconds={delays[step] || 0} onChange={seconds=>changeDelay(step,seconds)}/> : null;
  const hasSavedDelay = Object.values(editorStepDelays(data)).some(n=>n>0);
  useEffect(() => { if (hasSavedDelay) setDelayEnabled(true); }, [hasSavedDelay]);
  const [scanInput, setScanInput] = useState<PolicyScanInput | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [publishAttempted, setPublishAttempted] = useState(false);
  const aiPublishError = data.aiReplyEnabled &&
    ((publishAttempted && !p.paid) || p.error === "AI only available on paid plans.");
  useEffect(() => {
    if (p.error === "AI only available on paid plans.") {
      setOpenMessage(null);
      setOpenTrigger("reply");
      setMode("comments");
    }
  }, [p.error]);
  const save = (active: boolean) => {
    if (active && data.aiReplyEnabled && !p.paid) {
      setPublishAttempted(true);
      setOpenMessage(null);
      setOpenTrigger("reply");
      setMode("comments");
      return;
    }
    setValidationError(null);
    if (active) {
      const issue = !data.post ? "Select a post before publishing." : validateNormalizedCampaignPayload(normalizeCampaignPayload(createCommentEditorPayload({...data, post:data.post}, true)));
      if (issue) { setValidationError(issue); return; }
      setScanInput(mapCommentPolicy(data, p.integrationId || ""));
      return;
    }
    p.onSave(active);
  };
  const [keyword, setKeyword] = useState("");
  const [postQuery, setPostQuery] = useState("");
  const toggleTrigger = (key: string) => {
    setOpenMessage(null);
    setOpenTrigger((v) => (v === key ? null : key));
    setMode(key === "post" ? "post" : "comments");
  };
  const toggleMessage = (key: string) => {
    setOpenTrigger(null);
    setOpenMessage((v) => (v === key ? null : key));
    setMode("dm");
  };
  const add = (key: string, values: Partial<WizardData>) => {
    update({ sendPrivateDm: true, ...values });
    setOpenTrigger(null);
    setOpenMessage(key);
    setMode("dm");
  };
  const addKeyword = () => {
    const value = keyword.trim();
    if (
      value &&
      !data.keywords.some((w) => w.toLowerCase() === value.toLowerCase())
    )
      update({ keywords: [...data.keywords, value] });
    setKeyword("");
  };
  const selectedAny = data.post?.postid === "ANY";
  const selectedNext = data.post?.postid === "NEXT";
  const replies =
    data.commentReplies ??
    [data.publicReply, data.publicReply2, data.publicReply3].filter(Boolean);
  const context = {
    integrationId: p.integrationId || "",
    available: p.aiAvailable,
    caption: data.post?.caption,
    sendDm: data.sendPrivateDm,
    openingDm: data.openingDmEnabled,
    hasButtons: data.messageFormat !== "TEXT",
  };
  const publicOn = data.publicReplyEnabled || data.aiReplyEnabled;
  const format = data.messageFormat === "ATTACHMENT" ? "ATTACHMENT" : data.productCard
    ? "PRODUCT_CARD"
    : data.messageFormat === "TEXT"
      ? "TEXT"
      : "LINK";
  const posts = [...p.posts]
    .sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime(),
    )
    .filter(
      (post) =>
        !postQuery ||
        `${post.caption || ""} ${post.id}`
          .toLowerCase()
          .includes(postQuery.toLowerCase()),
    );
  const field = (
    label: string,
    key:
      | "openingDmText"
      | "followRequestDmText"
      | "emailCapturePrompt"
      | "followUpMessage",
    rows = 4,
  ) => (
    <label className={s.field}>
      {tr(label)}
      <textarea
        value={data[key] || ""}
        onFocus={() => setMode("dm")}
        maxLength={640}
        rows={rows}
        dir="auto"
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </label>
  );
  const buttonField = (
    label: string,
    key: "openingDmButtonText" | "followRequestButtonText",
  ) => (
    <label className={s.field}>
      {tr(label)}
      <input
        value={data[key]}
        maxLength={20}
        dir="auto"
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </label>
  );

  return (
    <>
    {scanInput && <PolicyScanDialog open onOpenChange={open => { if (!open) setScanInput(null); }} input={scanInput} slug={p.slug} onPublish={() => { setScanInput(null); p.onSave(true); }} onApply={findings => { update(applyCommentPolicy(data, findings)); setScanInput(null); }} />}
    <EditorLayout
      slug={p.slug}
      name={data.campaignName}
      onNameChange={(campaignName) => update({ campaignName })}
      active={p.editingActive}
      saving={p.saving}
      onSave={save}
      error={aiPublishError ? null : validationError || p.error}
      accountName={p.username || undefined}
      preview={
        <EditorPreview
          commentPreview={commentPreview}
          data={{
            ...data,
            dmMessage: messagePreview ?? data.dmMessage,
            linkButtons: format === "TEXT" ? [] : data.linkButtons,
          }}
          mode={mode}
          onModeChange={setMode}
          username={p.username}
          avatar={p.avatar}
        />
      }
    >
      <EditorGroup
        title={
          data.adAutomation
            ? "Ad automation"
            : "Setup Triggers and Public Reply"
        }
        action={
          <div className={s.delayToggle}>
            <Clock3 size={17} aria-hidden="true" className="text-sky-600 dark:text-sky-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[.12em] text-slate-500 dark:text-slate-400">{tr("Enable delay")}</span>
            <EditorSwitch label="Enable delay" checked={delayEnabled} onChange={(enabled) => {
              setDelayEnabled(enabled);
              update({deliveryDelaySeconds:0,stepDelays:enabled ? delays : {}});
            }} />
          </div>
        }
      >
        {data.adAutomation && (
          <p className={s.hint}>
            {tr(
              "Select the Instagram post or Reel used in your ad. Matching comments on that media start this automation, including organic comments. Ads without a published Instagram post need an ad-media connection, which is not available in this workspace yet.",
            )}
          </p>
        )}
        <EditorRow
          title={data.adAutomation ? "Ad post" : "Post"}
          summary={tr(
            selectedNext ? "Next published post" : selectedAny
              ? "Any post"
              : data.post
                ? "1 post selected"
                : "Select post",
          )}
          icon={<Grid2X2 />}
          open={openTrigger === "post"}
          onOpen={() => toggleTrigger("post")}
          controls={
            <EditorSelect
              label="Post scope"
              value={selectedNext ? "NEXT" : selectedAny ? "ANY" : "SPECIFIC"}
              onChange={(value) => {
                update({
                  post:
                    (value === "ANY" || value === "NEXT")
                      ? {
                          postid: value,
                          caption: tr(
                            value === "NEXT" ? "Your next published Instagram post or Reel" : "Any post - triggers on all Instagram posts",
                          ),
                          media: "",
                          mediaType: "IMAGE",
                        }
                      : null,
                });
                setOpenMessage(null);
                setOpenTrigger("post");
                setMode("post");
              }}
              options={[
                { value: "SPECIFIC", label: "a specific post or reel" },
                { value: "NEXT", label: "Next published post", disabled: Boolean(data.adAutomation) },
                {
                  value: "ANY",
                  label: "Any post",
                  disabled: Boolean(data.adAutomation),
                },
              ]}
            />
          }
        >
          {selectedNext ? <div className={s.hint}><strong>{tr("Ready for your next post")}</strong><p>{tr("Publish this automation before your Instagram post or Reel. It will use the first post published afterward, then stay attached to that post. Editing or pausing does not reset it. Create a new automation for a later launch.")}</p></div> : p.accountLoading || p.postsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2
                className="animate-spin"
                aria-label={tr("Loading posts")}
              />
            </div>
          ) : p.accountError ? (
            <div role="alert">
              <p>{tr("Your account could not be loaded. Please try again.")}</p>
              <button
                type="button"
                onClick={p.retryAccount}
                className={s.publish}
              >
                {tr("Try again")}
              </button>
            </div>
          ) : !p.connected ? (
            <p>
              {tr("Connect Instagram first")}{" "}
              <Link
                className="text-violet-500 light:text-violet-700 underline"
                href={`/dashboard/${p.slug}/integrations`}
              >
                {tr("Connect Instagram")}
              </Link>
            </p>
          ) : selectedAny ? (
            <p className={s.hint}>{tr("Listen on every post and Reel.")}</p>
          ) : (
            <>
              <div className={s.postActions}>
                <input
                  aria-label={tr("Search posts")}
                  placeholder={tr("Search posts")}
                  className="min-w-0 rounded-lg bg-transparent px-2 py-1 text-xs"
                  value={postQuery}
                  onChange={(e) => setPostQuery(e.target.value)}
                />
                <button
                  type="button"
                  disabled={p.postsFetching}
                  onClick={p.refreshPosts}
                >
                  <RefreshCw
                    size={14}
                    className={p.postsFetching ? "animate-spin" : ""}
                  />
                  {tr("Refresh")}
                </button>
              </div>
              <div
                className={s.postStrip}
                role="group"
                aria-label={tr("Choose a specific post or Reel")}
              >
                {posts.map((post) => {
                  const media =
                    post.media_type === "VIDEO"
                      ? post.thumbnail_url || post.media_url
                      : post.media_url || post.thumbnail_url;
                  return (
                    <button
                      type="button"
                      key={post.id}
                      aria-label={`${tr("Select post")} ${post.caption || post.id}`}
                      aria-pressed={data.post?.postid === post.id}
                      onClick={() => {
                        update({
                          post: {
                            postid: post.id,
                            caption: post.caption,
                            media: media || "",
                            mediaType:
                              post.media_type === "VIDEO"
                                ? "VIDEO"
                                : post.media_type === "CAROUSEL_ALBUM"
                                  ? "CAROUSEL_ALBUM"
                                  : "IMAGE",
                          },
                        });
                        setMode("post");
                      }}
                      className={`${s.postTile} ${data.post?.postid === post.id ? s.postSelected : ""}`}
                    >
                      {media ? (
                        <Image
                          src={media}
                          alt={post.caption || tr("Instagram post")}
                          fill
                          sizes="(min-width:1600px) 200px,155px"
                          unoptimized
                        />
                      ) : (
                        <Grid2X2 className="m-auto" />
                      )}
                      <span>
                        {data.post?.postid === post.id ? (
                          <Check size={22} />
                        ) : (
                          <MoreVertical size={21} />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!posts.length && (
                <p className={s.hint}>
                  {tr(
                    p.posts.length
                      ? "No posts match your search."
                      : "No media loaded yet. Click Refresh posts, reconnect Instagram, or use Any post.",
                  )}
                </p>
              )}
            </>
          )}
          {p.postsError && (
            <p role="alert" className={s.error}>
              {p.postsError}
            </p>
          )}
        </EditorRow>
        <EditorRow
          title="Trigger"
          summary={
            data.triggerMode === "ANY_COMMENT"
              ? tr("Any comment")
              : `${data.keywords.length} ${tr("keywords")}`
          }
          icon={<Target />}
          open={openTrigger === "trigger"}
          onOpen={() => toggleTrigger("trigger")}
          controls={
            <EditorSelect
              label="Trigger type"
              value={data.triggerMode}
              onChange={(value) => {
                update({ triggerMode: value as WizardData["triggerMode"] });
                setOpenMessage(null);
                setOpenTrigger("trigger");
                setMode("comments");
              }}
              options={[
                { value: "SPECIFIC_KEYWORD", label: "a specific word (s)" },
                { value: "ANY_COMMENT", label: "Any comment" },
              ]}
            />
          }
        >
          {data.triggerMode === "SPECIFIC_KEYWORD" ? (
            <>
              <div className={s.chips}>
                {data.keywords.map((word) => (
                  <span key={word}>
                    <bdi>{word}</bdi>
                    <button
                      type="button"
                      aria-label={`${tr("Remove keyword")} ${word}`}
                      onClick={() =>
                        update({
                          keywords: data.keywords.filter((w) => w !== word),
                        })
                      }
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                <div className={s.keywordEntry}>
                <input
                  aria-label={tr("Add keyword")}
                  placeholder={tr("Add keyword")}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
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
              </div>
              <p className={`${s.hint} mt-2`}>
                {tr("Press Enter to add keyword")}
              </p>
              <div className={s.settingLine}>
                <strong>{tr("Keyword matching")}</strong>
                <EditorSelect
                  label="Keyword matching"
                  value={data.matchingMode}
                  onChange={(value) =>
                    update({ matchingMode: value as "EXACT" | "CONTAINS" })
                  }
                  options={[
                    { value: "CONTAINS", label: "Contains keyword" },
                    { value: "EXACT", label: "Exact match" },
                  ]}
                />
              </div>
            </>
          ) : (
            <p className={s.hint}>
              {tr("Reply to any eligible comment on the selected posts.")}
            </p>
          )}
          <div className={s.triggerOptions}>
            <div><EditorSwitch label="Also trigger on shares" checked={Boolean(data.triggerOnShares)} onChange={(triggerOnShares) => update({triggerOnShares, ...(triggerOnShares ? {sendPrivateDm:true} : {})})}/><div><strong>{tr("Also trigger on shares")}</strong><p>{tr("Runs when someone shares this post to your DMs.")}</p></div></div>
            <div><EditorSwitch label="One DM per user" checked={Boolean(data.oneDmPerUser)} onChange={(oneDmPerUser) => update({oneDmPerUser})}/><div><strong>{tr("One DM per user")}</strong><p>{tr("Even if they comment several times, they get only one DM.")}</p></div></div>
          </div>
        </EditorRow>
        {publicOn && delayBefore("PUBLIC_REPLY","Public comment reply")}
        <EditorRow
          title="Public comment reply"
          summary={
            publicOn
              ? data.aiReplyEnabled
                ? tr(aiPublishError ? "AI only available on paid plans." : "AI auto reply")
                : `${replies.length} ${tr("replies")}`
              : undefined
          }
          icon={<MessageCircle />}
          open={openTrigger === "reply"}
          onOpen={() => toggleTrigger("reply")}
          controls={
            <>
              <EditorSelect
                label="Public reply type"
                value={publicOn ? (data.aiReplyEnabled ? "AI" : "SAVED") : replyKind}
                onChange={(value) => {
                  setReplyKind(value);
                  setPublishAttempted(false);
                  update({
                    aiReplyEnabled: value === "AI",
                    publicReplyEnabled: value === "SAVED",
                    ...(value === "AI" && !data.aiReplyInstructions.trim()
                      ? {
                          aiReplyInstructions: tr(
                            data.sendPrivateDm
                              ? DEFAULT_COMMENT_PROMPT
                              : DEFAULT_COMMENT_ONLY_PROMPT,
                          ),
                        }
                      : {}),
                  });
                  setCommentPreview("");
                  setOpenMessage(null);
                  setOpenTrigger("reply");
                  setMode("comments");
                }}
                options={[
                  { value: "SAVED", label: "Manual" },
                  {
                    value: "AI",
                    label: "AI",
                    icon: <Sparkles size={16} aria-hidden="true" className="shrink-0 text-violet-500 dark:text-violet-400" />,
                  },
                ]}
              />
              <EditorSwitch
                label="Public comment reply"
                checked={publicOn}
                onChange={(enabled) => {
                  setPublishAttempted(false);
                  update({
                    publicReplyEnabled: enabled && replyKind === "SAVED",
                    aiReplyEnabled: enabled && replyKind === "AI",
                  });
                  setOpenMessage(null);
                  setOpenTrigger(enabled ? "reply" : null);
                  setMode("comments");
                }}
              />
            </>
          }
        >
          {publicOn ? (
            <>
              <PublicReplyComposer
                replies={replies}
                onRepliesChange={(next) => {
                  update({
                    commentReplies: next,
                    publicReply: next[0] || "",
                    publicReply2: next[1] || "",
                    publicReply3: next[2] || "",
                  });
                  setCommentPreview(next[0] || "");
                }}
                ai={data.aiReplyEnabled}
                prompt={data.aiReplyInstructions}
                onPromptChange={(aiReplyInstructions) =>
                  update({ aiReplyInstructions })
                }
                context={{ ...context, available: true }}
                publishLocked={aiPublishError}
                onPreview={setCommentPreview}
              />
              <div className={s.settingLine}>
                <div>
                  <strong>{tr("Reply limit")}</strong>
                  <p className={s.hint}>
                    {tr(
                      "Maximum public replies per post in a rolling 7 days. DMs continue when the limit is reached.",
                    )}
                  </p>
                </div>
                <EditorSelect
                  label="Reply limit"
                  value={String(data.publicReplyLimit || 0)}
                  onChange={(value) =>
                    update({ publicReplyLimit: Number(value) })
                  }
                  options={PUBLIC_REPLY_LIMITS.map((value) => ({
                    value: String(value),
                    label: value
                      ? tr("Limited to {count}/post").replace(
                          "{count}",
                          String(value),
                        )
                      : tr("Unlimited"),
                  }))}
                />
              </div>
            </>
          ) : (
            <p className={s.hint}>
              {tr("Enable Public comment reply to add a response.")}
            </p>
          )}
        </EditorRow>
      </EditorGroup>
      <EditorGroup
        title="Setup Direct Message"
        action={
          <div className={s.settingsMenu}>
            <button
              type="button"
              aria-label={tr("Message settings")}
              aria-expanded={dmSettings}
              onClick={() => setDmSettings(!dmSettings)}
            >
              <MoreVertical size={19} />
            </button>
            {dmSettings && (
              <div className={s.settingsPanel}>
                <div>
                  <strong>{tr("Disable direct message")}</strong>
                  <p className={s.hint}>
                    {tr("When disabled, only the public comment reply works.")}
                  </p>
                </div>
                <EditorSwitch
                  label="Disable direct message"
                  checked={!data.sendPrivateDm}
                  disabled={p.commentOnly}
                  onChange={(disabled) => {
                    update({
                      sendPrivateDm: !disabled,
                      ...(disabled
                        ? {
                            followGateRequired: false,
                            emailCaptureEnabled: false,
                            phoneCaptureEnabled: false,
                            followUpEnabled: false,
                          }
                        : {}),
                    });
                    setMode("dm");
                  }}
                />
              </div>
            )}
          </div>
        }
      >
        {p.commentOnly ? (
          <p className={s.hint}>
            {tr(
              "DMs are disabled for this review mode. This mode tests comment replies and lead tracking.",
            )}
          </p>
        ) : (
          <>
            {data.sendPrivateDm && data.openingDmEnabled && delayBefore("OPENING","Opener message")}
            {data.sendPrivateDm && data.openingDmEnabled && (
              <OpenerMessage data={data} update={update} open={openMessage === "opening"} onOpen={() => toggleMessage("opening")} onRemove={() => update({openingDmEnabled:false,followGateRequired:false,followUpEnabled:false})}/>
            )}
            {data.sendPrivateDm && (
              <QuickEngagementRows
                data={data}
                update={update}
                open={openMessage}
                setOpen={(v) => {
                  setOpenTrigger(null);
                  setOpenMessage(v);
                  setMode("dm");
                }}
                part="before" delayEnabled={delayEnabled} stepDelays={delays} onDelayChange={changeDelay}
              />
            )}
            {data.sendPrivateDm && delayBefore("MESSAGE","Message")}
            <EditorRow
              title="Message"
              summary={!data.sendPrivateDm ? tr("Off") : undefined}
              icon={<Text />}
              open={openMessage === "message"}
              onOpen={() => toggleMessage("message")}
              controls={
                <EditorSelect
                  label="Message format"
                  value={format}
                  onChange={(value) => {
                    update({
                      productCard: value === "PRODUCT_CARD",
                      messageFormat: value === "ATTACHMENT" ? "ATTACHMENT" : value === "TEXT" ? "TEXT" : "LINK",
                      sendPrivateDm: true,
                    });
                    setOpenTrigger(null);
                    setOpenMessage("message");
                    setMessagePreview(null);
                    setMode("dm");
                  }}
                  options={[
                    { value: "TEXT", label: "plain text" },
                    { value: "LINK", label: "text with button" },
                    { value: "PRODUCT_CARD", label: "image with button" },
                    { value: "ATTACHMENT", label: "attachment" },
                  ]}
                />
              }
            >
              {!data.sendPrivateDm ? (
                <button
                  type="button"
                  className={s.publish}
                  onClick={() => update({ sendPrivateDm: true })}
                >
                  {tr("Enable Send a DM")}
                </button>
              ) : format === "ATTACHMENT" ? (<AttachmentPicker value={data.attachment} onChange={attachment=>update({attachment})}/>) : format === "PRODUCT_CARD" ? (
                <ProductCardEditor
                  title={data.dmMessage}
                  subtitle={data.productSubtitle || ""}
                  imageUrl={data.productImageUrl || ""}
                  linkButtons={data.linkButtons}
                  onChange={(v) =>
                    update({
                      ...(v.title !== undefined ? { dmMessage: v.title } : {}),
                      ...(v.subtitle !== undefined
                        ? { productSubtitle: v.subtitle }
                        : {}),
                      ...(v.imageUrl !== undefined
                        ? { productImageUrl: v.imageUrl }
                        : {}),
                      ...(v.linkButtons ? { linkButtons: v.linkButtons } : {}),
                    })
                  }
                />
              ) : (
                <>
                  <MessageCopyComposer
                    message={data.dmMessage}
                    onMessageChange={(dmMessage) => {
                      update({ dmMessage });
                      setMessagePreview(null);
                    }}
                    variations={data.messageVariations || []}
                    onVariationsChange={(messageVariations) =>
                      update({ messageVariations })
                    }
                    context={{ ...context, hasButtons: format === "LINK" }}
                    linkButtons={data.linkButtons}
                    onPreview={(value) => {
                      setMessagePreview(value);
                      setMode("dm");
                    }}
                  >
                    {format === "LINK" && (
                      <MessageResponseEditor
                        hideMessage
                        message={data.dmMessage}
                        linkButtons={data.linkButtons}
                        onChange={(v) =>
                          update({
                            ...(v.linkButtons
                              ? { linkButtons: v.linkButtons }
                              : {}),
                          })
                        }
                      />
                    )}
                  </MessageCopyComposer>
                </>
              )}
            </EditorRow>
            {data.sendPrivateDm && (
              <QuickEngagementRows
                data={data}
                update={update}
                open={openMessage}
                setOpen={(v) => {
                  setOpenTrigger(null);
                  setOpenMessage(v);
                  setMode("dm");
                }}
                part="after"
              />
            )}
            <QuickEngagementButtons
              leading={!data.openingDmEnabled && <button type="button" onClick={() => add("opening", { openingDmEnabled: true })}><Mail />{tr("Opener message")}</button>}
              data={data}
              update={(v) =>
                update({ ...v, sendPrivateDm: true, ...(v.followGateRequired || v.followUpEnabled ? {openingDmEnabled:true}: {}) })
              }
              paid={p.paid}
              followUpsReady={p.followUpsReady}
              open={openMessage}
              setOpen={(v) => {
                setOpenTrigger(null);
                  setOpenMessage(v);
                setMode("dm");
              }}
            />
          </>
        )}
      </EditorGroup>
    </EditorLayout>
    </>
  );
}
