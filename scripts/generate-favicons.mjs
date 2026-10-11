import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Keep every browser/search icon derived from the same opaque vector source.
const root = new URL("../", import.meta.url);
const source = await readFile(new URL("app/icon.svg", root));
await sharp(source).resize(512, 512).png().toFile(new URL("app/icon.png", root).pathname);
await sharp(source).resize(180, 180).png().toFile(new URL("app/apple-icon.png", root).pathname);
await writeFile(new URL("public/brand/ap3k-favicon.svg", root), source);

// ICO directory entries point to lossless PNG frames, including a larger search icon.
const sizes = [16, 32, 48, 64, 256];
const frames = await Promise.all(sizes.map((size) => sharp(source).resize(size, size).png().toBuffer()));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index] % 256;
  directory[entry + 1] = sizes[index] % 256;
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(new URL("app/favicon.ico", root), Buffer.concat([directory, ...frames]));
