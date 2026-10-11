import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), cookie: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { integrations: { findMany: mocks.findMany } } }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: mocks.cookie }) }));
import { currentInstagramAccountId, selectInstagramAccount, NO_INSTAGRAM_ACCOUNT } from "./instagram-account-scope";

const accounts = [{ id: "a", status: "CONNECTED", planLocked: false }, { id: "b", status: "CONNECTED", planLocked: false }, { id: "locked", status: "CONNECTED", planLocked: true }];
beforeEach(() => { vi.clearAllMocks(); mocks.findMany.mockResolvedValue(accounts); });
describe("Instagram account ownership", () => {
  it("uses the selected owned account", async () => {
    mocks.cookie.mockReturnValue({ value: "b" });
    expect(await currentInstagramAccountId("owner-a")).toBe("b");
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { name: "INSTAGRAM", User: { clerkId: "owner-a" } } }));
  });
  it.each(["other-customer-account", "locked", "not-a-uuid"])("never trusts an unauthorized selection: %s", async (id) => {
    mocks.cookie.mockReturnValue({ value: id });
    expect(await currentInstagramAccountId("owner-a")).toBe("a");
  });
  it("uses an impossible scope when no accounts exist, never an unfiltered query", async () => {
    mocks.findMany.mockResolvedValue([]);
    expect(await currentInstagramAccountId("owner-a")).toBe(NO_INSTAGRAM_ACCOUNT);
  });
  it("prefers an available connected account over a disconnected account", () => {
    expect(selectInstagramAccount([{ id: "old", status: "DISCONNECTED" }, ...accounts])?.id).toBe("a");
  });
});
