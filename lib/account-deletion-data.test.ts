vi.mock("@/lib/attachment-cleanup",()=>({deleteOwnedAttachmentObjects:vi.fn().mockResolvedValue(undefined)}));
import { beforeEach, describe, expect, it, vi } from "vitest";
const tx = vi.hoisted(() => ({
  automation: { findMany: vi.fn() }, integrations: { findMany: vi.fn() },
  dms: { deleteMany: vi.fn() }, webhookEvent: { deleteMany: vi.fn() },
  adminAuditLog: { deleteMany: vi.fn() }, user: { delete: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ client: { $transaction: async (fn: (arg: typeof tx) => Promise<void>) => fn(tx) } }));
import { deleteAp3kData } from "./account-deletion-data";
describe("multi-account deletion cleanup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    tx.automation.findMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);
    tx.integrations.findMany.mockResolvedValue([{ id: "i1", instagramId: "ig1" }, { id: "i2", instagramId: "ig2" }]);
  });
  it("cleans every owned account while retaining admin audit history", async () => {
    await deleteAp3kData("owner", "owner@example.com", true);
    expect(tx.integrations.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "owner" } }));
    expect(tx.webhookEvent.deleteMany).toHaveBeenCalledWith({ where: { OR: [
      { automationId: { in: ["a1", "a2"] } }, { igAccountId: { in: ["ig1", "ig2"] } },
    ] } });
    expect(tx.adminAuditLog.deleteMany).not.toHaveBeenCalled();
    expect(tx.user.deleteMany).toHaveBeenCalledWith({ where: { id: "owner" } });
  });
});
