import {beforeEach,describe,it,expect,vi} from "vitest";
const mock=vi.hoisted(()=>({clerk:vi.fn(),account:vi.fn(),find:vi.fn(),create:vi.fn(),job:vi.fn(),processed:vi.fn(),wake:vi.fn(),fetch:vi.fn()}));
vi.mock("@/actions/user",()=>({getCurrentWorkspaceClerkId:mock.clerk}));
vi.mock("@/lib/instagram-account-scope",()=>({currentInstagramAccountId:mock.account}));
vi.mock("@/lib/prisma",()=>({client:{automation:{findFirst:mock.find},automationDeliveryJob:{createMany:mock.create,findUnique:mock.job}}}));
vi.mock("@/lib/instagram-media",()=>({resolveInstagramMediaConnection:()=>({ok:true,apiFamily:"instagram_graph",apiBaseUrl:"https://graph.instagram.com/v25.0",token:"test-token"})}));
vi.mock("@/actions/webhook/queries",()=>({hasProcessedCommentWebhook:mock.processed}));
vi.mock("@/lib/qstash-delivery-wake",()=>({scheduleDeliveryWake:mock.wake}));
import {getBacktrackInfo,startBacktrack} from "./automation-tools";
const id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const automation={id,active:true,source:"COMMENT",matchingMode:"CONTAINS",triggerMode:"SPECIFIC_KEYWORD",keywords:[{word:"link"}],posts:[{postid:"123"}],listener:{flowTriggers:null},deliveryDelaySeconds:30,integration:{id:"integration",instagramId:"owner",status:"CONNECTED",token:"test-token",igAccountSource:"instagram_login"},User:{subscription:{plan:"FREE"}}};
const comment={id:"789",from:{id:"person",username:"actual"},text:"link please",timestamp:new Date().toISOString()};
beforeEach(()=>{vi.clearAllMocks();mock.clerk.mockResolvedValue("clerk");mock.account.mockResolvedValue("integration");mock.find.mockResolvedValue(automation);mock.processed.mockResolvedValue(false);mock.create.mockResolvedValue({count:1});mock.job.mockResolvedValue({id:"job",dueAt:new Date()});mock.wake.mockResolvedValue(true);vi.stubGlobal("fetch",mock.fetch);mock.fetch.mockImplementation(async(url:URL)=>({ok:true,json:async()=>url.pathname.endsWith("/comments")?{data:[comment]}:{id:"123",owner:{id:"owner"},permalink:"https://www.instagram.com/p/abc/"}}));});
describe("owned backtrack actions",()=>{
 it("rejects unauthenticated and missing scoped automation without calling Meta",async()=>{mock.clerk.mockResolvedValue(null);expect((await startBacktrack(id)).ok).toBe(false);expect(mock.fetch).not.toHaveBeenCalled();mock.clerk.mockResolvedValue("clerk");mock.find.mockResolvedValue(null);expect((await getBacktrackInfo(id)).ok).toBe(false);expect(mock.find).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({id,integrationId:"integration",User:{clerkId:"clerk",status:"ACTIVE"}})}));});
 it("reading media never queues messages",async()=>{expect(await getBacktrackInfo(id)).toMatchObject({ok:true,eligible:true,media:[{id:"123",permalink:"https://www.instagram.com/p/abc/"}]});expect(mock.create).not.toHaveBeenCalled();});
 it("rejects media owned by a different account",async()=>{mock.fetch.mockResolvedValue({ok:true,json:async()=>({id:"123",owner:{id:"other"}})});expect((await startBacktrack(id)).ok).toBe(false);expect(mock.create).not.toHaveBeenCalled();});
 it("queues once with original timestamp, original target, and configured delay",async()=>{const before=Date.now();expect(await startBacktrack(id)).toMatchObject({ok:true,queued:1,skipped:0,done:true});const args=mock.create.mock.calls[0][0];expect(args.skipDuplicates).toBe(true);expect(args.data[0]).toMatchObject({automationId:id,eventKey:"comment:789",payload:{backtrack:true,commentTimestamp:comment.timestamp,entry:{id:"owner"}}});expect(args.data[0].dueAt.getTime()).toBeGreaterThanOrEqual(before+30000);mock.create.mockResolvedValue({count:0});expect(await startBacktrack(id)).toMatchObject({ok:true,queued:0,skipped:1});});
 it("skips already processed comments and does not bypass paid AI restrictions",async()=>{mock.processed.mockResolvedValue(true);expect(await startBacktrack(id)).toMatchObject({queued:0,skipped:1});mock.find.mockResolvedValue({...automation,listener:{...automation.listener,aiReplyEnabled:true}});expect((await startBacktrack(id)).ok).toBe(false);expect(mock.create).not.toHaveBeenCalled();});
 it("continues using signed cursors without fetching arbitrary paging URLs",async()=>{mock.fetch.mockImplementation(async(url:URL)=>({ok:true,json:async()=>url.pathname.endsWith("/comments")?{data:[],paging:{next:"https://evil.example/secret",cursors:{after:"opaque-cursor"}}}:{id:"123",owner:{id:"owner"}}}));const first=await startBacktrack(id);expect(first).toMatchObject({ok:true,done:false});if(!first.ok)throw Error();await startBacktrack(id,first.cursor);expect(mock.fetch.mock.calls.every(([url])=>url.hostname==="graph.instagram.com")).toBe(true);expect(mock.fetch.mock.calls.some(([url])=>url.searchParams.get("after")==="opaque-cursor")).toBe(true);});
});

