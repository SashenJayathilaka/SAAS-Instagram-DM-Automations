import { describe, expect, it, vi } from "vitest";
vi.mock("@clerk/nextjs/server", () => ({ currentUser: async () => ({ id: "owner" }) }));
vi.mock("@/actions/user", () => ({ getCurrentWorkspaceClerkId: async () => "owner" }));
vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: async () => "account-b" }));
vi.mock("@/lib/prisma", () => ({ client: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { removeCurrentInstagramAccount } from "./remove-instagram";
describe("account removal confirmation scope", () => {
  it("rejects removal if another tab switched accounts after the confirmation was opened", async () => {
    expect(await removeCurrentInstagramAccount("account-a")).toMatchObject({ status: 409 });
    expect(await removeCurrentInstagramAccount()).toMatchObject({ status: 409 });
  });
});
