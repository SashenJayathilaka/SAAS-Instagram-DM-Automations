import { it, expect, vi, beforeEach } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  client: { automationAttachment: { findFirst: m.find } },
}));
vi.mock("@upstash/blob", () => ({
  Bucket: { fromEnv: () => ({ signedReadUrl: m.sign }) },
}));
import { resolveAttachmentMessage } from "./attachment-delivery";
const url =
  "https://ap3k.com/media/attachments/11111111-1111-4111-8111-111111111111";
beforeEach(() => vi.resetAllMocks());
it("resolves only ready stored records and mints fresh private URLs per send", async () => {
  m.find.mockResolvedValue({
    storageKey: "ap3k/development/attachments/owner/key",
    mediaType: "AUDIO",
  });
  m.sign
    .mockResolvedValueOnce({
      url: "https://blob.upstash.test/private?signature=first",
    })
    .mockResolvedValueOnce({
      url: "https://blob.upstash.test/private?signature=second",
    });
  const first = await resolveAttachmentMessage(url),
    second = await resolveAttachmentMessage(url);
  expect(first.attachment.type).toBe("audio");
  expect(first.attachment.payload.url).toContain("signature=first");
  expect(second.attachment.payload.url).toContain("signature=second");
  expect(m.find.mock.calls[0][0].where).toMatchObject({ status: "READY" });
  expect(m.sign).toHaveBeenCalledWith(
    "ap3k/development/attachments/owner/key",
    { expiresIn: "10m" },
  );
});
it("does not mint a URL for missing or unfinished files", async () => {
  m.find.mockResolvedValue(null);
  await expect(resolveAttachmentMessage(url)).rejects.toThrow("unavailable");
  expect(m.sign).not.toHaveBeenCalled();
  await expect(
    resolveAttachmentMessage("https://evil.test/file.pdf"),
  ).rejects.toThrow("Invalid");
});

it("delivers PDFs explicitly as a single download button using a stable URL", async () => {
  m.find.mockResolvedValue({
    storageKey: "ap3k/development/attachments/owner/key",
    mediaType: "FILE",
    filename: "Guide.pdf",
  });
  const message = await resolveAttachmentMessage(url);
  expect(message).toEqual({
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: "Guide.pdf",
        buttons: [{ type: "web_url", title: "Download PDF", url }],
      },
    },
  });
  expect(m.sign).not.toHaveBeenCalled();
});
