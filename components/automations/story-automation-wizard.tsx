"use client";
import { editorStepDelays, type AutomationStep } from "@/lib/automation-step-delays";
import OpenerMessage from "./opener-message";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AtSign, ArrowRightCircle, Check, ChevronDown, Clock3, Grid2X2, ImageIcon, Loader2, Mail, Plus, RefreshCw, Sparkles, Target, Text, Video, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUi } from "@/components/i18n/use-ui";
import { getActiveInstagramStories } from "@/actions/automation/stories";
import { saveMessageAutomation } from "@/actions/automation";
import { refreshSavedAutomation } from "@/lib/automation-query-cache";
import { createStoryEditorDraft, storyEditorPayload, type StoryEditorDraft } from "@/lib/story-editor-draft";
import { storyIsLive, type InstagramStory, type StoryScope } from "@/lib/story-automation";
import { normalizeMessageAutomationPayload, validateMessageAutomationPayload, type MessageResponseFormat } from "@/lib/message-automation";
import { attachmentId, normalizeAttachmentType } from "@/lib/message-attachment";
import { mapMessagePolicy, applyMessagePolicy } from "@/lib/automation-policy-input";
import type { PolicyScanInput } from "@/lib/automation-policy";
import EditorLayout, { EditorGroup, EditorRow, EditorSwitch, editorStyles as s } from "./editor-layout";
import { EditorSelect } from "./editor-select";
import StoryPhonePreview, { type StoryPreviewMode } from "./story-phone-preview";
import { MessageCopyComposer } from "./copy-composer";
import MessageResponseEditor from "./message-response-editor";
import ProductCardEditor from "./product-card-editor";
import AttachmentPicker from "./attachment-picker";
import DelayControl from "./delay-control";
import { QuickEngagementRows, QuickEngagementButtons } from "./quick-engagement";
import UpgradeDialog, { ProBadge } from "./upgrade-dialog";
import PolicyScanDialog from "./policy-scan-dialog";
import css from "./story-editor.module.css";

const scopes = [
  { value:"MENTION", label:"apply for story mention", icon:AtSign },
  { value:"ALL", label:"apply for all stories", icon:Grid2X2 },
  { value:"NEXT", label:"apply for next story", icon:ArrowRightCircle },
  { value:"SPECIFIC", label:"a specific story", icon:ImageIcon },
] as const;
const formats = [
  { value:"TEXT",label:"plain text" },{value:"LINK",label:"text with button"},
  {value:"PRODUCT_CARD",label:"image with button"},{value:"CAROUSEL",label:"carousel"},
  {value:"ATTACHMENT",label:"attachment"},{value:"AI",label:"AI reply"},
];

