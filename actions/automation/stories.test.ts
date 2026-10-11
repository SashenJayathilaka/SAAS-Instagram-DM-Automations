import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),account:vi.fn(),integration:vi.fn(),fetch:vi.fn()}));
vi.mock("@/actions/user",()=>({onCurrentUser:mocks.user}));vi.mock("@/lib/instagram-account-scope",()=>({currentInstagramAccountId:mocks.account}));vi.mock("@/lib/prisma",()=>({client:{integrations:{findFirst:mocks.integration}}}));vi.mock("@/lib/instagram-stories",()=>({fetchActiveInstagramStories:mocks.fetch}));
import {getActiveInstagramStories} from "./stories";
beforeEach(()=>{vi.resetAllMocks();mocks.user.mockResolvedValue({id:"clerk-owner"});mocks.account.mockResolvedValue("i");mocks.integration.mockResolvedValue({token:"secret"});mocks.fetch.mockResolvedValue({ok:true,stories:[],complete:true});});
describe("Story picker server action",()=>{
 it("uses only the current user's unlocked connected integration",async()=>{expect(await getActiveInstagramStories("i")).toMatchObject({ok:true,stories:[]});expect(mocks.integration.mock.calls[0][0].where).toEqual({id:"i",User:{clerkId:"clerk-owner"},status:"CONNECTED",reconnectRequired:false,planLocked:false});expect(JSON.stringify(await getActiveInstagramStories("i"))).not.toContain("secret");});
 it("rejects another account or an account switch",async()=>{expect(await getActiveInstagramStories("foreign")).toMatchObject({ok:false,complete:false});expect(mocks.integration).not.toHaveBeenCalled();expect(mocks.fetch).not.toHaveBeenCalled();});
 it("distinguishes a disconnected account from an empty active-story list",async()=>{mocks.integration.mockResolvedValue(null);expect(await getActiveInstagramStories("i")).toMatchObject({ok:false,reconnectRequired:true});});
 it("does not expose login failures or credential details",async()=>{mocks.user.mockRejectedValue(new Error("secret details"));const result=await getActiveInstagramStories("i");expect(result.ok).toBe(false);expect(JSON.stringify(result)).not.toContain("secret");expect(mocks.fetch).not.toHaveBeenCalled();});
});
