import { it, expect, vi, afterEach } from "vitest";
const m = vi.hoisted(() => ({ count: vi.fn(), del: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  client: { automationAttachment: { count: m.count } },
}));
vi.mock("@upstash/blob", () => ({
  Bucket: { fromEnv: () => ({ del: m.del }) },
}));
import { deleteOwnedAttachmentObjects } from "./attachment-cleanup";
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
it("deletes only the owner's private prefix before DB deletion", async () => {
  m.count.mockResolvedValue(2);
  vi.stubEnv("UPSTASH_BLOB_TOKEN", "fake-test-token");
  await deleteOwnedAttachmentObjects("11111111-1111-4111-8111-111111111111");
  expect(m.del).toHaveBeenCalledWith({
    prefix:
      "ap3k/development/attachments/11111111-1111-4111-8111-111111111111/",
  });
});
it("requires configured cleanup when the owner has files", async () => {
  m.count.mockResolvedValue(1);
  vi.stubEnv("UPSTASH_BLOB_TOKEN", "");
  await expect(
    deleteOwnedAttachmentObjects("11111111-1111-4111-8111-111111111111"),
  ).rejects.toThrow("cleanup");
  expect(m.del).not.toHaveBeenCalled();
});
