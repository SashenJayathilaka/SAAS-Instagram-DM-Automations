import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BLOG_POSTS } from './blog';
import importedPosts from './content/imported-blog/index.json';
import { articleImageUrl, getArticleImage } from './blog-images';
import { buildCoverPlan, renderCoverSvg } from './blog-cover-diagram';
import { tutorialImageSrc } from './tutorial-content';

describe('article-specific covers', () => {
  it('uses decodable local editorial photos with descriptive alt text for the archive', async () => {
    const posts = BLOG_POSTS.filter(post => !post.cover && post.importedArchive);
    const images = posts.map(getArticleImage);
    // A revised original guide uses a real AP3K screenshot instead of archive art.
    expect(posts.map(p => p.slug).sort()).toEqual(importedPosts.filter(p => BLOG_POSTS.some(current => current.slug === p.slug && current.importedArchive && !current.cover)).map(p => p.slug).sort());
    expect(new Set(images.map(image => image.src)).size).toBe(posts.length);
    for (const image of images) {
      expect(image.src).toMatch(/^\/images\/(blog\/imported\/[a-f0-9]+|docs\/[a-z-]+)\.webp$/);
      expect(image.alt.length).toBeGreaterThan(20);
      expect(articleImageUrl(image)).toBe(`https://ap3k.com${image.src}`);
    }
    const hashes = await Promise.all(Array.from(new Set(images.map(i => i.src))).map(async src => {
      const bytes = await readFile(`public${src}`);
      const metadata = await sharp(bytes).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.width).toBeGreaterThan(100);
      return createHash('sha256').update(bytes).digest('hex');
    }));
    expect(new Set(hashes).size).toBe(posts.length);
  });
  it('keeps real tutorial screenshots instead of manufacturing product screens', () => {
    for (const post of BLOG_POSTS.filter(post => post.cover)) {
      expect(getArticleImage(post).src).toBe(tutorialImageSrc(post.cover!));
    }
  });
  it('uses the actual time-zone and handoff lessons without claiming AP3K publishes posts', () => {
    const timezone = buildCoverPlan(BLOG_POSTS.find(post => post.slug === 'instagram-scheduling-time-zone-checklist')!);
    expect(timezone.kind).toBe('clocks');
    expect(timezone.items.map(item => item.label)).toEqual(['AUDIENCE TIME', 'PUBLISHING TIME', 'VERIFY']);
    const handoff = buildCoverPlan(BLOG_POSTS.find(post => post.slug === 'instagram-scheduler-launch-handoff')!);
    expect(handoff.note).toContain('Publishing tool → launch owner → AP3K reply campaign');
  });
  it('keeps three-column thumbnails concise without clipped paragraph excerpts', () => {
    for (const post of BLOG_POSTS.filter(post => !post.cover && !post.importedArchive && post.publishedAt !== '2026-10-01')) {
      const plan = buildCoverPlan(post);
      if (!['flow', 'decision', 'lifecycle'].includes(plan.kind)) continue;
      for (const step of plan.items) {
        expect(step.label, post.slug).not.toContain('…');
        expect(step.detail, post.slug).not.toContain('…');
        expect(step.detail.length, post.slug).toBeLessThanOrEqual(27);
      }
    }
  });
  it('gives new CMS posts a bounded, encoded cover URL and escapes diagram text', () => {
    const post = { slug: '__proto__', title: '<script> & "New topic"', visual: 'workflow' as const };
    const image = getArticleImage(post);
    expect(image.src).toContain('/api/blog-cover?title=%3Cscript%3E');
    const plan = buildCoverPlan(post);
    expect(renderCoverSvg({ ...plan, title: post.title })).not.toContain('<script>');
    expect(renderCoverSvg({ ...plan, title: post.title })).toContain('&lt;script&gt;');
    const long = getArticleImage({ ...post, title: 'x'.repeat(900) });
    expect(new URL(long.src, 'https://ap3k.com').searchParams.get('title')!.length).toBe(160);
  });
});
