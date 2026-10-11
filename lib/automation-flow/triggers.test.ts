import { describe,it,expect } from "vitest";
import { matchFlowTrigger,readFlowDraft,readFlowTriggers,isSharedPostAttachment,type FlowTrigger } from "./triggers";
const triggers:FlowTrigger[]=[{id:"comment",source:"COMMENT",storyTrigger:"REPLY",keyword:"BOOK",anyMessage:false,postScope:"all"},{id:"dm",source:"DM",storyTrigger:"REPLY",keyword:"SHOP",anyMessage:false},{id:"story",source:"STORY",storyTrigger:"MENTION",keyword:"",anyMessage:true}];
describe("flow trigger isolation",()=>{
 it("never leaks comment keywords into direct messages",()=>{expect(matchFlowTrigger(triggers,{source:"DM",text:"BOOK"})).toBeNull();expect(matchFlowTrigger(triggers,{source:"COMMENT",text:"SHOP",mediaId:"1"})).toBeNull();expect(matchFlowTrigger(triggers,{source:"DM",text:"SHOP"})?.id).toBe("dm");});
 it("matches the configured story interaction only",()=>{expect(matchFlowTrigger(triggers,{source:"STORY",text:"",storyTrigger:"REPLY"})).toBeNull();expect(matchFlowTrigger(triggers,{source:"STORY",text:"",storyTrigger:"MENTION"})?.id).toBe("story");});
 it("keeps shared-post triggers separate from ordinary DM and media uploads",()=>{
  const share:FlowTrigger={...triggers[1],id:"share",sharedPost:true,anyMessage:true};
  expect(matchFlowTrigger([share],{source:"DM",text:"Hi"})).toBeNull();expect(matchFlowTrigger([share],{source:"DM",text:"",sharedPost:true})?.id).toBe("share");
  expect(isSharedPostAttachment([{type:"image"},{type:"video"}])).toBe(false);expect(isSharedPostAttachment([{type:"share"}])).toBe(true);
 });
 it("does not treat an unbound next-post trigger as any post",()=>{const trigger={...triggers[0],postScope:"next" as const};expect(matchFlowTrigger([trigger],{source:"COMMENT",text:"BOOK",mediaId:"old"})).toBeNull();expect(matchFlowTrigger([{...trigger,boundPostId:"new"}],{source:"COMMENT",text:"BOOK",mediaId:"old"})).toBeNull();expect(matchFlowTrigger([{...trigger,boundPostId:"new"}],{source:"COMMENT",text:"BOOK",mediaId:"new"})?.id).toBe("comment");});
 it("rejects malformed explicit trigger metadata without legacy fallback",()=>{expect(readFlowTriggers([{source:"BAD"}])).toEqual([]);expect(readFlowTriggers(null)).toBeNull();});
 it("allows empty drafts, rejects duplicate node identities and oversized payloads",()=>{expect(readFlowDraft({version:1,entry:"",oncePerContact:false,nodes:[]})).toBeTruthy();const node={id:"x",kind:"message",label:"",x:0,y:0};expect(readFlowDraft({version:1,entry:"x",oncePerContact:false,nodes:[node,node]})).toBeNull();expect(readFlowDraft({version:1,entry:"x",oncePerContact:false,nodes:[{...node,text:"a".repeat(160000)}]})).toBeNull();});
});
