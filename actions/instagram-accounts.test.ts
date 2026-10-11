import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), set: vi.fn(), revalidate: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ client: { integrations: { findFirst: mocks.find } } }));
vi.mock("next/headers", () => ({ cookies: () => ({ set: mocks.set }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { switchInstagramAccount } from "./instagram-accounts";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ id: "owner" }); });
describe("account switching authorization", () => {
  it("rejects signed-out and malformed requests without changing selection", async () => {
    expect(await switchInstagramAccount("invalid")).toEqual({ ok: false });
    mocks.auth.mockResolvedValue(null);
    expect(await switchInstagramAccount(id)).toEqual({ ok: false });
    expect(mocks.find).not.toHaveBeenCalled(); expect(mocks.set).not.toHaveBeenCalled();
  });
  it("requires an unlocked account owned by the authenticated user", async () => {
    mocks.find.mockResolvedValue(null);
    expect(await switchInstagramAccount(id)).toEqual({ ok: false });
    expect(mocks.find).toHaveBeenCalledWith({ where: { id, User: { clerkId: "owner" }, name: "INSTAGRAM", planLocked: false }, select: { id: true } });
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("persists only the verified account and invalidates dashboard data", async () => {
    mocks.find.mockResolvedValue({ id });
    expect(await switchInstagramAccount(id)).toEqual({ ok: true });
    expect(mocks.set).toHaveBeenCalledWith("ap3k_instagram_account", id, expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/dashboard", "layout");
  });
});
