import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { buildSitemap as sitemap } from "@/lib/sitemap";
import robots from "@/app/robots";
import { SUPPORTED_LOCALES, isEnglishOnlyArticle, localizePublicPath, stripLocaleFromPath } from "@/lib/i18n/config";

describe("public indexing contracts", () => {
  it("lists unique public URLs with complete reciprocal language alternates", () => {
    const pages = sitemap();
    const urls = new Set(pages.map(page => page.url));
    expect(urls.size).toBe(pages.length);
    for (const page of pages) {
      const parsed = new URL(page.url);
      const path = stripLocaleFromPath(`${parsed.pathname}${parsed.search}`);
      expect(path).not.toMatch(/^\/(api|dashboard|admin|sign-in|sign-up|payment)(\/|$)/);
      for (const locale of isEnglishOnlyArticle(path) ? ["en"] as const : SUPPORTED_LOCALES) {
        const expected = `https://ap3k.com${localizePublicPath(path, locale)}`;
        expect(page.alternates?.languages?.[locale]).toBe(expected);
        expect(urls.has(expected)).toBe(true);
      }
      expect(page.alternates?.languages?.['x-default']).toBe(`https://ap3k.com${path}`);
    }
  });
  it("lists every canonical blog archive page and keeps article dates truthful", () => {
    const pages = sitemap();
    for (const locale of SUPPORTED_LOCALES) {
      for (let page = 2; page <= 6; page++) {
        const prefix = locale === "en" ? "" : `/${locale}`;
        expect(pages.some(item => item.url === `https://ap3k.com${prefix}/blog?page=${page}`)).toBe(true);
      }
    }
    const hub = pages.find(item => item.url === "https://ap3k.com/blog/instagram-comment-to-dm-automation");
    expect(hub?.lastModified).toEqual(new Date("2026-10-05T00:00:00Z"));
    const unchanged = pages.find(item => item.url === "https://ap3k.com/blog/comment-to-dm-one-post-vs-all-posts");
    expect(unchanged?.lastModified).toEqual(new Date("2026-09-21T00:00:00Z"));
  });
  it("lets crawlers see noindex on authentication pages", () => {
    const rules = robots().rules;
    for (const rule of Array.isArray(rules) ? rules : [rules]) {
      const blocked = [rule.disallow].flat().filter(Boolean) as string[];
      for (const path of ['/sign-in', '/sign-up', '/sign-in/factor-one', '/fr/sign-up']) {
        expect(blocked.some(prefix => path.startsWith(prefix))).toBe(false);
      }
    }
    const authLayout = fs.readFileSync('app/(auth)/layout.tsx', 'utf8');
    expect(authLayout).toContain('index: false');
    expect(authLayout).toContain('googleBot: { index: false');
    expect(authLayout).toContain('canonical: null');
  });
});

it("allows product-card image retrieval without publishing private route names", () => {
  const rules = [robots().rules].flat();
  const rule = rules.find(rule => [rule.userAgent].flat().includes("*"))!;
  const allowed = [rule.allow].flat().filter(Boolean) as string[];
  const blocked = [rule.disallow].flat().filter(Boolean) as string[];
  const canFetch = (path: string) => Math.max(...allowed.filter(p => path.startsWith(p)).map(p => p.length), -1) >= Math.max(...blocked.filter(p => path.startsWith(p)).map(p => p.length), -1);
  expect(canFetch('/api/automation-images/11111111-1111-4111-8111-111111111111')).toBe(true);
  expect(blocked).toEqual([]);
  expect(allowed).toEqual(['/']);
  expect(robots().sitemap).toEqual(['https://ap3k.com/sitemap.xml', 'https://ap3k.com/video-sitemap.xml']);
});
