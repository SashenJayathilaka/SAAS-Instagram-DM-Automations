import { describe, expect, it, vi } from "vitest";
import { BLOG_POSTS, getBlogPostsForLocale } from "./blog";
import { COMMENT_DM_POSTS, COMMENT_DM_HUB } from "./content/comment-dm";
import slugs from "./content/comment-dm/slugs.json";
import { AP3K_HELP_ARTICLES } from "./ap3k-help";
import { COMMERCIAL_PAGES } from "./commercial-pages";
import { TUTORIAL_SCREENSHOTS } from "./tutorial-content";
import { getBlogPage, blogPagePath } from "./blog-pagination";
import { localeAlternates, localizePublicPath, resolveRequestLocale, SUPPORTED_LOCALES } from "./i18n/config";
import { buildSitemap as sitemap } from "@/lib/sitemap";
vi.mock("./i18n/server", () => ({ getServerLocale: () => "en" }));
import { localizedMetadata } from "./i18n/page-metadata";

describe("comment-to-DM editorial library", () => {
  it("publishes 50 distinct, complete articles with valid media and internal destinations", () => {
    expect(COMMENT_DM_POSTS).toHaveLength(50);
    expect(slugs).toEqual(COMMENT_DM_POSTS.map(post => post.slug));
    const destinations = new Set(["/pricing", "/resources/instagram-comment-to-dm-templates", "/resources/instagram-comment-automation-checklist", "/tools/instagram-comment-to-dm-calculator", ...BLOG_POSTS.map(post => `/blog/${post.slug}`), ...AP3K_HELP_ARTICLES.map(article => `/help/${article.slug}`), ...COMMERCIAL_PAGES.map(page => `/${page.slug}`)]);
    expect(new Set(COMMENT_DM_POSTS.map(post => post.title)).size).toBe(50);
    expect(new Set(COMMENT_DM_POSTS.map(post => post.description)).size).toBe(50);
    const paragraphs = COMMENT_DM_POSTS.flatMap(post => post.sections.flatMap(section => section.paragraphs));
    expect(new Set(paragraphs).size).toBe(paragraphs.length);
    for (const post of COMMENT_DM_POSTS) {
      expect(post.wordCount).toBeGreaterThan(300);
      expect(post.sections.length).toBeGreaterThanOrEqual(4);
      expect(post.related).toHaveLength(3);
      for (const slug of post.related ?? []) {
        expect(slug).not.toBe(post.slug);
        expect(destinations.has(`/blog/${slug}`), slug).toBe(true);
      }
      for (const section of post.sections) {
        for (const link of section.links ?? []) expect(destinations.has(link.href), link.href).toBe(true);
        if (section.screenshot) expect(TUTORIAL_SCREENSHOTS[section.screenshot]).toBeDefined();
      }
    }
  });
  it("keeps translated guides first for readers using another language", () => {
    expect(getBlogPostsForLocale("en")[0].slug).toBe("manychat-vs-ap3k-pricing-for-instagram");
    for (const locale of SUPPORTED_LOCALES.filter(locale => locale !== "en")) {
      const posts = getBlogPostsForLocale(locale);
      expect(posts.slice(0, 12).every(post => !post.contentLocale)).toBe(true);
      expect(new Set(posts.map(post => post.slug)).size).toBe(BLOG_POSTS.length);
    }
  });
  it("keeps untranslated articles canonical in English across language switches", () => {
    for (const slug of slugs) for (const locale of SUPPORTED_LOCALES) {
      const path = `/blog/${slug}`;
      const prefixed = `/${locale}${path}`;
      expect(localizePublicPath(prefixed + "#section-2", locale)).toBe(path + "#section-2");
      expect(resolveRequestLocale(prefixed, locale)).toBe("en");
      expect(localeAlternates(prefixed)).toEqual({ en: path, "x-default": path });
    }
    const metadata = localizedMetadata({ title: "Instagram Comment to DM Automation: The Practical Guide" }, COMMENT_DM_HUB);
    expect(metadata.alternates?.canonical).toBe(`https://ap3k.com${COMMENT_DM_HUB}`);
    expect(metadata.openGraph).toMatchObject({ locale: "en_US" });
    const entries = sitemap().filter(entry => slugs.some(slug => new URL(entry.url).pathname.endsWith(`/blog/${slug}`)));
    expect(entries).toHaveLength(50);
    expect(entries.every(entry => Object.keys(entry.alternates?.languages ?? {}).length === 2)).toBe(true);
  });
  it("makes every old and new article reachable through bounded, canonical index pages", () => {
    const total = BLOG_POSTS.length;
    const seen: string[] = [];
    const pages = getBlogPage(undefined, total)!.pages;
    for (let page = 1; page <= pages; page++) {
      const range = getBlogPage(String(page), total)!;
      const posts = BLOG_POSTS.slice(range.start, range.end);
      expect(posts.length).toBeGreaterThan(0);
      expect(posts.length).toBeLessThanOrEqual(12);
      seen.push(...posts.map(post => post.slug));
      expect(blogPagePath(page)).toBe(page === 1 ? "/blog" : `/blog?page=${page}`);
    }
    expect(seen).toEqual(BLOG_POSTS.map(post => post.slug));
    for (const value of ["0", "-1", "1.5", "abc", "02", "99999", ["1", "2"]]) expect(getBlogPage(value, total)).toBeNull();
    expect(localizePublicPath(blogPagePath(2), "fr")).toBe("/fr/blog?page=2");
  });
});
