import { afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  find: vi.fn(),
  count: vi.fn(),
  sign: vi.fn(),
  del: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  client: { automationAttachment: { findFirst: m.find, count: m.count } },
}));
vi.mock("@upstash/blob", () => ({
  Bucket: { fromEnv: () => ({ signedReadUrl: m.sign, del: m.del }) },
}));
import {
  attachmentScopePrefix,
  attachmentOwnerPrefix,
} from "./attachment-scope";
import { resolveAttachmentMessage } from "./attachment-delivery";
import { deleteOwnedAttachmentObjects } from "./attachment-cleanup";
import { GET } from "@/app/media/attachments/[id]/route";
const id = "11111111-1111-4111-8111-111111111111",
  url = `https://ap3k.com/media/attachments/${id}`;
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
function preview(branch = "feature/first") {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_GIT_COMMIT_REF", branch);
  vi.stubEnv("UPSTASH_BLOB_TOKEN", "fake-test-token");
}
it("isolates production, every preview branch and development even for cloned owner IDs", () => {
  vi.stubEnv("VERCEL_ENV", "production");
  const production = attachmentOwnerPrefix(id);
  preview();
  const first = attachmentOwnerPrefix(id);
  preview("feature/second");
  const second = attachmentOwnerPrefix(id);
  expect(new Set([production, first, second]).size).toBe(3);
  preview("feature/first");
  expect(attachmentOwnerPrefix(id)).toBe(first);
  expect(first).not.toContain("feature/first");
});
it("refuses copied production metadata before minting or exposing a URL in preview", async () => {
  preview();
  m.find.mockResolvedValue({
    storageKey: `ap3k/production/attachments/${id}/file`,
    mediaType: "AUDIO",
    filename: "recording.wav",
  });
  await expect(resolveAttachmentMessage(url)).rejects.toThrow("unavailable");
  const r = await GET(new Request(url), { params: Promise.resolve({ id }) });
  expect(r.status).toBe(404);
  expect(m.sign).not.toHaveBeenCalled();
  expect(m.find.mock.calls[0][0].where.storageKey.startsWith).toBe(
    `${attachmentScopePrefix()}attachments/`,
  );
});
it("deletes only the active preview owner's prefix, never the cloned production prefix", async () => {
  preview();
  m.count.mockResolvedValue(1);
  await deleteOwnedAttachmentObjects(id);
  expect(m.count.mock.calls[0][0].where.storageKey.startsWith).toBe(
    `${attachmentScopePrefix()}attachments/`,
  );
  expect(m.del).toHaveBeenCalledWith({ prefix: attachmentOwnerPrefix(id) });
  expect(m.del.mock.calls[0][0].prefix).not.toContain("production");
});
it("fails closed when a preview lacks both branch and deployment scope", () => {
  preview("");
  vi.stubEnv("VERCEL_URL", "");
  expect(() => attachmentScopePrefix()).toThrow("scope");
});
