import {beforeEach,describe,it,expect,vi} from "vitest";
const db=vi.hoisted(()=>({automation:{findMany:vi.fn()},listener:{updateMany:vi.fn()},automationEvent:{findFirst:vi.fn()}}));
vi.mock("@/lib/prisma",()=>({client:db}));
import {findAutomationForDM,findAutomationForStory,bindNextPostTriggers,isCurrentFlowOpening} from "./queries";
const triggers=[{id:"c",source:"COMMENT",storyTrigger:"REPLY",keyword:"BOOK",anyMessage:false,postScope:"all"},{id:"d",source:"DM",storyTrigger:"REPLY",keyword:"SHOP",anyMessage:false},{id:"s",source:"STORY",storyTrigger:"MENTION",keyword:"",anyMessage:true}];
const automation={id:"a",integrationId:"account",source:"COMMENT",triggerMode:"SPECIFIC_KEYWORD",matchingMode:"CONTAINS",keywords:[{word:"BOOK"},{word:"SHOP"}],listener:{flowRevision:1,flowTriggers:triggers},User:{integrations:[{id:"account",instagramId:"instagram-owner",token:"valid-secret-token-123456789"}]}};
beforeEach(()=>{vi.restoreAllMocks();db.automation.findMany.mockResolvedValue([structuredClone(automation)]);db.listener.updateMany.mockResolvedValue({count:1});});
describe("multi-trigger webhook dispatch",()=>{
 it("does not route DM from another source's keyword",async()=>{expect(await findAutomationForDM("BOOK","page")).toBeNull();expect((await findAutomationForDM("SHOP","page"))?.automation.id).toBe("a");});
 it("dispatches story trigger even when automation primary source is COMMENT",async()=>{expect((await findAutomationForStory("MENTION","page"))?.id).toBe("a");expect(await findAutomationForStory("REPLY","page")).toBeNull();});
 it("verifies the actual first next publication from account timeline",async()=>{
  const next={...structuredClone(automation),listener:{flowRevision:1,flowTriggers:[{...triggers[0],postScope:"next",publishedAt:"2026-09-27T01:00:00.000Z"}]}};
  const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({data:[{id:"later",timestamp:"2026-09-27T03:00:00Z"},{id:"first",timestamp:"2026-09-27T02:00:00Z"},{id:"old",timestamp:"2026-09-26T01:00:00Z"}]})));
  await bindNextPostTriggers(next as any);expect(db.listener.updateMany.mock.calls.at(-1)?.[0].data.flowTriggers[0].boundPostId).toBe("first");expect(String(fetch.mock.calls[0][0])).toContain("/instagram-owner/media");
 });
 it("does not bind unverified media on API failure",async()=>{db.listener.updateMany.mockClear();vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("{}",{status:403}));const next={...structuredClone(automation),listener:{flowRevision:1,flowTriggers:[{...triggers[0],postScope:"next",publishedAt:"2026-09-27T01:00:00.000Z"}]}};await bindNextPostTriggers(next as any);expect(db.listener.updateMany).not.toHaveBeenCalled();});
});

describe("published graph opening callback revision",()=>{
 it("requires a confirmed opener from this recipient and current revision",async()=>{
  db.automationEvent.findFirst.mockResolvedValue(null);
  const flow={...automation,listener:{...automation.listener,flowDefinition:{version:1},flowRevision:4}};
  expect(await isCurrentFlowOpening(flow as any,"recipient","comment")).toBe(false);
  expect(db.automationEvent.findFirst.mock.calls.at(-1)?.[0].where).toMatchObject({automationId:"a",igUserId:"recipient",commentId:"comment",meta:{path:["flowRevision"],equals:4}});
  db.automationEvent.findFirst.mockResolvedValue({id:"delivered"});
  expect(await isCurrentFlowOpening(flow as any,"recipient","comment")).toBe(true);
  expect(await isCurrentFlowOpening(flow as any,"recipient")).toBe(false);
 });
});

describe("comment post share routing",()=>{
 it("matches the selected post with no keyword text and refuses unrelated or unidentified shares",async()=>{db.automation.findMany.mockResolvedValue([{...automation,triggerOnShares:true,sendPrivateDm:true,posts:[{postid:"post"}],listener:{}}]);expect((await findAutomationForDM("","page","r",true,"post"))?.matchedKeyword).toBe("shared post");expect(await findAutomationForDM("SHOP","page","r",true,"other")).toBeNull();expect(await findAutomationForDM("","page","r",true)).toBeNull();expect(db.automation.findMany.mock.calls[0][0].where.integration).toMatchObject({status:"CONNECTED",planLocked:false});});
 it("does not run the share trigger when its switch is off",async()=>{db.automation.findMany.mockResolvedValue([{...automation,triggerOnShares:false,sendPrivateDm:true,posts:[{postid:"post"}],listener:{}}]);expect(await findAutomationForDM("","page","r",true,"post")).toBeNull();});
});
