import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({reserve:vi.fn(),complete:vi.fn(),release:vi.fn(),provider:vi.fn(),create:vi.fn()}));
vi.mock("@/actions/usage/queries",()=>({reserveAiReplyQuota:mocks.reserve,completeAiReplyReservation:mocks.complete,releaseAiReplyReservation:mocks.release}));
vi.mock("@/lib/ai-routing",()=>({AiInvalidResponseError:class extends Error{},withAiProvider:async (_task:unknown,run:(provider:unknown)=>unknown)=>run(await mocks.provider()),createProvider:()=>({chat:{completions:{create:mocks.create}}})}));
vi.mock("@/lib/ai-completion-budget",()=>({aiCompletionBudget:()=>({max_tokens:100})}));
import {parseStoryIntent,storyIntentMatches} from "./story-intent";
beforeEach(()=>{vi.resetAllMocks();mocks.reserve.mockResolvedValue({ok:true,reservationId:"r"});mocks.complete.mockResolvedValue({});mocks.release.mockResolvedValue({});mocks.provider.mockResolvedValue({model:"test"});mocks.create.mockResolvedValue({choices:[{message:{content:'{"match":true,"confidence":0.95}'}}]});});
describe("Story intent classifier",()=>{
 it.each(['{}','not json','{"match":true,"confidence":0.79}','{"match":"true","confidence":1}','{"match":false,"confidence":1}','{"match":true,"confidence":5}'])("fails closed for %s",raw=>expect(parseStoryIntent(raw)).toBe(false));
 it("accepts only confident structured matches",()=>expect(parseStoryIntent('```json\n{"match":true,"confidence":0.9}\n```')).toBe(true));
 it("does not spend AI quota on empty input",async()=>{expect(await storyIntentMatches("","reply")).toBe(false);expect(mocks.reserve).not.toHaveBeenCalled();});
 it("reserves and completes AI usage with bounded latency",async()=>{expect(await storyIntentMatches("asking for the guide","send the guide",{userId:"u",automationId:"a"})).toBe(true);expect(mocks.reserve).toHaveBeenCalledWith({userId:"u",automationId:"a",channel:"DM",keyword:"story_intent_check"});expect(mocks.complete).toHaveBeenCalledWith("r",expect.any(Object));expect(mocks.create.mock.calls[0][1]).toEqual({timeout:8000,maxRetries:0});});
 it("does not call the provider when quota is exhausted",async()=>{mocks.reserve.mockResolvedValue({ok:false});expect(await storyIntentMatches("intent","reply",{userId:"u",automationId:"a"})).toBe(false);expect(mocks.create).not.toHaveBeenCalled();});
 it("releases reservations and fails closed on provider failure",async()=>{mocks.create.mockRejectedValue(new Error("timeout"));expect(await storyIntentMatches("intent","reply",{userId:"u",automationId:"a"})).toBe(false);expect(mocks.release).toHaveBeenCalledWith("r");});
});
