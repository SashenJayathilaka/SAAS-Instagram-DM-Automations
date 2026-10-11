import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), user: vi.fn(), transaction: vi.fn(), optimize: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ client: { user: { findUnique: mocks.user }, $transaction: mocks.transaction } }));
vi.mock("@/lib/product-image-processing", () => ({ optimizeProductImage: mocks.optimize }));
import { POST } from "./route";
const request = (headers = {}) => new Request("https://ap3k.com/api/automation-images", { method: "POST", headers: { origin: "https://ap3k.com", "content-type": "image/jpeg", ...headers }, body: "image" });
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ userId: "clerk-owner" }); mocks.user.mockResolvedValue({ id: "owner-id", status: "ACTIVE" }); mocks.optimize.mockResolvedValue(Buffer.from("jpeg")); });
describe("product photo uploads", () => {
  it("requires sign-in before reading or storing an image", async () => { mocks.auth.mockResolvedValue({ userId: null }); expect((await POST(request())).status).toBe(401); expect(mocks.user).not.toHaveBeenCalled(); });
  it("rejects cross-origin requests and suspended accounts", async () => {
    expect((await POST(request({ origin: "https://evil.example" }))).status).toBe(403);
    mocks.user.mockResolvedValue({ id: "owner-id", status: "SUSPENDED" }); expect((await POST(request())).status).toBe(403); expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects unsupported types and oversized transport bodies", async () => {
    expect((await POST(request({ "content-type": "image/svg+xml" }))).status).toBe(415);
    expect((await POST(request({ "content-length": "3000000" }))).status).toBe(413); expect(mocks.optimize).not.toHaveBeenCalled();
  });
  it("does not store invalid image bytes", async () => { mocks.optimize.mockRejectedValue(new Error("Invalid jpeg")); expect((await POST(request())).status).toBe(400); expect(mocks.transaction).not.toHaveBeenCalled(); });
  it("locks and stores under the authenticated owner, retaining referenced images", async () => {
    const create = vi.fn().mockResolvedValue({ id: "new-image-id" }); const cleanup = vi.fn(); const lock = vi.fn();
    const tx = { $queryRaw: lock, listener: { findMany: vi.fn().mockResolvedValue([{ mediaUrl: "https://ap3k.com/api/automation-images/11111111-1111-4111-8111-111111111111" }]) }, automationImage: { findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), deleteMany: cleanup, create } };
    mocks.transaction.mockImplementation(callback => callback(tx));
    expect((await POST(request())).status).toBe(200);
    expect(mocks.user).toHaveBeenCalledWith({ where: { clerkId: "clerk-owner" }, select: { id: true, status: true } });
    expect(lock).toHaveBeenCalled(); expect(create.mock.calls[0][0].data.userId).toBe("owner-id");
    expect(cleanup.mock.calls[0][0].where).toMatchObject({ userId: "owner-id", id: { notIn: ["11111111-1111-4111-8111-111111111111"] } });
  });
});
