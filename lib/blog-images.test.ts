import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BLOG_POSTS } from './blog';
import { articleImageUrl, getArticleImage } from './blog-images';
import { EDITORIAL_PHOTOS, editorialPhoto } from './blog-photography';
import { TUTORIAL_SCREENSHOTS, tutorialImageSrc } from './tutorial-content';

describe('original AP3K blog photography', () => {
  it('replaces every catalog cover and metadata image with a local original scene', () => {
    for (const post of BLOG_POSTS) {
      const image = getArticleImage(post);
      expect(image.src).toMatch(/^\/images\/blog\/original\/ap3k-[a-z0-9-]+\.webp$/);
      expect(image.alt.length).toBeGreaterThan(30);
      expect(articleImageUrl(image)).toBe(`https://ap3k.com${image.src}`);
    }
  });
  it('keeps 4K exports separate from bounded responsive web assets', async () => {
    for (const key of Object.keys(EDITORIAL_PHOTOS) as (keyof typeof EDITORIAL_PHOTOS)[]) {
      const image = editorialPhoto(key);
      for (const [path, width, height, budget] of [
        [`public${image.src}`, 1600, 900, 300_000],
        [`public${image.src.replace('.webp', '-800.webp')}`, 800, 450, 100_000],
        [`assets/blog/masters/ap3k-${key}-4k.webp`, 3840, 2160, 2_000_000],
      ] as const) {
        const bytes = await readFile(path);
        const metadata = await sharp(bytes).metadata();
        expect(metadata.format).toBe('webp');
        expect([metadata.width, metadata.height]).toEqual([width, height]);
        expect(bytes.length, path).toBeLessThan(budget);
      }
    }
  });
  it('retains real product captures in tutorial sections', async () => {
    for (const post of BLOG_POSTS) for (const section of post.sections) {
      if (!section.screenshot) continue;
      expect(TUTORIAL_SCREENSHOTS[section.screenshot]).toBeDefined();
      expect((await readFile(`public${tutorialImageSrc(section.screenshot)}`)).length).toBeGreaterThan(0);
    }
  });
  it('uses a safe static fallback for unrecognized CMS titles and slugs', () => {
    const image = getArticleImage({ slug: '__proto__', title: '<script>bad</script>'.repeat(300), visual: 'workflow' });
    expect(image.src).toBe('/images/blog/original/ap3k-conversation.webp');
    expect(image.alt).not.toContain('<script>');
  });
});
