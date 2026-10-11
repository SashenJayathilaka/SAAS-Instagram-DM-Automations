import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { optimizeProductImage } from "./product-image-processing";
describe("product image validation", () => {
  it("decodes PNGs and emits bounded, metadata-free JPEGs", async () => {
    const input = await sharp({ create: { width: 1800, height: 900, channels: 4, background: "#7c3aed" } }).png().withMetadata().toBuffer();
    const output = await optimizeProductImage(input); const meta = await sharp(output).metadata();
    expect(meta.format).toBe("jpeg"); expect(meta.width).toBe(1200); expect(meta.height).toBe(600);
    expect(meta.exif).toBeUndefined(); expect(output.length).toBeLessThanOrEqual(524288);
  });
  it("rejects disguised SVGs, invalid images and oversized bodies", async () => {
    await expect(optimizeProductImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'))).rejects.toThrow();
    await expect(optimizeProductImage(Buffer.from("not a jpeg"))).rejects.toThrow();
    await expect(optimizeProductImage(Buffer.alloc(2 * 1024 * 1024 + 1))).rejects.toThrow();
  });
});
