import type { WizardData } from "@/hooks/use-wizard";
import type { PolicyFinding, PolicyScanInput, PolicySection } from "./automation-policy";
import { readLinkButtons } from "./link-buttons";
import { readFlow, type Flow } from "./automation-flow/definition";
import { readFlowTriggers, type FlowTrigger } from "./automation-flow/triggers";

const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && Boolean(v.trim())) : [];
function add(sections: PolicySection[], id: string, label: string, texts: string[], detail?: string) {
  if (texts.length) sections.push({ id, label, texts, ...(detail ? { detail } : {}) });
}
type Engagement = { emailCaptureEnabled?: boolean; emailCapturePrompt?: string; emailCaptureRetryMessage?: string; phoneCaptureEnabled?: boolean; phoneCapturePrompt?: string; phoneCaptureRetryMessage?: string; followUpEnabled?: boolean; followUpMessage?: string; followGateRequired?: boolean; followRequestDmText?: string };
function engagement(sections: PolicySection[], data: Engagement) {
  for (const [enabled, field, title] of [["emailCaptureEnabled","emailCapturePrompt","Collect email"],["phoneCaptureEnabled","phoneCapturePrompt","Collect phone"],["followUpEnabled","followUpMessage","Follow-up Message"],["followGateRequired","followRequestDmText","Ask to follow"]] as const) {
    if (data[enabled]) add(sections, field, title, [data[field] || ""]);
    if (enabled === "emailCaptureEnabled" && data[enabled] && data.emailCaptureRetryMessage) add(sections,"emailCaptureRetryMessage","Email retry message",[data.emailCaptureRetryMessage]);
    if (enabled === "phoneCaptureEnabled" && data[enabled] && data.phoneCaptureRetryMessage) add(sections,"phoneCaptureRetryMessage","Phone retry message",[data.phoneCaptureRetryMessage]);
  }
}
export function mapCommentPolicy(data: WizardData, integrationId: string): PolicyScanInput {
  const sections: PolicySection[] = [{id:"trigger",label:"Trigger",detail:data.triggerMode === "ANY_COMMENT" ? "Any comment" : `${data.keywords.length} keywords`,texts:[data.triggerMode === "ANY_COMMENT" ? "Any comment on the selected post" : `Comment matches (${data.matchingMode}): ${data.keywords.join(", ")}`]}];
  if (data.aiReplyEnabled) add(sections,"aiReplyInstructions","Auto Reply",[data.aiReplyInstructions],"AI instructions");
  else if (data.publicReplyEnabled) { const replies = data.commentReplies?.length ? strings(data.commentReplies) : strings([data.publicReply,data.publicReply2,data.publicReply3]); add(sections,"reply","Auto Reply",replies,`${replies.length} variations`); }
  if (data.sendPrivateDm) {
    if (data.openingDmEnabled) add(sections,"opening","Opener Message",[data.openingDmText]);
    if (data.messageFormat !== "ATTACHMENT") add(sections,"message","Direct Message",[data.dmMessage,...strings(data.messageVariations)]);
    if (data.messageFormat === "LINK" || data.productCard) add(sections,"links","Link buttons",data.linkButtons.map(b=>`${b.label}: ${b.url}`));
    if (data.productCard && data.productSubtitle) add(sections,"productSubtitle","Product description",[data.productSubtitle]);
    engagement(sections,data);
  }
  return {integrationId,sections};
}
export type MessagePolicyDraft = Engagement & { triggerMode:string; keywords:string[]; message:string; messageVariations?:string[]; messageFormat:string; linkButtons:{label:string;url:string}[]; aiReplyEnabled:boolean; storyTriggerType?:string; openingDmEnabled?:boolean; openingDmText?:string; storyConfig?:{scope?:string;intentPrompt?:string;cards?:{title:string;subtitle:string;links:{label:string;url:string}[]}[] } };
export function mapMessagePolicy(data: MessagePolicyDraft, integrationId:string, source:string): PolicyScanInput {
  const sections: PolicySection[] = [{id:"trigger",label:"Trigger",detail:source === "STORY" ? `Story ${data.storyTriggerType?.toLowerCase() || "reply"}` : "Incoming DM",texts:[data.triggerMode === "SPECIFIC_KEYWORD" ? `Message matches: ${data.keywords.join(", ")}` : "Any eligible incoming interaction"]}];
  if (data.messageFormat !== "ATTACHMENT" || data.aiReplyEnabled) add(sections,"message",data.aiReplyEnabled ? "AI Message instructions" : "Direct Message",[data.message,...strings(data.messageVariations)]);
  if (data.messageFormat === "LINK" && !data.aiReplyEnabled) add(sections,"links","Link buttons",data.linkButtons.map(b=>`${b.label}: ${b.url}`));
  if(data.openingDmEnabled) add(sections,"opening","Opener Message",[data.openingDmText||""]);
  if(data.triggerMode === "INTENT_MATCH") add(sections,"intent","Trigger intent",[data.storyConfig?.intentPrompt||""]);
  if(["PRODUCT_CARD","CAROUSEL"].includes(data.messageFormat)) for(const [i,card] of Array.from((data.storyConfig?.cards||[]).entries())) add(sections,`card:${i}`,`Card ${i+1}`,[card.title,card.subtitle,...card.links.map(b=>`${b.label}: ${b.url}`)].filter(Boolean));
  engagement(sections,data);
  return {integrationId,sections};
}
export type FlowPolicyDocument = {flow:Flow;triggers:FlowTrigger[];opening:string;openingEnabled:boolean;publicReply:string};
export function mapFlowPolicy(doc:FlowPolicyDocument,integrationId:string): PolicyScanInput {
  const sections:PolicySection[]=[{id:"trigger",label:"Trigger",detail:`${doc.triggers.length} triggers`,texts:doc.triggers.map(t=>`${t.source}: ${t.anyMessage ? "Any interaction" : t.keyword || t.storyTrigger}`)}];
  if(doc.publicReply && doc.triggers.some(t=>t.source==="COMMENT")) add(sections,"reply","Auto Reply",[doc.publicReply]);
  if(doc.openingEnabled) add(sections,"opening","Opener Message",[doc.opening]);
  for(const node of doc.flow.nodes) {
    if("text" in node) add(sections,`node:${node.id}:text`,node.label || "Direct Message",[node.text],node.kind);
    if("subtitle" in node && node.subtitle) add(sections,`node:${node.id}:subtitle`,`${node.label} description`,[node.subtitle]);
    if("links" in node && node.links.length) add(sections,`node:${node.id}:links`,`${node.label} buttons`,node.links.map(b=>`${b.label}: ${b.url}`));
    if(node.kind==="carousel") for(const [i,card] of Array.from(node.cards.entries())) add(sections,`node:${node.id}:card:${i}`,`${node.label} card ${i+1}`,[card.title,card.subtitle,...card.links.map(b=>`${b.label}: ${b.url}`)].filter(Boolean));
    if(node.kind==="question") add(sections,`node:${node.id}:options`,`${node.label} options`,node.options.map(o=>o.label));
  }
  return {integrationId,sections};
}
/** Only exact quoted draft text may be replaced; ignore trigger/URL/structure edits. */
function replacement(findings:PolicyFinding[],sectionId:string,index:number,original:string,max=1000) {
  const f=findings.find(f=>f.sectionId===sectionId && f.textIndex===index && f.quote===original);
  return f?.replacement?.trim() && f.replacement.length<=max ? f.replacement : original;
}
export function applyCommentPolicy(data:WizardData,findings:PolicyFinding[]): Partial<WizardData> {
  const next={...data};
  const replies=data.commentReplies?.length ? strings(data.commentReplies) : [data.publicReply,data.publicReply2,data.publicReply3].filter(Boolean);
  next.commentReplies=replies.map((text,i)=>replacement(findings,"reply",i,text,220));
  [next.publicReply,next.publicReply2,next.publicReply3]=[...next.commentReplies,"","",""];
  next.dmMessage=replacement(findings,"message",0,data.dmMessage,data.productCard?80:1000);
  next.messageVariations=strings(data.messageVariations).map((text,i)=>replacement(findings,"message",i+1,text));
  next.openingDmText=replacement(findings,"opening",0,data.openingDmText,800);
  next.aiReplyInstructions=replacement(findings,"aiReplyInstructions",0,data.aiReplyInstructions,1600);
  for(const field of ["emailCapturePrompt","phoneCapturePrompt","emailCaptureRetryMessage","phoneCaptureRetryMessage","followUpMessage","followRequestDmText","productSubtitle"] as const) if(data[field]) next[field]=replacement(findings,field,0,data[field]!,field==="productSubtitle"?80:800);
  return next;
}
export function applyMessagePolicy<T extends MessagePolicyDraft>(data:T,findings:PolicyFinding[]):T {
  const next={...data,message:replacement(findings,"message",0,data.message),messageVariations:strings(data.messageVariations).map((text,i)=>replacement(findings,"message",i+1,text))};
  if(data.openingDmText) next.openingDmText=replacement(findings,"opening",0,data.openingDmText,640);
  for(const field of ["emailCapturePrompt","phoneCapturePrompt","emailCaptureRetryMessage","phoneCaptureRetryMessage","followUpMessage","followRequestDmText"] as const) if(data[field]) next[field]=replacement(findings,field,0,data[field]!,800);
  return next;
}
export function applyFlowPolicy<T extends FlowPolicyDocument>(doc:T,findings:PolicyFinding[]):T {
  return {...doc,opening:replacement(findings,"opening",0,doc.opening,800),publicReply:replacement(findings,"reply",0,doc.publicReply,220),flow:{...doc.flow,nodes:doc.flow.nodes.map(node=>{
    if(!("text" in node)) return node;
    const max=node.kind==="product"?80:["email","capture","phone","question"].includes(node.kind)?800:1000;
    return {...node,text:replacement(findings,`node:${node.id}:text`,0,node.text,max),...("subtitle" in node ? {subtitle:replacement(findings,`node:${node.id}:subtitle`,0,node.subtitle,80)} : {})};
  })}};
}
export function mapSavedAutomationPolicy(automation:any):PolicyScanInput {
  const l=automation.listener||{};
  const integrationId=automation.integrationId;
  if(!integrationId) throw new Error("Connect this automation to an Instagram account first.");
  const draft=l.flowDraft;
  const flow=readFlow(draft?.flow) || readFlow(l.flowDefinition);
  if(flow) return mapFlowPolicy({flow,triggers:readFlowTriggers(draft?.triggers || l.flowTriggers)||[],opening:draft?.opening ?? l.openingDmText ?? "",openingEnabled:draft?.openingEnabled ?? l.openingDmEnabled,publicReply:draft?.publicReply ?? l.commentReply ?? ""},integrationId);
  const common={...l,followGateRequired:automation.followGateRequired,keywords:(automation.keywords||[]).map((k:any)=>k.word),triggerMode:automation.triggerMode,message:l.prompt||"",messageFormat:l.responseFormat,linkButtons:strings([])};
  const links=readLinkButtons(l.quickReplies,l.ctaButtonTitle,l.ctaLink);
  if(automation.source!=="COMMENT") return mapMessagePolicy({...common,linkButtons:links,aiReplyEnabled:l.aiDmReplyEnabled,storyTriggerType:automation.storyTriggerType,storyConfig:automation.storyConfig},integrationId,automation.source);
  return mapCommentPolicy({...common,linkButtons:links,sendPrivateDm:automation.sendPrivateDm,matchingMode:automation.matchingMode,dmMessage:l.prompt||"",publicReplyEnabled:Boolean(l.commentReply || strings(l.commentReplies).length),publicReply:l.commentReply||"",publicReply2:l.commentReply2||"",publicReply3:l.commentReply3||"",aiReplyInstructions:l.aiReplyInstructions||"",openingDmText:l.openingDmText||"",productCard:l.responseFormat==="PRODUCT_CARD",productSubtitle:l.cardSubtitle} as WizardData,integrationId);
}
