export type AttachmentType = "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
export type MessageAttachment = {
  id: string;
  url: string;
  name: string;
  mediaType: AttachmentType;
  size?: number;
};
export const ATTACHMENT_TYPES: Record<string, AttachmentType> = {
  "image/png": "IMAGE",
  "image/jpeg": "IMAGE",
  "image/gif": "IMAGE",
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
  "audio/aac": "AUDIO",
  "audio/mp4": "AUDIO",
  "audio/x-m4a": "AUDIO",
  "audio/wav": "AUDIO",
  "audio/x-wav": "AUDIO",
  "application/pdf": "FILE",
};
export const ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,.gif,.mp4,.mov,.aac,.m4a,.wav,.pdf";
export function normalizeAttachmentType(type?: string | null): AttachmentType {
  return type === "VIDEO" || type === "AUDIO" || type === "FILE"
    ? type
    : "IMAGE";
}
export function attachmentId(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.origin === "https://ap3k.com" && !u.search && !u.hash
      ? (/^\/media\/attachments\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.exec(
          u.pathname,
        )?.[1] ?? null)
      : null;
  } catch {
    return null;
  }
}
export function attachmentUrl(id: string) {
  return `https://ap3k.com/media/attachments/${id}`;
}
export function attachmentLimit(type: AttachmentType) {
  return (type === "IMAGE" ? 8 : 25) * 1000 * 1000;
}
export function validateAttachmentDeclaration(type: string, size: number) {
  const mediaType = ATTACHMENT_TYPES[type];
  if (!mediaType)
    throw new Error("Choose PNG, JPG, GIF, MP4, MOV, AAC, M4A, WAV or PDF.");
  if (
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > attachmentLimit(mediaType)
  )
    throw new Error(
      mediaType === "IMAGE"
        ? "Images must be no larger than 8MB."
        : "Attachments must be no larger than 25MB.",
    );
  return mediaType;
}
export function attachmentPayload(
  url?: string | null,
  type?: string | null,
  name = "Your PDF is ready.",
): {
  attachment: {
    type: "image" | "video" | "audio" | "template";
    payload: Record<string, unknown>;
  };
} {
  if (!attachmentId(url)) throw new Error("Choose a saved attachment.");
  if (type === "FILE")
    return {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: name.slice(0, 80),
          buttons: [{ type: "web_url", title: "Download PDF", url }],
        },
      },
    };
  return {
    attachment: {
      type: ({ IMAGE: "image", VIDEO: "video", AUDIO: "audio" } as const)[
        normalizeAttachmentType(type) as "IMAGE" | "VIDEO" | "AUDIO"
      ],
      payload: { url, is_reusable: true },
    },
  };
}
