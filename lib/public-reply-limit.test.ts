import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ lock:vi.fn(), find:vi.fn(), count:vi.fn(), create:vi.fn(), update:vi.fn() }));
vi.mock("@/lib/prisma",()=>({client:{$transaction:async(fn:any)=>fn({$queryRaw:m.lock,publicReplySlot:{findUnique:m.find,count:m.count,create:m.create}}),publicReplySlot:{update:m.update}}}));
import { finishPublicReplySlot, reservePublicReplySlot } from "./public-reply-limit";
const input = {automationId:"automation",mediaId:"post",commentId:"comment",limit:100};
beforeEach(()=>{vi.clearAllMocks();m.find.mockResolvedValue(null);m.count.mockResolvedValue(99);m.create.mockResolvedValue({id:"slot"});});
describe("public reply rolling cap",()=>{
  it("reserves the last slot after locking and scopes the count to the post",async()=>{
    expect(await reservePublicReplySlot(input)).toEqual({ok:true,id:"slot"});
    expect(m.lock.mock.invocationCallOrder[0]).toBeLessThan(m.count.mock.invocationCallOrder[0]);
    expect(m.count).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({automationId:"automation",mediaId:"post",createdAt:{gt:expect.any(Date)}})}));
  });
  it("blocks at the cap without creating a reservation",async()=>{m.count.mockResolvedValue(100);expect(await reservePublicReplySlot(input)).toEqual({ok:false,reason:"public_reply_weekly_limit"});expect(m.create).not.toHaveBeenCalled();});
  it("does not repeat the same event, even without a cap",async()=>{m.find.mockResolvedValue({id:"existing"});expect((await reservePublicReplySlot({...input,limit:0})).ok).toBe(false);expect(m.create).not.toHaveBeenCalled();});
  it("does not free ambiguous sends for reuse",async()=>{await finishPublicReplySlot("slot",false);expect(m.update).toHaveBeenCalledWith({where:{id:"slot"},data:{status:"UNCERTAIN"}});});
});
