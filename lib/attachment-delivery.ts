import { attachmentScopeFilter, attachmentKeyInScope } from "@/lib/attachment-scope";
import { Bucket } from "@upstash/blob";
import { client } from "@/lib/prisma";
import { attachmentId, attachmentPayload } from "@/lib/message-attachment";
/** Mint at send time, so delayed jobs never persist expired storage credentials. */
export async function resolveAttachmentMessage(url?: string | null) {
  const id = attachmentId(url);
  if (!id) throw new Error("Invalid attachment.");
  const file = await client.automationAttachment.findFirst({
    where: { id, status: "READY", ...attachmentScopeFilter() },
    select: { storageKey: true, mediaType: true, filename: true },
  });
  if (!file || !attachmentKeyInScope(file.storageKey))
    throw new Error("Attachment is unavailable.");
  if (file.mediaType === "FILE")
    return attachmentPayload(url, "FILE", file.filename);
  const signed = await Bucket.fromEnv().signedReadUrl(file.storageKey, {
    expiresIn: "10m",
  });
  const message = attachmentPayload(url, file.mediaType);
  message.attachment.payload.url = signed.url;
  return message;
}