type Props = { integrationId?:string;slug:string;automationId?:string;automation?:any;templateId?:string;username?:string|null;avatar?:string|null;paid?:boolean;followUpsReady?:boolean };
export default function StoryAutomationWizard({integrationId="",slug,automationId,automation,templateId,username,avatar,paid=false,followUpsReady=false}:Props) {
  const tr=useUi(); const router=useRouter(); const queryClient=useQueryClient();
  const [draft,setDraft]=useState<StoryEditorDraft>(()=>createStoryEditorDraft(automation,templateId));
  // Data may arrive after the component mounts. Hydrate once; background query
  // invalidations must never overwrite an owner's in-progress edits.
  const hydrated=useRef(Boolean(automation));
  useEffect(()=>{if(automation && !hydrated.current){hydrated.current=true;setDraft(createStoryEditorDraft(automation,templateId));}},[automation,templateId]);
  const [stories,setStories]=useState<InstagramStory[]>([]);
  const [loading,setLoading]=useState(false);const [loaded,setLoaded]=useState(false);
  const [storyError,setStoryError]=useState<string|null>(null);const [reconnect,setReconnect]=useState(false);
  const request=useRef(0); const [now,setNow]=useState(()=>Date.now());
  const [openStory,setOpenStory]=useState(true); const [openTrigger,setOpenTrigger]=useState(false);
  const [openMessage,setOpenMessage]=useState<string|null>(null);const [openOpener,setOpenOpener]=useState(true);
  const [keyword,setKeyword]=useState("");const [quickReply,setQuickReply]=useState("");const [showQuickReply,setShowQuickReply]=useState(false);
  const [mode,setMode]=useState<StoryPreviewMode>("story");const [previewId,setPreviewId]=useState<string|null>(null);
  const [messagePreview,setMessagePreview]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);const submitting=useRef(false);const [error,setError]=useState<string|null>(null);
  const [upgrade,setUpgrade]=useState(false);const [scanInput,setScanInput]=useState<PolicyScanInput|null>(null);
  const update=(next:Partial<StoryEditorDraft>)=>{setDraft(old=>({...old,...next}));setError(null);};
  const refresh=useCallback(async()=>{
    const version=++request.current;setLoading(true);setStoryError(null);setReconnect(false);
    try {
      const result=await getActiveInstagramStories(integrationId);
      if(version!==request.current)return;
      if(!result.ok){setStoryError(result.error);setReconnect(Boolean(result.reconnectRequired));return;}
      setStories(result.stories);setLoaded(true);setNow(Date.now());
    }catch{if(version===request.current)setStoryError("Could not load your stories. Please try again.");}
    finally{if(version===request.current)setLoading(false);}
  },[integrationId]);
  useEffect(()=>{void refresh();return()=>{request.current++;};},[refresh]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const live=stories.filter(story=>storyIsLive(story,now));
  const [delayEnabled,setDelayEnabled]=useState(()=>Object.values(editorStepDelays(draft)).some(n=>n>0));
  const delays=editorStepDelays(draft);
  const hasSavedDelay=Object.values(editorStepDelays(draft)).some(n=>n>0);
  useEffect(()=>{if(hasSavedDelay)setDelayEnabled(true);},[hasSavedDelay]);
  const changeDelay=(step:AutomationStep,seconds:number)=>update({stepDelays:{...delays,[step]:seconds},deliveryDelaySeconds:0});
  const delayBefore=(step:AutomationStep,label:string)=>delayEnabled?<DelayControl label={label} seconds={delays[step]||0} onChange={seconds=>changeDelay(step,seconds)}/>:null;
  const config=draft.storyConfig;const scope=scopes.find(item=>item.value===config.scope)!;
  const selected=config.stories;
  const previewStory=live.find(story=>story.id===(previewId||selected[0]?.id)) || selected.find(story=>story.id===previewId) || selected[0] || (config.scope==="ALL" ? live[0]:undefined);
  const missing=selected.filter(story=>!storyIsLive(story,now) || (loaded && !storyError && !live.some(item=>item.id===story.id)));
  function setScope(value:StoryScope){
    if(value==="NEXT"&&!paid){setUpgrade(true);return;}
    update({storyConfig:{...config,scope:value,stories:value==="SPECIFIC" ? selected:[],armedAt:undefined,baselineIds:undefined,boundStoryId:undefined,observedThrough:undefined},...(value==="MENTION" ? {triggerMode:"ANY_MESSAGE" as const}: {})});
    setMode("story");setOpenStory(true);setPreviewId(null);
  }
  function toggleStory(story:InstagramStory){
    const exists=selected.some(item=>item.id===story.id);
    update({storyConfig:{...config,stories:exists?selected.filter(item=>item.id!==story.id):[...selected,story]}});
    setPreviewId(story.id);setMode("story");
  }
  function commitKeywords(text=keyword){
    const incoming=text.split(/[,\n]/).map(word=>word.trim().toLowerCase().slice(0,100)).filter(Boolean);
    const keywords=Array.from(new Set([...draft.keywords,...incoming])).slice(0,20);
    update({keywords});setKeyword("");return keywords;
  }
  function chooseFormat(value:string){
    const isAI=value==="AI";
    const cards=config.cards.length ? config.cards:[{title:"",subtitle:"",image:"",links:[{label:"Get the Link",url:""}]}];
    update({aiReplyEnabled:isAI,responseFormat:isAI?"TEXT":value as MessageResponseFormat,
      ...(value==="PRODUCT_CARD"||value==="CAROUSEL"?{storyConfig:{...config,cards:value==="PRODUCT_CARD"?cards.slice(0,1):cards}}:{}),
      ...(isAI?{openingDmEnabled:false,emailCaptureEnabled:false,phoneCaptureEnabled:false,followGateRequired:false,followUpEnabled:false}: {})});
    setMode("dm");setOpenMessage("message");setMessagePreview(null);
  }
  function policyDraft(){return {...draft,messageFormat:draft.responseFormat,storyTriggerType:config.scope==="MENTION"?"MENTION":"REPLY"};}
  async function save(active:boolean,skipScan=false){
    if(submitting.current)return;
    const next=keyword.trim()?{...draft,keywords:commitKeywords()}:draft;
    const payload=storyEditorPayload(next,active);
    const invalid=validateMessageAutomationPayload(normalizeMessageAutomationPayload(payload));
    if(invalid){setError(invalid);return;}
    if(active && (draft.aiReplyEnabled||config.scope==="NEXT"||draft.triggerMode==="INTENT_MATCH")&&!paid){setUpgrade(true);return;}
    if(active&&!skipScan){setScanInput(mapMessagePolicy({...next,messageFormat:next.responseFormat,storyTriggerType:config.scope==="MENTION"?"MENTION":"REPLY"},integrationId,"STORY"));return;}
    submitting.current=true;setSaving(true);setError(null);
    try{
      const result=await saveMessageAutomation(payload,automationId,integrationId);
      if(result.status===200 && typeof result.data==="object" && result.data?.id){
        await refreshSavedAutomation(queryClient,result.data.id);
        router.push(`/dashboard/${slug}/automation${active?`?published=${encodeURIComponent(result.data.id)}`:""}`);router.refresh();
      }else setError(typeof result.data==="string"?result.data:"Could not save automation.");
    }catch{setError("Could not save automation. Your changes are still here. Please try again.");}
    finally{submitting.current=false;setSaving(false);}
  }
  const storySummary=config.scope==="SPECIFIC"?`${selected.length} ${tr(selected.length===1?"story selected":"stories selected")}`:config.scope==="NEXT"&&config.boundStoryId?tr("Next story selected"):undefined;
  const attachment=draft.responseFormat==="ATTACHMENT"&&attachmentId(draft.mediaUrl)?{id:attachmentId(draft.mediaUrl)!,url:draft.mediaUrl,name:"Attachment",mediaType:normalizeAttachmentType(draft.mediaType)}:undefined;
  const cardMode=draft.responseFormat==="PRODUCT_CARD"||draft.responseFormat==="CAROUSEL";
  return <>
    <EditorLayout slug={slug} name={draft.name} onNameChange={name=>update({name})} active={Boolean(automation?.active)} saving={saving} onSave={active=>void save(active)} error={error} accountName={username || undefined} className={css.storyEditor} showSaveDraft preview={<StoryPhonePreview draft={draft} story={previewStory} username={username} avatar={avatar} mode={mode} onModeChange={setMode} messagePreview={messagePreview}/> }>
      <EditorGroup title="Setup Triggers" action={<div className={css.delay}><Clock3 size={14}/><span>{tr("Enable delay")}</span><EditorSwitch label="Enable delay" checked={delayEnabled} onChange={enabled=>{setDelayEnabled(enabled);update({stepDelays:enabled?delays:{},deliveryDelaySeconds:0});}}/></div>}>

        <EditorRow title="Story" summary={storySummary} icon={<Grid2X2/>} open={openStory} onOpen={()=>{setOpenStory(!openStory);setMode("story");}} controls={<DropdownMenu><DropdownMenuTrigger asChild><button type="button" className={css.scopeButton} aria-label={tr("Story scope")}><scope.icon size={14}/><span>{tr(scope.label)}</span><ChevronDown size={13}/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className={css.scopeMenu}>{scopes.map(item=><DropdownMenuItem key={item.value} className={css.scopeItem} onSelect={()=>setScope(item.value)}><item.icon size={16}/><span>{tr(item.label)}</span>{item.value==="NEXT"&&<ProBadge/>}{config.scope===item.value&&<Check size={15}/>}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}>
          {config.scope==="SPECIFIC"?<>
            {loading&&!loaded?<div className={css.empty} role="status"><Loader2 className="animate-spin"/><strong>{tr("Loading your active stories…")}</strong></div>:live.length?<div className={css.storyGrid}>{live.map((story,index)=>{const checked=selected.some(item=>item.id===story.id);return <button type="button" key={story.id} className={`${css.storyTile} ${checked?css.selected:""}`} aria-label={`${tr("Select story")} ${index+1}`} aria-pressed={checked} onClick={()=>toggleStory(story)}>{story.thumbnailUrl||story.mediaType==="IMAGE"&&story.mediaUrl?<Image src={story.thumbnailUrl||story.mediaUrl} alt={tr("Active Instagram story")} width={144} height={208} unoptimized/>:story.mediaUrl?<video src={story.mediaUrl} muted playsInline preload="metadata"/>:<ImageIcon/>}{checked&&<span className={css.selectionCheck}><Check size={16}/></span>}{story.mediaType==="VIDEO"&&<span className={css.videoBadge}><Video size={13}/></span>}</button>;})}</div>:!storyError&&<div className={css.empty}><ImageIcon size={30}/><strong>{tr("No active stories found")}</strong><span>{tr("Publish an Instagram story on this account, then refresh. Stories are available for 24 hours.")}</span></div>}
            {!!missing.length&&<div className={css.stale} role="status">{tr("Some selected stories are no longer active. Refresh and select a live story before publishing.")}<button type="button" className={css.refresh} onClick={()=>update({storyConfig:{...config,stories:selected.filter(story=>!missing.some(item=>item.id===story.id))}})}>{tr("Remove unavailable stories")}</button></div>}
          </>:<div className={css.scopeInfo}><scope.icon/><div><strong>{tr(config.scope==="MENTION"?"When someone mentions you in their story":config.scope==="ALL"?"Replies to any of your stories":config.boundStoryId?"Connected to your next story":"Your next published story")}</strong><span>{tr(config.scope==="MENTION"?"Send a DM when another account tags you in a story. There is no keyword requirement.":config.scope==="ALL"?"This automation applies to your current and future stories, using the trigger below.":config.boundStoryId?"This automation stays connected to that one story. It does not move to later stories.":"Publish this automation first. It will attach to the first story you publish next, not to the first story someone replies to.")}</span></div></div>}
          {storyError&&config.scope!=="MENTION"&&<div className={css.stale} role="alert">{tr(storyError)}{reconnect&&<a className={css.refresh} href={`/dashboard/${slug}/settings`}>{tr("Review Instagram connection")}</a>}</div>}
          {config.scope!=="MENTION"&&<div className={css.storyFooter}><span className={s.hint}>{tr("Only stories on your connected Instagram account appear here.")}</span><button type="button" className={css.refresh} disabled={loading} onClick={()=>void refresh()}><RefreshCw size={13} className={loading?"animate-spin":""}/>{tr("Refresh stories")}</button></div>}
        </EditorRow>
        {config.scope!=="MENTION"&&<EditorRow title="Trigger" summary={draft.triggerMode==="SPECIFIC_KEYWORD"?`${draft.keywords.length} ${tr("keywords")}`:tr(draft.triggerMode==="INTENT_MATCH"?"Intent match":"Any word")} icon={<Target/>} open={openTrigger} onOpen={()=>{setOpenTrigger(!openTrigger);setMode("reply");}} controls={<EditorSelect label="Story trigger" value={draft.triggerMode} options={[{value:"SPECIFIC_KEYWORD",label:"a specific word (s)"},{value:"ANY_MESSAGE",label:"any word"},{value:"INTENT_MATCH",label:"intent match",icon:<Sparkles size={13}/> }]} onChange={value=>{if(value==="INTENT_MATCH"&&!paid){setUpgrade(true);return;}update({triggerMode:value as StoryEditorDraft["triggerMode"]});setOpenTrigger(true);setMode("reply");}}/>}>
          {draft.triggerMode==="SPECIFIC_KEYWORD"?<><label className={s.field}>{tr("Keywords")}<div className={css.keywordEntry}>{draft.keywords.map(word=><span key={word} className={css.keyword}><bdi>{word}</bdi><button type="button" aria-label={`${tr("Remove keyword")} ${word}`} onClick={()=>update({keywords:draft.keywords.filter(item=>item!==word)})}><X size={13}/></button></span>)}<input aria-label={tr("Add story keyword")} value={keyword} maxLength={500} placeholder={tr("Type a word and press Enter")} onChange={e=>setKeyword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();commitKeywords();}}}/><button type="button" aria-label={tr("Add keyword")} onClick={()=>commitKeywords()} disabled={!keyword.trim()||draft.keywords.length>=20}><Plus size={17}/></button></div></label><p className={s.hint}>{tr("Matches when a story reply contains any of these words. Up to 20 keywords.")}</p></>:draft.triggerMode==="INTENT_MATCH"?<label className={s.field}>{tr("Describe the intent")}<textarea rows={3} maxLength={600} value={config.intentPrompt} placeholder={tr("For example: asks for the price or wants to order")} onChange={e=>update({storyConfig:{...config,intentPrompt:e.target.value}})}/><span className={s.hint}>{tr("AI checks the meaning of the reply. Uncertain matches do not trigger a DM.")}</span></label>:<p className={s.hint}>{tr("Runs when someone sends any text reply or emoji reaction to this story.")}</p>}
          <div className={css.setting}><div><strong>{tr("One DM per user")}</strong><p>{tr("Even if they reply several times, they receive this automation only once.")}</p></div><EditorSwitch label="One DM per user" checked={draft.oneDmPerUser} onChange={oneDmPerUser=>update({oneDmPerUser})}/></div>
        </EditorRow>}
      </EditorGroup>
      <EditorGroup title="Setup Direct Message">
        {draft.openingDmEnabled&&!draft.aiReplyEnabled&&delayBefore("OPENING","Opener message")}
        {draft.openingDmEnabled&&!draft.aiReplyEnabled&&<OpenerMessage data={draft} update={update} open={openOpener} onOpen={()=>{setOpenOpener(!openOpener);setMode("dm");}} onRemove={()=>update({openingDmEnabled:false})}/>}
        {!draft.aiReplyEnabled&&<QuickEngagementRows delayEnabled={delayEnabled} stepDelays={delays} onDelayChange={changeDelay} part="before" data={draft} update={update} open={openMessage} setOpen={setOpenMessage}/>}
        {delayBefore("MESSAGE","Message")}
        <EditorRow title="Message" icon={<Text/>} open={openMessage==="message"} onOpen={()=>{setOpenMessage(openMessage==="message"?null:"message");setMode("dm");}} controls={<EditorSelect label="Message format" value={draft.aiReplyEnabled?"AI":draft.responseFormat} options={draft.responseFormat==="MEDIA"?[...formats,{value:"MEDIA",label:"image or video"}]:formats} onChange={chooseFormat}/> }>
          {draft.aiReplyEnabled?<><label className={s.field}>{tr("AI reply instructions")}<textarea rows={5} maxLength={900} value={draft.message} onChange={e=>update({message:e.target.value})}/></label>{!paid&&<p className={s.hint}>{tr("You can prepare your instructions now. Publishing AI replies requires Pro or Business.")}</p>}</>:draft.responseFormat==="ATTACHMENT"?<AttachmentPicker value={attachment} onChange={value=>update({mediaUrl:value?.url||"",mediaType:value?.mediaType||"FILE"})}/>:cardMode?<>
            {config.cards.map((card,index)=><section className={css.cardEditor} key={index}><div className={css.cardHeading}><strong>{tr("Card")} {index+1}</strong>{config.cards.length>1&&<button type="button" aria-label={`${tr("Remove card")} ${index+1}`} onClick={()=>update({storyConfig:{...config,cards:config.cards.filter((_,i)=>i!==index)}})}><X size={15}/></button>}</div><ProductCardEditor title={card.title} subtitle={card.subtitle} imageUrl={card.image} linkButtons={card.links} onChange={next=>update({storyConfig:{...config,cards:config.cards.map((old,i)=>i===index?{...old,...(next.title!==undefined?{title:next.title}:{}),...(next.subtitle!==undefined?{subtitle:next.subtitle}:{}),...(next.imageUrl!==undefined?{image:next.imageUrl}:{}),...(next.linkButtons?{links:next.linkButtons}: {})}:old)}})}/></section>)}
            {draft.responseFormat==="CAROUSEL"&&config.cards.length<10&&<button type="button" className={css.smallAdd} onClick={()=>update({storyConfig:{...config,cards:[...config.cards,{title:"",subtitle:"",image:"",links:[{label:"Get the Link",url:""}]}]}})}><Plus size={13}/>{tr("Add card")}</button>}
          </>:<MessageCopyComposer message={draft.message} onMessageChange={message=>{update({message});setMessagePreview(null);setMode("dm");}} variations={draft.messageVariations} onVariationsChange={messageVariations=>update({messageVariations})} maxLength={900} context={{integrationId,available:paid,sendDm:true,hasButtons:draft.responseFormat==="LINK"}} linkButtons={draft.responseFormat==="LINK"?draft.linkButtons:[]} onPreview={message=>{setMessagePreview(message);setMode("dm");}}>{draft.responseFormat==="LINK"&&<MessageResponseEditor hideMessage message={draft.message} linkButtons={draft.linkButtons} onChange={value=>value.linkButtons&&update({linkButtons:value.linkButtons})}/>}</MessageCopyComposer>}
          {draft.responseFormat==="MEDIA"&&<label className={s.field}>{tr("Image or video URL")}<input type="url" value={draft.mediaUrl} onChange={e=>update({mediaUrl:e.target.value})}/><select aria-label={tr("Media type")} value={draft.mediaType} onChange={e=>update({mediaType:e.target.value})}><option value="IMAGE">{tr("Image")}</option><option value="VIDEO">{tr("Video")}</option></select></label>}
        </EditorRow>
        {!draft.aiReplyEnabled&&draft.responseFormat!=="ATTACHMENT"&&<div className={css.quickReplies}>{draft.quickReplies.map(label=><span className={css.keyword} key={label}>{label}<button type="button" aria-label={`${tr("Remove quick reply")} ${label}`} onClick={()=>update({quickReplies:draft.quickReplies.filter(item=>item!==label)})}><X size={12}/></button></span>)}{draft.quickReplies.length<4&&(showQuickReply?<form className={css.quickReplyForm} onSubmit={e=>{e.preventDefault();const label=quickReply.trim();if(label&&!draft.quickReplies.includes(label)){update({quickReplies:[...draft.quickReplies,label]});setMode("dm");}setQuickReply("");setShowQuickReply(false);}}><input autoFocus aria-label={tr("Quick reply label")} maxLength={20} value={quickReply} onChange={e=>setQuickReply(e.target.value)} placeholder={tr("Quick reply")}/><button type="submit" aria-label={tr("Add quick reply")} disabled={!quickReply.trim()}><Check size={14}/></button><button type="button" aria-label={tr("Cancel quick reply")} onClick={()=>setShowQuickReply(false)}><X size={14}/></button></form>:<button type="button" className={css.smallAdd} onClick={()=>setShowQuickReply(true)}><Plus size={12}/>{tr("Quick reply")}</button>)}</div>}
        {!draft.aiReplyEnabled&&<><QuickEngagementRows part="after" data={draft} update={update} open={openMessage} setOpen={setOpenMessage}/><QuickEngagementButtons data={draft} update={update} paid={paid} followUpsReady={followUpsReady} open={openMessage} setOpen={setOpenMessage} leading={!draft.openingDmEnabled?<button type="button" onClick={()=>{update({openingDmEnabled:true});setOpenOpener(true);setMode("dm");}}><Mail/>{tr("Opener message")}</button>:undefined}/></>}
      </EditorGroup>
    </EditorLayout>
    <UpgradeDialog open={upgrade} onOpenChange={setUpgrade}/>
    {scanInput&&<PolicyScanDialog open input={scanInput} slug={slug} onOpenChange={open=>{if(!open)setScanInput(null);}} onPublish={()=>void save(true,true)} onApply={findings=>{const fixed=applyMessagePolicy(policyDraft(),findings);update({...fixed,message:fixed.message.slice(0,900),messageVariations:fixed.messageVariations.map(value=>value.slice(0,900))});setScanInput(null);}}/>}
  </>;
}
