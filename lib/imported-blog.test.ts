import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import imported from './content/imported-blog/index.json';
import covers from './content/imported-blog/covers.json';
import redirects from './content/imported-blog/redirects.json';
import { BLOG_POSTS } from './blog';
import { getEditorialArchive } from './blog-archive';
import { getBlogPage } from './blog-pagination';

describe('supplied blog archive migration', () => {
  it('uses AP3K authorship and branding throughout published article content', () => {
    for (const post of imported) {
      expect(post.author).toBe('AP3K');
      expect(JSON.stringify(post)).not.toMatch(/link\s*to\s*dm/i);
      const html = readFileSync(`lib/content/imported-blog/${post.slug}.html`, 'utf8');
      expect(html).not.toMatch(/link\s*to\s*dm|salesmorph/i);
      expect(html).not.toMatch(/AP3K is (?:a )?(?:verified )?Meta Business Partner/i);
    }
    for (const destination of Object.values(redirects)) {
      expect(imported.some(post => post.slug === destination)).toBe(true);
    }
  });
  it('keeps imported articles discoverable alongside original guides', () => {
    const archive = getEditorialArchive(BLOG_POSTS);
    expect(archive.posts.filter(p => imported.some(source => source.slug === p.slug)).map(p => p.slug).sort()).toEqual(imported.map(p => p.slug).sort());
    expect(new Set(archive.posts.map(p => p.slug)).size).toBe(archive.posts.length);
    expect(getBlogPage(undefined, archive.posts.length)?.pages).toBe(Math.ceil(archive.posts.length / 9));
    expect(archive.featured).toHaveLength(4);
  });
  it('uses a distinct, present cover for every imported article', () => {
    const images = Object.values(covers);
    expect(images).toHaveLength(175);
    const hashes = images.map(image => createHash('sha256').update(readFileSync(`public${image.src}`)).digest('hex'));
    expect(new Set(hashes).size).toBe(175);
  });
  it('retains substantial bodies and only local existing image assets, without active imported code', () => {
    for (const post of imported) {
      const html = readFileSync(`lib/content/imported-blog/${post.slug}.html`, 'utf8');
      expect(post.wordCount, post.slug).toBeGreaterThan(150);
      expect(html).not.toMatch(/<(script|form|object|embed)\b|\son\w+=|javascript:/i);
      for (const [, src] of Array.from(html.matchAll(/<iframe[^>]+src="([^"]+)"/g))) {
        expect(src).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}$/);
      }
      for (const [, src] of Array.from(html.matchAll(/<img[^>]+src="([^"]+)"/g))) {
        expect(src).toMatch(/^\/images\/(blog\/imported\/[a-f0-9]+|docs\/[a-z-]+)\.webp$/);
        expect(existsSync(`public${src}`), `${post.slug}: ${src}`).toBe(true);
      }
      for (const [, slug] of Array.from(html.matchAll(/href="\/blog\/([^"#?]+)/g))) {
        expect(BLOG_POSTS.some(p => p.slug === slug), `${post.slug}: ${slug}`).toBe(true);
      }
    }
  });
});
