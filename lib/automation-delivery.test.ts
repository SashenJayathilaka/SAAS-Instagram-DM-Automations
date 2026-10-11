import { beforeEach, describe, expect, it, vi } from "vitest";
const db=vi.hoisted(()=>({messageLog:{findFirst:vi.fn()},inboxMessage:{findFirst:vi.fn()},automationDmRecipient:{createMany:vi.fn()},automationDeliveryJob:{createMany:vi.fn(),findMany:vi.fn(),updateMany:vi.fn(),update:vi.fn(),upsert:vi.fn()}}));
const resume=vi.hoisted(()=>vi.fn());
const wake=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/qstash-delivery-wake",()=>({scheduleDeliveryWake:wake}));
vi.mock("@/lib/prisma",()=>({client:db}));vi.mock("@/lib/meta-webhook-handler",()=>({resumeAutomationDelivery:resume}));
import {claimDmRecipient,claimImmediateComment,deferAutomationDelivery,processAutomationDeliveries} from "./automation-delivery";
beforeEach(()=>{vi.clearAllMocks();wake.mockResolvedValue(false);db.automationDeliveryJob.upsert.mockImplementation(async ({create})=>({...create,id:"job",status:"PENDING"}));db.messageLog.findFirst.mockResolvedValue(null);db.automationDeliveryJob.updateMany.mockResolvedValue({count:1});db.automationDeliveryJob.update.mockResolvedValue({});resume.mockResolvedValue(undefined);});
describe("one DM per recipient",()=>{
 it("atomically allows only one of concurrent triggers",async()=>{const claimed=new Set<string>();db.automationDmRecipient.createMany.mockImplementation(async ({data})=>{const key=data[0].automationId+data[0].recipientIgId;if(claimed.has(key))return {count:0};claimed.add(key);return {count:1};});expect(await Promise.all([claimDmRecipient("a","r"),claimDmRecipient("a","r")])).toEqual([true,false]);expect(await claimDmRecipient("b","r")).toBe(true);});
 it("honors already delivered messages when enabled later",async()=>{db.messageLog.findFirst.mockResolvedValue({id:"sent"});expect(await claimDmRecipient("a","r")).toBe(false);expect(db.automationDmRecipient.createMany).not.toHaveBeenCalled();});
});
const now=new Date("2026-10-01T10:00:00Z");const job={id:"j",automationId:"a",payload:{entry:{id:"ig"},object:"instagram"},createdAt:new Date(now.getTime()-60000),automation:{active:true,archivedAt:null}};
describe("durable delays",()=>{
 it("stores one job per event without extending its deadline on replay",async()=>{await deferAutomationDelivery({automationId:"a",eventKey:"comment:1",seconds:3600,entry:{id:"ig"},object:"instagram"});expect(db.automationDeliveryJob.upsert.mock.calls[0][0]).toMatchObject({where:{automationId_eventKey:{automationId:"a",eventKey:"comment:1"}},update:{}});});
 it("claims due work before resuming it and clears retained payload",async()=>{db.automationDeliveryJob.findMany.mockResolvedValue([job]);await processAutomationDeliveries(now);expect(resume).toHaveBeenCalledWith("a",{id:"ig"},"instagram");expect(db.automationDeliveryJob.update).toHaveBeenCalledWith({where:{id:"j"},data:{status:"COMPLETED",payload:{}}});});
 it("never runs a paused campaign, expired message, or work claimed elsewhere",async()=>{db.automationDeliveryJob.findMany.mockResolvedValue([{...job,automation:{active:false}},{...job,id:"expired",createdAt:new Date(now.getTime()-86400001)}]);await processAutomationDeliveries(now);expect(resume).not.toHaveBeenCalled();db.automationDeliveryJob.findMany.mockResolvedValue([job]);db.automationDeliveryJob.updateMany.mockResolvedValue({count:0});await processAutomationDeliveries(now);expect(resume).not.toHaveBeenCalled();});
 it("does not replay a delivery with an ambiguous failure",async()=>{db.automationDeliveryJob.findMany.mockResolvedValue([job]);resume.mockRejectedValue(new Error("timeout"));await processAutomationDeliveries(now);expect(db.automationDeliveryJob.update).toHaveBeenCalledWith({where:{id:"j"},data:{status:"FAILED",payload:{}}});});
});

it("cancels a delayed response when the conversation has moved on",async()=>{db.automationDeliveryJob.findMany.mockResolvedValue([{...job,automation:{...job.automation,integrationId:"account"},payload:{...job.payload,recipientIgId:"recipient"}}]);db.inboxMessage.findFirst.mockResolvedValue({id:"later-message"});await processAutomationDeliveries(now);expect(resume).not.toHaveBeenCalled();expect(db.inboxMessage.findFirst.mock.calls[0][0].where.conversation).toEqual({integrationId:"account",recipientIgId:"recipient"});expect(db.automationDeliveryJob.update).toHaveBeenCalledWith({where:{id:"j"},data:{status:"CANCELLED",payload:{}}});});

