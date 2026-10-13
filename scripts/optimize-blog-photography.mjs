import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error('Pass the directory containing the source PNG files.');
const sources = JSON.parse(await fs.readFile('docs/maintenance/blog-photo-sources.json', 'utf8'));
const assignments = JSON.parse(await fs.readFile('lib/content/blog-photo-assignments.json', 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [slug, source] of Object.entries(sources)) {
  const bytes = await fs.readFile(path.join(sourceDirectory, source.sourceFile));
  if (hash(bytes) !== source.sourceSha256) throw new Error(`Source hash mismatch: ${slug}`);
  const metadata = await sharp(bytes).metadata();
  source.sourceWidth = metadata.width;
  source.sourceHeight = metadata.height;
  for (const width of [1600, 800]) {
    const output = `public${assignments[slug].src.replace('.webp', width === 800 ? '-800.webp' : '.webp')}`;
    const optimized = await sharp(bytes).resize(width, width * 9 / 16, { fit: 'cover' }).webp({ quality: 82, effort: 5 }).toBuffer();
    await fs.writeFile(output, optimized);
    source[`web${width}Sha256`] = hash(optimized);
  }
}
await fs.writeFile('docs/maintenance/blog-photo-sources.json', JSON.stringify(sources, null, 2) + '\n');
console.log(`Optimized ${Object.keys(assignments).length} dedicated covers at 1600px and 800px.`);
