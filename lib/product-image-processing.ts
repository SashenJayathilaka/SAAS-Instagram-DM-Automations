import sharp from "sharp";
import { PRODUCT_IMAGE_UPLOAD_LIMIT, PRODUCT_IMAGE_STORED_LIMIT } from "@/lib/product-card";

export async function optimizeProductImage(input: Buffer): Promise<Buffer> {
  if (!input.length || input.length > PRODUCT_IMAGE_UPLOAD_LIMIT) throw new Error("Image upload is too large.");
  const image = sharp(input, { limitInputPixels: 25_000_000, failOn: "error" });
  const meta = await image.metadata();
  if (!["jpeg", "png"].includes(meta.format ?? "") || (meta.pages ?? 1) > 1) throw new Error("Upload a PNG or JPEG image.");
  // Decode and re-encode: strips metadata and ignores a forged MIME type/extension.
  const output = await image.rotate().resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  if (output.length <= PRODUCT_IMAGE_STORED_LIMIT) return output;
  const smaller = await sharp(output).resize(900, 900, { fit: "inside" }).jpeg({ quality: 68, mozjpeg: true }).toBuffer();
  if (smaller.length > PRODUCT_IMAGE_STORED_LIMIT) throw new Error("Choose a less detailed product image.");
  return smaller;
}
