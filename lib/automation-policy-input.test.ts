import { describe, expect, it } from "vitest";
import { mapCommentPolicy, applyCommentPolicy, mapSavedAutomationPolicy, mapFlowPolicy, applyFlowPolicy } from "./automation-policy-input";
import type { WizardData } from "@/hooks/use-wizard";
import type { PolicyFinding } from "./automation-policy";
import type { Flow } from "./automation-flow/definition";
const integration="00000000-0000-4000-8000-000000000001";
const data={triggerMode:"SPECIFIC_KEYWORD",keywords:["LINK"],matchingMode:"CONTAINS",sendPrivateDm:true,dmMessage:"Open the guide",messageFormat:"LINK",linkButtons:[{label:"Guide",url:"https://example.com"}],publicReplyEnabled:true,aiReplyEnabled:false,commentReplies:["Check your DMs","Here you go"],publicReply:"Check your DMs",publicReply2:"Here you go",publicReply3:"",openingDmEnabled:true,openingDmText:"Want the guide?",aiReplyInstructions:"",emailCaptureEnabled:true,emailCapturePrompt:"Email?"} as WizardData;
function finding(sectionId:string,quote:string,replacement:string,textIndex=0):PolicyFinding {return {sectionId,quote,replacement,textIndex,title:"Suggestion",reason:"Improve clarity"};}
describe("policy review draft mapping",()=>{
 it("scans onlyenabled output includingreplyvariations,opener,DM,CTA andcapture",()=>{
  const result=mapCommentPolicy(data,integration);
  expect(result.sections.map(s=>s.id)).toEqual(["trigger","reply","opening","message","links","emailCapturePrompt"]);
  expect(result.sections.find(s=>s.id==="links")?.texts).toEqual(["Guide: https://example.com"]);
  expect(mapCommentPolicy({...data,sendPrivateDm:false,publicReplyEnabled:false},integration).sections.map(s=>s.id)).toEqual(["trigger"]);
 });
 it("scans AI instructions instead ofinactive saved replies",()=>{
  const result=mapCommentPolicy({...data,aiReplyEnabled:true,aiReplyInstructions:"Reply briefly"},integration);
  expect(result.sections.find(s=>s.id==="aiReplyInstructions")?.texts).toEqual(["Reply briefly"]);
  expect(result.sections.some(s=>s.id==="reply")).toBe(false);
 });
 it("applies exact reviewedfields while ignoringstale andstructuralchanges",()=>{
  const result=applyCommentPolicy(data,[finding("reply","Here you go","Tap your inbox",1),finding("opening","outdated text","No"),finding("links","Guide: https://example.com","Changed")]);
  expect(result.commentReplies).toEqual(["Check your DMs","Tap your inbox"]);
  expect(result.publicReply2).toBe("Tap your inbox");
  expect(result.openingDmText).toBe(data.openingDmText);
  expect(result.linkButtons).toEqual(data.linkButtons);
 });
 it("maps saved comment configuration usingactual delivery settings",()=>{
  const result=mapSavedAutomationPolicy({integrationId:integration,source:"COMMENT",sendPrivateDm:true,triggerMode:"ANY_COMMENT",keywords:[],listener:{prompt:"Hello",responseFormat:"TEXT",commentReplies:["Welcome"],openingDmEnabled:false}});
  expect(result.sections.find(s=>s.id==="message")?.texts).toEqual(["Hello"]);
  expect(result.sections.find(s=>s.id==="reply")?.texts).toEqual(["Welcome"]);
 });
 it("keeps graphstructure andURLs when fixingflowcopy",()=>{
  const flow:Flow={version:1,entry:"message",oncePerContact:true,nodes:[{id:"message",kind:"message",label:"Direct Message",x:0,y:0,text:"Get your guide",links:[{label:"Guide",url:"https://example.com"}],next:null}]};
  const doc={flow,triggers:[],opening:"",openingEnabled:false,publicReply:""};
  expect(mapFlowPolicy(doc,integration).sections.find(s=>s.id==="node:message:text")?.texts).toEqual(["Get your guide"]);
  const fixed=applyFlowPolicy(doc,[finding("node:message:text","Get your guide","Your guide is here")]);
  expect(fixed.flow.nodes[0]).toEqual({...flow.nodes[0],text:"Your guide is here"});
 });
});
