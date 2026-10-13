import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, it, expect } from 'vitest';
import assignments from './content/blog-photo-assignments.json';
import sources from '../docs/maintenance/blog-photo-sources.json';
import imported from './content/imported-blog/index.json';
import { BLOG_POSTS } from './blog';
import { getArticleImage } from './blog-images';

const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
describe('dedicated blog covers', () => {
  it('keeps every assigned article on its own verified, distinct photo', async () => {
    expect(Object.keys(assignments)).toHaveLength(182);
    expect(Object.keys(sources).sort()).toEqual(Object.keys(assignments).sort());
    const encoded = new Set<string>();
    const pixels = new Set<string>();
    const originals = new Set<string>();
    for (const [slug, photo] of Object.entries(assignments)) {
      const post = BLOG_POSTS.find(p => p.slug === slug);
      expect(post, slug).toBeDefined();
      expect(getArticleImage(post!)).toEqual(photo);
      const source = sources[slug as keyof typeof sources];
      originals.add(source.sourceSha256);
      for (const width of [1600, 800] as const) {
        const bytes = readFileSync(`public${photo.src.replace('.webp', width === 800 ? '-800.webp' : '.webp')}`);
        expect(hash(bytes)).toBe(source[`web${width}Sha256`]);
        const meta = await sharp(bytes).metadata();
        expect([meta.width, meta.height, meta.format]).toEqual([width, width * 9 / 16, 'webp']);
        expect(bytes.length).toBeLessThan(width === 1600 ? 350_000 : 120_000);
        if (width === 1600) {
          encoded.add(hash(bytes));
          pixels.add(hash(await sharp(bytes).resize(32, 18).raw().toBuffer()));
        }
      }
    }
    expect(encoded.size).toBe(182);
    expect(pixels.size).toBe(182);
    expect(originals.size).toBe(182);
  }, 30000);
  it('does not reintroduce decorative photo recycling inside imported bodies', () => {
    for (const post of imported) {
      const html = readFileSync(`lib/content/imported-blog/${post.slug}.html`, 'utf8');
      expect(html).not.toMatch(/<img\b[^>]*\/images\/blog\/(?:original|imported)\//);
    }
  });
});
