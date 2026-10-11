"use client";
import Image from "next/image";
import { Grid2X2, MessageCircle, Send, Smartphone, Heart, X, ImageIcon, VolumeX } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useUi } from "@/components/i18n/use-ui";
import type { StoryEditorDraft } from "@/lib/story-editor-draft";
import type { InstagramStory } from "@/lib/story-automation";
import { attachmentId, normalizeAttachmentType } from "@/lib/message-attachment";
import EditorPreview from "./editor-preview";
import s from "./story-editor.module.css";

export type StoryPreviewMode = "story"|"reply"|"dm";
export default function StoryPhonePreview({draft,story,username,avatar,mode,onModeChange,messagePreview}:{draft:StoryEditorDraft;story?:InstagramStory;username?:string|null;avatar?:string|null;mode:StoryPreviewMode;onModeChange:(mode:StoryPreviewMode)=>void;messagePreview?:string|null}) {
  const tr=useUi();const reduced=useReducedMotion();const handle=(username||"youraccount").replace(/^@/,"");
  const tab=(value:StoryPreviewMode)=> <button type="button" key={value} aria-label={tr(value === "story" ? "Story preview":value === "reply" ? "Story reply preview":"DM preview")} aria-pressed={mode===value} onClick={()=>onModeChange(value)}>{value === "story" ? <Grid2X2 size={15}/>:value === "reply" ? <MessageCircle size={15}/>:<Send size={15}/>}</button>;
  const reply=draft.triggerMode === "ANY_MESSAGE" ? "🔥" : draft.triggerMode === "INTENT_MATCH" ? tr("I’d love to learn more!") : draft.keywords[0] || tr("your keyword");
  const mention=draft.storyConfig.scope === "MENTION";
  if(mode === "dm") return <EditorPreview source="STORY" mode="dm" onModeChange={()=>onModeChange("dm")} username={username} avatar={avatar} phoneFrame toolbar={<>{tab("story")}{tab("reply")}</>} incomingMessage={mention ? undefined:reply} interaction={mention ? "Mentioned you in a story":"Replied to your story"} carouselCards={["PRODUCT_CARD","CAROUSEL"].includes(draft.responseFormat) ? draft.storyConfig.cards:undefined} quickReplyLabels={draft.quickReplies} aiDmReply={draft.aiReplyEnabled} data={{...draft,triggerMode:draft.triggerMode === "SPECIFIC_KEYWORD" ? "SPECIFIC_KEYWORD":"ANY_COMMENT",dmMessage:messagePreview ?? draft.message,messageFormat:draft.responseFormat === "ATTACHMENT" ? "ATTACHMENT":draft.responseFormat === "LINK" ? "LINK":"TEXT",attachment:attachmentId(draft.mediaUrl)?{id:attachmentId(draft.mediaUrl)!,url:draft.mediaUrl,name:"Attachment",mediaType:normalizeAttachmentType(draft.mediaType)}:undefined,linkButtons:draft.responseFormat === "LINK" ? draft.linkButtons:[],sendPrivateDm:true}}/>;
  const poster=story?.thumbnailUrl || story?.mediaUrl;
  return <section className={s.preview} aria-label={tr("Instagram live preview")}>
    <header className={s.previewHeading}><span><Smartphone size={15}/>{tr("Live preview")}</span><div>{tab("story")}{tab("reply")}{tab("dm")}</div></header>
    <div className={s.phone}>
      <div className={s.statusBar}><span>9:41</span><span>▮▮▮  ▰</span></div>
      <div className={s.storyScreen}>
        {poster && story?.mediaType !== "VIDEO" && <Image src={poster} alt="" fill sizes="280px" className={s.blurredStory} unoptimized/>}
        {story?.mediaType === "VIDEO" && story.mediaUrl ? <video key={story.id} className={s.storyMedia} src={story.mediaUrl} poster={story.thumbnailUrl || undefined} playsInline muted autoPlay={!reduced} loop preload="metadata" aria-label={tr("Selected Instagram story")}/> : poster ? <Image src={poster} alt={tr("Selected Instagram story")} fill sizes="280px" className={s.storyMedia} unoptimized/>:<div className={s.emptyPhone}><ImageIcon size={34}/><strong>{tr(mention?"Story mention":draft.storyConfig.scope === "NEXT" ? "Your next story":draft.storyConfig.scope === "ALL" ? "All your stories":"Choose an active story")}</strong><p>{tr(mention?"Someone mentions you in their story.":draft.storyConfig.scope === "NEXT" ? "Your next published story will appear here.":"Your selected story will appear here.")}</p></div>}
        <div className={s.storyTop}><div className={s.storyProgress}><span/></div><div className={s.storyProfile}><span className={s.avatar}>{avatar?<Image src={avatar} alt="" fill sizes="24px" unoptimized/>:handle.charAt(0).toUpperCase()}</span><strong>{handle}</strong><span>1h</span>{story?.mediaType === "VIDEO" && <VolumeX size={14}/>}<X size={17}/></div></div>
        {mode === "reply" && <div className={s.replyOverlay}><p>{tr("Reply to story")}</p><div dir="auto">{mention?`@${handle}`:reply}</div><small>{tr("This reply starts your automation when it matches the trigger.")}</small></div>}
      </div>
      <div className={s.storyComposer}><MessageCircle size={15}/><span>{tr("Send message…")}</span><Heart size={17}/><Send size={16}/></div><div className={s.homeIndicator}/>
    </div>
    <p className={s.previewCaption}>{tr(mode === "reply" ? "This is the story reply that triggers your automation.":"This is the story people reply to to trigger your automation.")}</p>
  </section>;
}