describe("Instagram media ownership scopes",()=>{
 it.each([undefined,{id:"scoped-owner"}])("accepts omitted/scoped owner only when selected account media edge contains the post: %j",async(owner)=>{
  mock.fetch.mockImplementation(async(url:URL)=>({ok:true,json:async()=>url.pathname.endsWith("/media")?{data:[{id:"123",owner,permalink:"https://www.instagram.com/p/verified/"}]}:{id:"123",owner}}));
  expect(await getBacktrackInfo(id)).toMatchObject({ok:true,media:[{id:"123",permalink:"https://www.instagram.com/p/verified/"}]});
  expect(mock.fetch.mock.calls.some(([url])=>url.pathname==="/v25.0/owner/media")).toBe(true);
  expect(mock.create).not.toHaveBeenCalled();
 });
 it("rejects a readable foreign media object absent from the selected account's edge",async()=>{
  mock.fetch.mockImplementation(async(url:URL)=>({ok:true,json:async()=>url.pathname.endsWith("/media")?{data:[{id:"999"}]}:{id:"123",owner:{id:"other"}}}));
  expect(await startBacktrack(id)).toMatchObject({ok:false,error:"This post does not belong to the selected Instagram account."});expect(mock.create).not.toHaveBeenCalled();
 });
 it("verifies media on later account pages without following the returned URL",async()=>{
  mock.fetch.mockImplementation(async(url:URL)=>({ok:true,json:async()=>!url.pathname.endsWith("/media")?{id:"123"}:url.searchParams.has("after")?{data:[{id:"123"}]}:{data:[{id:"456"}],paging:{next:"https://evil.example/leak",cursors:{after:"page-two"}}}}));
  expect(await getBacktrackInfo(id)).toMatchObject({ok:true});
  expect(mock.fetch.mock.calls.every(([url])=>url.hostname==="graph.instagram.com")).toBe(true);
  expect(mock.fetch.mock.calls.some(([url])=>url.pathname==="/v25.0/owner/media" && url.searchParams.get("after")==="page-two")).toBe(true);
 });
 it("fails closed when media verification pagination repeats",async()=>{
  mock.fetch.mockImplementation(async(url:URL)=>({ok:true,json:async()=>url.pathname.endsWith("/media")?{data:[],paging:{next:"https://graph.instagram.com/next",cursors:{after:"repeat"}}}:{id:"123"}}));
  expect((await startBacktrack(id)).ok).toBe(false);expect(mock.create).not.toHaveBeenCalled();expect(mock.fetch).toHaveBeenCalledTimes(3);
 });
 it("skips own comments using verified owner scope and the connected Instagram ID",async()=>{
  mock.find.mockResolvedValue({...automation,integration:{...automation.integration,webhookAccountId:"webhook-owner",metaAppScopedUserId:"app-owner"}});
  mock.fetch.mockImplementation(async(url:URL)=>({ok:true,json:async()=>url.pathname.endsWith("/comments")?{data:["scoped-owner","owner"].map((fromId,index)=>({...comment,id:String(789+index),from:{id:fromId}}))}:url.pathname.endsWith("/media")?{data:[{id:"123",owner:{id:"scoped-owner"}}]}:{id:"123",owner:{id:"scoped-owner"}}}));
  expect(await startBacktrack(id)).toMatchObject({ok:true,queued:0,skipped:2});expect(mock.create).not.toHaveBeenCalled();
 });
});
