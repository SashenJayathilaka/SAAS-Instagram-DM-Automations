import { describe, expect, it, vi } from "vitest";
vi.mock("@/actions/user", () => ({ onCurrentUser: async () => ({ id: "clerk-owner" }) }));
vi.mock("@/actions/user/queries", () => ({ findUser: async () => ({ id: "owner", clerkId: "clerk-owner", subscription: { plan: "BUSINESS" } }) }));
vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: async () => "account-b" }));
vi.mock("@/lib/prisma", () => ({ client: {} }));
vi.mock("@/actions/usage/queries", () => ({}));
vi.mock("@/lib/ai-reply", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveAiWorkspaceAction, addAiKnowledgeAction, clearAiPlaygroundAction, testAiWorkspaceAction } from "./ai-workspace";
describe("stale AI forms after switching accounts", () => {
  it("rejects saving or adding knowledge from the previous account before accessing data", async () => {
    const form = new FormData(); form.set("integrationId", "account-a");
    for (const action of [saveAiWorkspaceAction, addAiKnowledgeAction]) expect(await action(form)).toMatchObject({ status: 400, data: "Your Instagram account changed. Reload this page before saving." });
  });
  it("rejects clearing or testing the previous account playground", async () => {
    expect(await clearAiPlaygroundAction("account-a")).toMatchObject({ status: 400 });
    expect(await testAiWorkspaceAction("hello", "account-a")).toMatchObject({ status: 400 });
  });
});
