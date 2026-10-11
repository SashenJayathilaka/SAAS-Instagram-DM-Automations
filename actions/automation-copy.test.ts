import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(()=>({profile:vi.fn(),scope:vi.fn(),reserve:vi.fn(),complete:vi.fn(),release:vi.fn(),generate:vi.fn()}));
vi.mock("@/actions/user",()=>({onCurrentUser:async()=>({id:"clerk"})}));
vi.mock("@/actions/user/queries",()=>({findUser:m.profile}));
vi.mock("@/lib/instagram-account-scope",()=>({currentInstagramAccountId:m.scope}));
vi.mock("@/actions/usage/queries",()=>({reserveAiReplyQuota:m.reserve,completeAiReplyReservation:m.complete,releaseAiReplyReservation:m.release}));
vi.mock("@/lib/ai-reply",()=>({generateAutomationCopy:m.generate}));
import { generateAutomationCopyAction } from "./automation-copy";
const input = {mode:"MESSAGE" as const,integrationId:"account",text:"Hello"};
beforeEach(()=>{vi.clearAllMocks();m.profile.mockResolvedValue({id:"user",subscription:{plan:"PRO"}});m.scope.mockResolvedValue("account");m.reserve.mockResolvedValue({ok:true,reservationId:"quota"});m.generate.mockResolvedValue(["Hi"]);m.release.mockResolvedValue(undefined);});
describe("automation AI generation",()=>{
  it("does not reserve quota for incomplete variation sources",async()=>{
    for(const source of [{text:""},{text:"Hello",hasButtons:true,linkButtons:[]},{text:"Hello",hasButtons:true,linkButtons:[{label:"Guide",url:""}]}]) {
      expect((await generateAutomationCopyAction({...input,...source,mode:"MESSAGE_VARIATIONS"})).ok).toBe(false);
    }
    expect(m.reserve).not.toHaveBeenCalled();expect(m.generate).not.toHaveBeenCalled();
  });
  it("works with no AI workspace activation and accounts for the request",async()=>{expect(await generateAutomationCopyAction(input)).toEqual({ok:true,items:["Hi"]});expect(m.complete).toHaveBeenCalledWith("quota",{purpose:"AUTOMATION_EDITOR",mode:"MESSAGE"});});
  it("rejects stale account scope before using AI",async()=>{expect((await generateAutomationCopyAction({...input,integrationId:"other"})).ok).toBe(false);expect(m.reserve).not.toHaveBeenCalled();});
  it("enforces plan and monthly quota",async()=>{m.profile.mockResolvedValue({id:"user",subscription:{plan:"FREE"}});expect((await generateAutomationCopyAction(input)).ok).toBe(false);expect(m.generate).not.toHaveBeenCalled();m.profile.mockResolvedValue({id:"user",subscription:{plan:"PRO"}});m.reserve.mockResolvedValue({ok:false});expect((await generateAutomationCopyAction(input)).ok).toBe(false);expect(m.generate).not.toHaveBeenCalled();});
  it("releases quota on provider failure",async()=>{m.generate.mockRejectedValue(new Error("provider"));expect((await generateAutomationCopyAction(input)).ok).toBe(false);expect(m.release).toHaveBeenCalledWith("quota");});
});

it("lets free users draft public AI replies with a bounded preview quota",async()=>{m.profile.mockResolvedValue({id:"user",subscription:{plan:"FREE"}});expect((await generateAutomationCopyAction({...input,mode:"COMMENT_SAMPLES"})).ok).toBe(true);expect(m.reserve).toHaveBeenCalledWith({userId:"user",channel:"PLAYGROUND",allowFreePreview:true});});
