import sharp from "sharp";
import {
  ATTACHMENT_TYPES,
  validateAttachmentDeclaration,
} from "./message-attachment";
// Inspect actual storage bytes, never the browser-supplied sniff sample.
export async function inspectAttachment(
  body: ReadableStream<Uint8Array>,
  contentType: string,
  expectedSize: number,
) {
  const mediaType = validateAttachmentDeclaration(contentType, expectedSize);
  const reader = body.getReader();
  const prefix = new Uint8Array(4096);
  let total = 0,
    prefixLength = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > expectedSize)
        throw new Error("Attachment size does not match.");
      if (mediaType === "IMAGE") chunks.push(value);
      const take = Math.min(value.length, 4096 - prefixLength);
      if (take > 0) {
        prefix.set(value.subarray(0, take), prefixLength);
        prefixLength += take;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (total !== expectedSize)
    throw new Error("Attachment upload is incomplete.");
  const b = prefix.subarray(0, prefixLength),
    text = new TextDecoder("latin1").decode(b);
  let detected: string | null = null;
  if (
    b[0] === 0x89 &&
    text.slice(1, 4) === "PNG" &&
    b[4] === 13 &&
    b[5] === 10 &&
    b[6] === 26 &&
    b[7] === 10
  )
    detected = "image/png";
  else if (b[0] === 255 && b[1] === 216 && b[2] === 255)
    detected = "image/jpeg";
  else if (/^GIF8[79]a/.test(text)) detected = "image/gif";
  else if (text.startsWith("%PDF-")) detected = "application/pdf";
  else if (text.startsWith("RIFF") && text.slice(8, 12) === "WAVE")
    detected = "audio/wav";
  else if (b[0] === 255 && (b[1] & 0xf6) === 0xf0) detected = "audio/aac";
  else if (text.slice(4, 8) === "ftyp") {
    const brands = text.slice(8, Math.min(64, b.length));
    if (/M4A|M4B/.test(brands)) detected = "audio/mp4";
    else if (/qt  /.test(brands)) detected = "video/quicktime";
    else if (/isom|iso[2-9]|mp4[12]|avc1|M4V/.test(brands))
      detected = "video/mp4";
  }
  const alias =
    contentType === "audio/x-wav"
      ? "audio/wav"
      : contentType === "audio/x-m4a"
        ? "audio/mp4"
        : contentType;
  if (detected !== alias || ATTACHMENT_TYPES[contentType] !== mediaType)
    throw new Error("File contents do not match its format.");
  if (mediaType === "IMAGE") {
    const bytes = Buffer.concat(chunks);
    const decoder = sharp(bytes, {
      animated: true,
      limitInputPixels: 40000000,
      failOn: "error",
    });
    const meta = await decoder.metadata();
    if (!["jpeg", "png", "gif"].includes(meta.format ?? ""))
      throw new Error("Invalid image.");
    await decoder.stats();
  }
  return mediaType;
}
