import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), owner: vi.fn(), find: vi.fn(), audit: vi.fn(), auditUpdate: vi.fn(),
  userUpdate: vi.fn(), pause: vi.fn(), transaction: vi.fn(), stripe: vi.fn(),
  key: vi.fn(), clerk: vi.fn(), cleanup: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/actions/admin/safe-actions", () => ({
  requireAdminAction: mocks.auth,
  adminFormString: (f: FormData, k: string) => String(f.get(k) ?? "").trim(),
  createAdminAuditLog: mocks.audit,
}));
vi.mock("@/lib/admin", () => ({ isOwnerAdminIdentity: mocks.owner }));
vi.mock("@/lib/prisma", () => ({ client: {
  user: { findUnique: mocks.find, update: mocks.userUpdate },
  automation: { updateMany: mocks.pause },
  adminAuditLog: { update: mocks.auditUpdate },
  $transaction: mocks.transaction,
} }));
vi.mock("@/lib/stripe", () => ({ stripe: { customers: { del: mocks.stripe } } }));
vi.mock("@/lib/stripe-config", () => ({ getStripeSecretKey: mocks.key }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => ({ users: { deleteUser: mocks.clerk } }) }));
vi.mock("@/lib/account-deletion-data", () => ({ deleteAp3kData: mocks.cleanup }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { adminDeleteUserAction } from "./delete-user";

const id = "11111111-1111-4111-8111-111111111111";
function form(confirmation = "DELETE") {
  const f = new FormData();
  f.set("userId", id); f.set("reason", "Customer deletion request"); f.set("confirmation", confirmation);
  return f;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ clerkId: "owner" });
  mocks.owner.mockReturnValue(false);
  mocks.find.mockResolvedValue({ id, email: "customer@test.com", clerkId: "customer", subscription: { customerId: "cus_test" } });
  mocks.audit.mockResolvedValue({ id: "audit" });
  mocks.key.mockReturnValue("configured");
});
describe("admin account deletion", () => {
  it("denies non-admins before loading a target", async () => {
    mocks.auth.mockRejectedValue(new Error("denied"));
    expect((await adminDeleteUserAction(form())).status).toBe(403);
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.stripe).not.toHaveBeenCalled();
  });
  it("requires DELETE and a reason before any mutation", async () => {
    expect((await adminDeleteUserAction(form("DELETE customer@test.com"))).status).toBe(400);
    const f = form(); f.set("reason", "");
    expect((await adminDeleteUserAction(f)).status).toBe(400);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("protects owner admin accounts", async () => {
    mocks.owner.mockReturnValue(true);
    expect((await adminDeleteUserAction(form())).status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("protects the current admin even if their email changed", async () => {
    mocks.find.mockResolvedValue({ id, email: "changed@test.com", clerkId: "owner" });
    expect((await adminDeleteUserAction(form())).status).toBe(403);
    expect(mocks.clerk).not.toHaveBeenCalled();
  });
  it("audits intent and cancels billing before deleting identity and all account data", async () => {
    const order: string[] = [];
    mocks.audit.mockImplementation(async () => { order.push("audit"); return { id: "audit" }; });
    mocks.stripe.mockImplementation(async () => { order.push("billing"); });
    mocks.clerk.mockImplementation(async () => { order.push("identity"); });
    mocks.cleanup.mockImplementation(async () => { order.push("data"); });
    expect((await adminDeleteUserAction(form())).status).toBe(200);
    expect(order).toEqual(["audit", "billing", "identity", "data"]);
    expect(mocks.clerk).toHaveBeenCalledWith("customer");
    expect(mocks.cleanup).toHaveBeenCalledWith(id, "customer@test.com", true);
    expect(mocks.auditUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SUCCESS" }) }));
  });
  it("stops if billing cleanup fails", async () => {
    mocks.stripe.mockRejectedValue(new Error("outage"));
    expect((await adminDeleteUserAction(form())).status).toBe(502);
    expect(mocks.clerk).not.toHaveBeenCalled();
    expect(mocks.cleanup).not.toHaveBeenCalled();
  });
  it("keeps the database target available for retry if identity cleanup fails", async () => {
    mocks.clerk.mockRejectedValue({ status: 503 });
    expect((await adminDeleteUserAction(form())).status).toBe(502);
    expect(mocks.cleanup).not.toHaveBeenCalled();
  });
  it("retries safely when billing and identity are already removed", async () => {
    mocks.stripe.mockRejectedValue({ code: "resource_missing" });
    mocks.clerk.mockRejectedValue({ status: 404 });
    expect((await adminDeleteUserAction(form())).status).toBe(200);
    expect(mocks.cleanup).toHaveBeenCalledOnce();
  });
  it("does not start destructive work without a persisted audit record", async () => {
    mocks.audit.mockRejectedValue(new Error("database down"));
    await expect(adminDeleteUserAction(form())).rejects.toThrow();
    expect(mocks.stripe).not.toHaveBeenCalled();
    expect(mocks.clerk).not.toHaveBeenCalled();
  });
});
