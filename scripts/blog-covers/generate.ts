/** Rebuild topic diagrams: node --import tsx scripts/blog-covers/generate.ts */
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { BLOG_POSTS } from '../../lib/blog';
import { buildCoverPlan, renderCoverSvg } from '../../lib/blog-cover-diagram';

async function main() {
  await mkdir('public/images/blog/covers', { recursive: true });
  const manifest: Record<string, { src: string; alt: string }> = {};
  for (const post of BLOG_POSTS) {
    if (post.cover) continue;
    const plan = buildCoverPlan(post);
    const src = `/images/blog/covers/${post.slug}.webp`;
    await sharp(Buffer.from(renderCoverSvg(plan))).webp({ quality: 88 }).toFile(`public${src}`);
    manifest[post.slug] = { src, alt: `${plan.title}: ${plan.items.map(i => i.label).join('; ')}. ${plan.note}` };
  }
  await writeFile('lib/content/blog-cover-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Rendered ${Object.keys(manifest).length} distinct article diagrams.`);
}
main().catch(error => { console.error(error); process.exit(1); });
