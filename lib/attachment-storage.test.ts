import { beforeEach, describe, it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  user: vi.fn(),
  find: vi.fn(),
  many: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
  get: vi.fn(),
  config: null as any,
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: m.auth }));
vi.mock("@/lib/prisma", () => ({
  client: {
    user: { findUnique: m.user },
    automationAttachment: {
      findFirst: m.find,
      findMany: m.many,
      update: m.update,
      updateMany: m.updateMany,
    },
    $transaction: m.transaction,
  },
}));
vi.mock("@upstash/blob", () => ({
  Bucket: { fromEnv: () => ({ get: m.get }) },
  BlobError: class extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
  uploadHandler: (options: unknown) => {
    m.config = options;
    return options;
  },
}));
import { createAttachmentUploads, attachmentUser } from "./attachment-storage";
import { GET } from "@/app/api/attachments/route";
import { attachmentScopePrefix } from "./attachment-scope";
const owner = { id: "owner", status: "ACTIVE" };
const item = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "owner",
  storageKey: "ap3k/development/attachments/owner/id",
  status: "PENDING",
  filename: "file.pdf",
  contentType: "application/pdf",
  mediaType: "FILE",
  size: 12,
};
beforeEach(() => {
  vi.clearAllMocks();
  m.auth.mockResolvedValue({ userId: "clerk-owner" });
  m.user.mockResolvedValue(owner);
  m.many.mockResolvedValue([]);
  m.updateMany.mockResolvedValue({ count: 1 });
  createAttachmentUploads();
});
describe("owned attachment authorization", () => {
  it("binds completion credentials to the deployment scope and rejects foreign paths", async () => {
    expect(m.config.endpoint).toBe(
      `/api/attachments/upload/${attachmentScopePrefix()}`,
    );
    await expect(
      m.config.onUploadComplete({
        ctx: owner,
        path: "ap3k/production/attachments/owner/file",
        metadata: { id: item.id, owner: "owner" },
        uploadId: "upload",
      }),
    ).rejects.toThrow("forbidden");
    expect(m.find).not.toHaveBeenCalled();
    expect(m.get).not.toHaveBeenCalled();
  });
  it("requires authentication, an active owner and same origin", async () => {
    m.auth.mockResolvedValue({ userId: null });
    await expect(attachmentUser()).rejects.toThrow("unauthorized");
    m.auth.mockResolvedValue({ userId: "owner" });
    m.user.mockResolvedValue({ ...owner, status: "SUSPENDED" });
    await expect(attachmentUser()).rejects.toThrow("forbidden");
    await expect(
      attachmentUser(
        new Request("https://ap3k.com/api/attachments/upload", {
          method: "POST",
          headers: { origin: "https://evil.test" },
        }),
      ),
    ).rejects.toThrow("forbidden");
  });
  it("lists only this owner's READY uploads", async () => {
    m.many.mockResolvedValue([]);
    m.updateMany.mockResolvedValue({ count: 1 });
    expect((await GET(new Request("https://ap3k.com/api/attachments"))).status).toBe(200);
    expect(m.many.mock.calls[0][0].where).toMatchObject({
      userId: "owner",
      status: "READY",
    });
    expect(m.many.mock.calls[0][0].select).not.toHaveProperty("storageKey");
  });
  it("reloads original filename and size only for the owner's requested READY attachment", async () => {
    m.many.mockResolvedValue([item]);
    const response = await GET(new Request(`https://ap3k.com/api/attachments?id=${item.id}`));
    expect(response.status).toBe(200);
    expect(m.many.mock.calls[0][0].where).toMatchObject({ userId: owner.id, id: item.id, status: "READY", storageKey: { startsWith: attachmentScopePrefix() + "attachments/" } });
    expect((await response.json()).files[0]).toMatchObject({ id: item.id, name: item.filename, size: item.size });
    m.many.mockResolvedValue([]);
    expect((await (await GET(new Request(`https://ap3k.com/api/attachments?id=${item.id}`))).json()).files).toEqual([]);
  });
  it("rejects invalid metadata IDs before querying stored files", async () => {
    expect((await GET(new Request("https://ap3k.com/api/attachments?id=bad"))).status).toBe(400);
    expect(m.many).not.toHaveBeenCalled();
  });
  it("refuses cross-tenant completion before reading any stored bytes", async () => {
    m.find.mockResolvedValue(null);
    await expect(
      m.config.onUploadComplete({
        ctx: owner,
        path: item.storageKey,
        metadata: { id: item.id, owner: "other" },
        uploadId: "upload",
      }),
    ).rejects.toThrow("forbidden");
    expect(m.find.mock.calls[0][0].where).toMatchObject({
      userId: "owner",
      id: item.id,
      storageKey: item.storageKey,
    });
    expect(m.get).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });
  it("checks actual object bytes before ready and fails spoofed files", async () => {
    m.find.mockResolvedValue(item);
    m.get.mockResolvedValue({
      contentType: "application/pdf",
      body: new Blob(["not a pdf!!!"]).stream(),
    });
    await expect(
      m.config.onUploadComplete({
        ctx: owner,
        path: item.storageKey,
        metadata: { id: item.id, owner: "owner" },
        uploadId: "upload",
      }),
    ).rejects.toThrow("content_type_not_allowed");
    expect(m.updateMany.mock.calls[0][0].data).toEqual({ status: "FAILED" });
  });
  it("makes same-upload completion replay idempotent", async () => {
    m.find.mockResolvedValue({ ...item, status: "READY", uploadId: "upload" });
    const dto = await m.config.onUploadComplete({
      ctx: owner,
      path: item.storageKey,
      metadata: { id: item.id, owner: "owner" },
      uploadId: "upload",
    });
    expect(dto.id).toBe(item.id);
    expect(m.get).not.toHaveBeenCalled();
    expect(m.update).not.toHaveBeenCalled();
  });
  it("cannot sign an oversize or unsupported upload", async () => {
    for (const file of [
      { name: "large.png", type: "image/png", size: 8000001 },
      { name: "page.html", type: "text/html", size: 20 },
    ])
      await expect(
        m.config.onBeforeUpload({ ctx: owner, file }),
      ).rejects.toThrow();
    expect(m.transaction).not.toHaveBeenCalled();
  });
});
