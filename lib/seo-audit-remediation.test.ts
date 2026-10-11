import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { blogArchiveCopy } from './blog-archive-metadata';
import { BLOG_POSTS } from './blog';
import { getEditorialArchive } from './blog-archive';
import { getArticleImage } from './blog-images';
import { buildSitemap } from './sitemap';
import { HOME_FAQ } from './i18n/home-faq';
import { HOME_FEATURES_COPY } from './i18n/home-features';
import { SUPPORTED_LOCALES, localeAlternates, localizePublicPath } from './i18n/config';
import { COMMERCIAL_PAGES } from './commercial-pages';
import { translateUi } from './i18n/translate';
import { DOCS_ARTICLES } from './docs';

describe('evidence-based SEO remediation', () => {
  it('uses unique, native archive metadata for all five languages', () => {
    const copies = SUPPORTED_LOCALES.map(locale => blogArchiveCopy(locale));
    expect(new Set(copies.map(c => c.title)).size).toBe(5);
    expect(new Set(copies.map(c => c.description)).size).toBe(5);
    for (const locale of SUPPORTED_LOCALES) {
      expect(blogArchiveCopy(locale, 2).title).toContain('2');
      expect(blogArchiveCopy(locale, 2).description).not.toBe(blogArchiveCopy(locale).description);
      expect(blogArchiveCopy(locale).description.length).toBeGreaterThan(90);
    }
  });
  it('preserves the main guide URL and replaces the contradictory imported body', () => {
    const post = BLOG_POSTS.find(p => p.slug === 'instagram-comment-to-dm-automation')!;
    expect(post.importedArchive).toBe(false);
    expect(post.contentLocale).toBe('en');
    expect(post.updatedAt).toBe('2026-10-05');
    expect(post.sections).toHaveLength(8);
    expect(post.sections.every(s => s.paragraphs.join(' ').length > 200)).toBe(true);
    expect(JSON.stringify(post)).not.toContain('It does not backtrack');
    expect(post.sections.some(s => s.heading.includes('real delivery test'))).toBe(true);
    expect(getEditorialArchive(BLOG_POSTS).posts.filter(p => p.slug === post.slug)).toHaveLength(1);
    const image = getArticleImage(post);
    expect(image.src).toBe('/images/docs/automations.webp');
    expect(existsSync(`public${image.src}`)).toBe(true);
  });
  it('uses actual public routes for the revised guide, not invented destinations', () => {
    const post = BLOG_POSTS.find(p => p.slug === 'instagram-comment-to-dm-automation')!;
    const urls = new Set(buildSitemap().map(p => new URL(p.url).pathname));
    for (const section of post.sections) {
      for (const link of section.links || []) {
        expect(urls.has(link.href), link.href).toBe(true);
        if (link.href.startsWith('/docs/')) expect(DOCS_ARTICLES.some(a => '/docs/'+a.slug === link.href)).toBe(true);
      }
    }
  });
  it('includes an English-only identity page with a reciprocal canonical', () => {
    const pages = buildSitemap();
    expect(pages.filter(p => new URL(p.url).pathname.endsWith('/about'))).toHaveLength(1);
    expect(localeAlternates('/about')).toEqual({ en: '/about', 'x-default': '/about' });
    for (const locale of SUPPORTED_LOCALES) expect(localizePublicPath('/about', locale)).toBe('/about');
  });
  it('updates collection freshness without changing unrelated article dates', () => {
    const pages = buildSitemap();
    expect(pages.find(p => p.url === 'https://ap3k.com/blog')?.lastModified).toEqual(new Date('2026-10-11T00:00:00Z'));
    expect(pages.find(p => p.url === 'https://ap3k.com/blog/comment-to-dm-one-post-vs-all-posts')?.lastModified).toEqual(new Date('2026-09-21T00:00:00Z'));
    const changed = BLOG_POSTS.map(p => p.slug === 'instagram-comment-to-dm-automation' ? { ...p, updatedAt: '2026-10-12' } : p);
    expect(buildSitemap(changed).find(p => p.url === 'https://ap3k.com/blog?page=2')?.lastModified).toEqual(new Date('2026-10-12T00:00:00Z'));
  });
  it('keeps backtracking and Business capacity accurate in all homepage languages', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(HOME_FAQ[locale].items[2][1]).toContain('6');
      expect(HOME_FAQ[locale].items[8][1].length).toBeGreaterThan(150);
      expect(HOME_FEATURES_COPY[locale].cards[3].description).not.toMatch(/preview|vorschau|pré-visualização|aperçu|vista previa/i);
    }
    const page = COMMERCIAL_PAGES.find(p => p.slug === 'instagram-comment-to-dm')!;
    const limitation = page.limitations.find(s => s.includes('Backtrack comments'))!;
    expect(limitation).toBeTruthy();
    for (const locale of SUPPORTED_LOCALES.filter(l => l !== 'en')) expect(translateUi(limitation, locale)).not.toBe(limitation);
  });
  it('preloads a stable hero image and gates decorative video, preserving animation', () => {
    const source = readFileSync('components/website/home-hero.tsx', 'utf8');
    expect(source).toContain('comment-water-drop-poster.webp');
    expect(source).toContain('priority unoptimized');
    expect(source).toContain('motionReady && reducedMotion === false');
    expect(source).toContain('window.addEventListener("pointerdown"');
    expect(source).toContain('window.removeEventListener("pointerdown"');
    expect(source).toContain('copy.titleTop}{" "}');
  });
});