it("schedules a precise wake for a 30-second delay without waiting for the cron sweep", async()=>{
 wake.mockResolvedValue(true);
 await deferAutomationDelivery({automationId:"a",eventKey:"comment:30",seconds:30,entry:{id:"ig"},object:"instagram"});
 const stored=db.automationDeliveryJob.upsert.mock.calls[0][0].create;
 expect(wake).toHaveBeenCalledWith(expect.objectContaining({id:"job",dueAt:stored.dueAt,status:"PENDING"}));
 expect(db.automationDeliveryJob.findMany).not.toHaveBeenCalled();
});
it("keeps the original deadline on redelivery and does not wake completed jobs",async()=>{
 const dueAt=new Date(Date.now()+60000);
 db.automationDeliveryJob.upsert.mockResolvedValue({id:"same-job",status:"PENDING",dueAt});wake.mockResolvedValue(true);
 await deferAutomationDelivery({automationId:"a",eventKey:"comment:1",seconds:3600,entry:{id:"ig"},object:"instagram"});
 expect(wake).toHaveBeenCalledWith({id:"same-job",status:"PENDING",dueAt});
 wake.mockClear();db.automationDeliveryJob.upsert.mockResolvedValue({id:"same-job",status:"COMPLETED",dueAt});
 await deferAutomationDelivery({automationId:"a",eventKey:"comment:1",seconds:3600,entry:{id:"ig"},object:"instagram"});
 expect(wake).not.toHaveBeenCalled();
});

it("expires backtracked comments using original time, not queue creation time",async()=>{
 db.automationDeliveryJob.findMany.mockResolvedValue([{...job,payload:{...job.payload,backtrack:true,commentTimestamp:new Date(now.getTime()-7*86400000).toISOString()}}]);
 await processAutomationDeliveries(now);expect(resume).not.toHaveBeenCalled();
 expect(db.automationDeliveryJob.update).toHaveBeenCalledWith({where:{id:"j"},data:{status:"CANCELLED",payload:{}}});
});
it("does not backtrack missing timestamps or opted-out recipients",async()=>{
 db.automationDeliveryJob.findMany.mockResolvedValue([{...job,payload:{...job.payload,backtrack:true}}]);
 await processAutomationDeliveries(now);expect(resume).not.toHaveBeenCalled();
 db.automationDeliveryJob.findMany.mockResolvedValue([{...job,automation:{...job.automation,integrationId:"i"},payload:{...job.payload,recipientIgId:"r",backtrack:true,commentTimestamp:new Date(now.getTime()-1000).toISOString()}}]);
 db.inboxMessage.findFirst.mockResolvedValue({content:"STOP"});await processAutomationDeliveries(now);expect(resume).not.toHaveBeenCalled();
});

it("shares one atomic comment claim between immediate and queued delivery",async()=>{
 const used=new Set<string>();
 db.automationDeliveryJob.createMany.mockImplementation(async({data})=>{const key=data[0].automationId+data[0].eventKey;if(used.has(key))return {count:0};used.add(key);return {count:1};});
 expect(await Promise.all([claimImmediateComment("a","1"),claimImmediateComment("a","1")])).toEqual([true,false]);
 expect(await claimImmediateComment("b","1")).toBe(true);
 expect(db.automationDeliveryJob.createMany).toHaveBeenCalledWith(expect.objectContaining({skipDuplicates:true,data:[expect.objectContaining({eventKey:"comment:1",status:"COMPLETED",payload:{}})]}));
});
it("rechecks account, owner and paid automation eligibility when scheduled work runs",async()=>{
 for(const extra of [{User:{status:"SUSPENDED"}},{integration:{status:"DISCONNECTED"}},{User:{status:"ACTIVE",subscription:{plan:"FREE"}},listener:{aiReplyEnabled:true}}]){
  db.automationDeliveryJob.findMany.mockResolvedValue([{...job,automation:{...job.automation,...extra},payload:{...job.payload,backtrack:true,commentTimestamp:new Date(now.getTime()-1000).toISOString()}}]);
  await processAutomationDeliveries(now);expect(resume).not.toHaveBeenCalled();
 }
});

it("a DM sent while a public reply waits does not cancel that independent public reply",async()=>{
 db.inboxMessage.findFirst.mockImplementation(async({where})=>where.direction.in.includes("OUTBOUND")?{id:"sent-dm"}:null);
 db.automationDeliveryJob.findMany.mockResolvedValue([{...job,automation:{...job.automation,integrationId:"account"},payload:{...job.payload,entry:{id:"ig",ap3kDeliveryStep:"PUBLIC_REPLY"},recipientIgId:"recipient"}}]);
 await processAutomationDeliveries(now);
 expect(resume).toHaveBeenCalledWith("a",{id:"ig",ap3kDeliveryStep:"PUBLIC_REPLY"},"instagram");
});
