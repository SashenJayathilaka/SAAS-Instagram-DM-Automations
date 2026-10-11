"use client";
import { editorStepDelays, type AutomationStep } from "@/lib/automation-step-delays";
import {AttachmentPreview} from "./attachment-picker";

import { personalizeUsername } from "@/lib/automation-copy";
import { MentionText } from "./mention-text";
import Image from "next/image";
import type { ReactNode, Ref } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  Bookmark,
  Camera,
  ChevronLeft,
  Grid2X2,
  Heart,
  ImageIcon,
  Link2,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Phone,
  Send,
  Smile,
  Smartphone,
  Video,
} from "lucide-react";
import { useUi } from "@/components/i18n/use-ui";
import type { WizardData } from "@/hooks/use-wizard";
import {
  FOLLOW_UP_CONDITIONS,
  followUpDelayLabel, followUpConditionLabel,
  emailRequestMessage,
} from "@/lib/automation-engagement-settings";
import styles from "./editor-preview.module.css";

export type EditorPreviewMode = "post" | "comments" | "dm";
export default function EditorPreview({
  commentPreview,
  data,
  mode,
  onModeChange,
  username,
  avatar,
  source = "COMMENT",
  interaction,
  aiDmReply = false,
  conversation,
  composer,
  toolbar,
  messagesRef,
  className = "",
  postPlaceholder,
  phoneFrame = false,
  incomingMessage,
  carouselCards,
  quickReplyLabels,
}: {
  commentPreview?: string;
  data: Partial<WizardData>;
  mode: EditorPreviewMode;
  onModeChange: (mode: EditorPreviewMode) => void;
  username?: string | null;
  avatar?: string | null;
  source?: "COMMENT" | "STORY" | "DM";
  interaction?: string;
  aiDmReply?: boolean;
  conversation?: ReactNode;
  composer?: ReactNode;
  toolbar?: ReactNode;
  messagesRef?: Ref<HTMLDivElement>;
  className?: string;
  postPlaceholder?: string;
  phoneFrame?: boolean;
  incomingMessage?: string;
  carouselCards?: import("@/lib/story-automation").StoryCard[];
  quickReplyLabels?: string[];
}) {
  const tr = useUi();
  const reduced = useReducedMotion();
  const handle = username?.replace(/^@/, "") || tr("youraccount");
  const avatarNode = (
    <span className={styles.avatar}>
      {avatar ? (
        <Image src={avatar} alt="" fill sizes="32px" unoptimized />
      ) : (
        handle.slice(0, 1).toUpperCase()
      )}
    </span>
  );
  const tabs =
    source === "COMMENT"
      ? (["post", "comments", "dm"] as const)
      : (["dm"] as const);
  const bubble = (
    message: string,
    buttons: string[] = [],
    outbound = false,
    links = false,
    quick = false,
  ) => (
    <div className={outbound ? styles.outboundRow : styles.messageRow}>
      {!outbound && <span className={styles.messageAvatar}>{avatarNode}</span>}
      <div className={outbound ? styles.outbound : styles.message}>
        <p dir="auto">{outbound ? message : <MentionText text={message} username="ola_nordman"/>}</p>
        {buttons.map((label, index) => (
          <span key={index} dir="auto" className={quick ? styles.quickReply : styles.button}>
            {links && <Link2 size={12} />}
            <bdi>{label}</bdi>
          </span>
        ))}
      </div>
    </div>
  );
  const waits = editorStepDelays(data);
  const waitBefore = (step: AutomationStep) => waits[step] ? <p className={styles.wait}>{tr("Waits")} {tr(followUpDelayLabel(waits[step]! / 60))}</p> : null;
  return (
    <section
      className={`${styles.preview} ${phoneFrame ? styles.phonePreview : ""} ${className}`}
      aria-label={tr("Instagram live preview")}
    >
      <header className={styles.heading}>
        <span>
          <Smartphone size={16} />
          {tr("Live preview")}
        </span>
        <div>
          {toolbar}
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab}
              aria-label={tr(
                tab === "comments"
                  ? "Comments"
                  : tab === "post"
                    ? "Post"
                    : "DM",
              )}
              aria-pressed={mode === tab}
              onClick={() => onModeChange(tab)}
            >
              {tab === "post" ? (
                <Grid2X2 size={16} />
              ) : tab === "comments" ? (
                <MessageCircle size={16} />
              ) : (
                <Send size={16} />
              )}
            </button>
          ))}
        </div>
      </header>
      <div className={`${styles.card} ${phoneFrame ? styles.phoneFrame : ""}`}>
        {phoneFrame && <div className={styles.phoneStatus}><span>9:41</span><span>▮▮▮ ▰</span></div>}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className={styles.screen}
            key={mode}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
          >
            <div className={styles.profile}>
              {mode === "dm" && <ChevronLeft size={18} />} {avatarNode}
              <div>
                <strong>
                  <bdi>{handle}</bdi><BadgeCheck size={13} className="inline-block ml-1 fill-[#1684f8] text-white"/>
                </strong>
                <small>
                  {tr(mode === "dm" ? "Active now" : "Original audio")}
                </small>
              </div>
              {mode === "dm" ? (
                <>
                  <Phone size={17} />
                  <Video size={19} />
                </>
              ) : (
                <MoreHorizontal size={20} />
              )}
            </div>
            {mode === "post" || mode === "comments" ? (
              <>
                <div className={styles.media}>
                  {data.post?.media ? (
                    <Image
                      src={data.post.media}
                      alt={data.post.caption || tr("Selected Instagram post")}
                      fill
                      sizes="(max-width: 1023px) 360px, 400px"
                      className={styles.postImage}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.placeholder}>
                      {postPlaceholder ||
                        tr(
                          data.post?.postid === "NEXT" ? tr("Your next post") : data.post?.postid === "ANY"
                            ? "Any post or Reel"
                            : "You haven’t picked a post",
                        )}
                    </div>
                  )}
                </div>
                <div className={styles.postFooter}>
                  <div className={styles.postIcons}>
                    <Heart />
                    <MessageCircle />
                    <Send />
                    <Bookmark />
                  </div>
                  <p>
                    <strong>{handle}</strong>{" "}
                    <bdi>
                      {data.post?.caption ||
                        tr(
                          "Your Instagram caption and automation trigger preview will appear here.",
                        )}
                    </bdi>
                  </p>
                </div>
                {mode === "comments" && (
                  <div className={styles.comments}>
                    <h4>{tr("Comments")}</h4>
                    {waitBefore("PUBLIC_REPLY")}
                    {["ola_nordman", "richard_roe"].map((sample, index) => <div key={sample}>
                      <div className={styles.comment}><span className={styles.sampleAvatar}><Image src={`/images/preview/${sample}.jpg`} alt="" width={32} height={32}/></span><div><strong>{sample}</strong><p dir="auto">{data.triggerMode === "ANY_COMMENT" ? tr("This looks amazing!") : data.keywords?.[index === 0 ? 1 : 0] || data.keywords?.[0] || tr("your keyword")}</p><small>2h · 1 {tr("like")} · {tr("Reply")}</small></div><Heart size={13}/></div>
                      {(data.publicReplyEnabled || data.aiReplyEnabled) && <div className={`${styles.comment} ${styles.reply}`}>{avatarNode}<div><strong>{handle}<BadgeCheck size={12} className="ml-1 inline-block fill-[#1684f8] text-white"/></strong><p dir="auto"><MentionText username={sample} text={commentPreview || (data.aiReplyEnabled ? tr("Thanks {{username}}! Check your DMs for the next step.") : (data.commentReplies ?? [data.publicReply, data.publicReply2, data.publicReply3]).filter(Boolean)[index] || data.publicReply || "")}/></p><small>1s · {tr("Reply")}</small></div></div>}
                    </div>)}
                    <div className={styles.emojis}>❤️ 🙌 🔥 👏 😢 😍 😮 😂</div>
                    <div className={styles.input}>{tr("Add a comment…")}</div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={styles.messages} ref={messagesRef}>
                  <p className={styles.timestamp}>{tr("Today")}</p>
                  {interaction && (
                    <p className={styles.interaction}>{tr(interaction)}</p>
                  )}
                  {incomingMessage && bubble(incomingMessage, [], true)}
                  {conversation ??
                    (!data.sendPrivateDm ? (
                      <p className={styles.interaction}>
                        {tr("DM is turned off")}
                      </p>
                    ) : (
                      <>
                        {data.openingDmEnabled && (
                          <>
                            {waitBefore("OPENING")}
                            {bubble(data.openingDmText || "", [
                              data.openingDmButtonText || tr("Continue"),
                            ], false, false, data.openingDmFormat === "QUICK_REPLY")}
                            {bubble(
                              data.openingDmButtonText || tr("Continue"),
                              [],
                              true,
                            )}
                          </>
                        )}
                        {data.followGateRequired && (
                          <>
                            {waitBefore("FOLLOW")}
                            {bubble(data.followRequestDmText || "", [
                              tr("Follow"),
                              data.followRequestButtonText || tr("I followed"),
                            ])}
                            {bubble(
                              data.followRequestButtonText || tr("I followed"),
                              [],
                              true,
                            )}
                          </>
                        )}
                        {data.emailCaptureEnabled && (
                          <>
                            {waitBefore("EMAIL")}
                            {bubble(
                              emailRequestMessage(
                                data.emailCapturePrompt || "",
                              ),
                            )}
                            {bubble("hello@example.com", [], true)}
                          </>
                        )}
                        {data.phoneCaptureEnabled && (
                          <>
                            {waitBefore("PHONE")}
                            {bubble(
                              data.phoneCapturePrompt || tr("What’s your phone number, including country code?"),
                            )}
                            {bubble("+1 (949) 653-7130", [], true)}
                          </>
                        )}
                        {waitBefore("MESSAGE")}
                        {aiDmReply && (
                          <p className={styles.interaction}>
                            {tr("AI response enabled")}
                          </p>
                        )}
                        {data.productCard && data.productImageUrl && (
                          <div className={styles.productImage}>
                            <Image
                              src={data.productImageUrl}
                              alt={tr("Product image")}
                              fill
                              sizes="280px"
                              unoptimized
                            />
                          </div>
                        )}
                        {carouselCards?.length ? <div className={styles.carousel}>{carouselCards.map((card,index)=><div className={styles.carouselCard} key={index}>{card.image && <Image src={card.image} alt={card.title || tr("Product image")} width={250} height={180} unoptimized/>}<strong dir="auto">{card.title}</strong><small dir="auto">{card.subtitle}</small>{card.links.map((link,i)=><span key={i} className={styles.button}>{link.label}</span>)}</div>)}</div> : data.messageFormat === "ATTACHMENT" ? (data.attachment ? <AttachmentPreview attachment={data.attachment}/> : bubble(tr("Attachment"))) : bubble(
                          data.dmMessage || tr("Enter your message here"),
                          aiDmReply
                            ? []
                            : (data.linkButtons ?? []).map(
                                (b) => b.label || tr("Get the Link"),
                              ),
                          false,
                          true,
                        )}
                        {quickReplyLabels?.length ? <div className={styles.quickReplies}>{quickReplyLabels.map((label,index)=><span key={index}>{label}</span>)}</div> : null}
                        {data.productCard && data.productSubtitle && (
                          <p className={styles.interaction}>
                            {data.productSubtitle}
                          </p>
                        )}
                        {data.followUpEnabled && (
                          <>
                            <p className={styles.wait}>{tr("Waits")} {tr(followUpDelayLabel(data.followUpDelayMinutes ?? 1))}</p>
                            <span className={styles.condition}>{tr(followUpConditionLabel(data.followUpCondition))}</span>
                            {bubble(data.followUpMessage || "") }
                          </>
                        )}
                      </>
                    ))}
                </div>
                {composer ?? (
                  <div className={styles.composer}>
                    <span className={styles.camera}>
                      <Camera size={15} />
                    </span>
                    <span className={styles.composerInput}>
                      {tr("Message…")}
                      <Mic size={13} />
                    </span>
                    <ImageIcon size={15} />
                    <Smile size={15} />
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <p className={styles.caption}>
        {tr(
          mode === "dm"
            ? "This is a preview of your automated conversation."
            : mode === "comments"
              ? "This is how your reply appears under the triggering comment."
              : "This is the post people comment on to trigger your automation.",
        )}
      </p>
    </section>
  );
}
