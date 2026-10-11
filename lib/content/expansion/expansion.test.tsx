import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BLOG_POSTS } from "@/lib/blog";
import { COMMERCIAL_PAGES } from "@/lib/commercial-pages";
import { EXPANSION_CLUSTERS, EXPANSION_POSTS } from "./index";
import { EXPANSION_COMMERCIAL_PAGES } from "./commercial";
import slugs from "./slugs.json";
import { buildSitemap } from "@/lib/sitemap";
import { localeAlternates, localizePublicPath, resolveRequestLocale, SUPPORTED_LOCALES } from "@/lib/i18n/config";
const state = vi.hoisted(() => ({ hidden: "", title: "", locale: "fr" }));
vi.mock("@/lib/i18n/server", () => ({ getServerLocale: () => state.locale }));
// Next transforms font loaders during builds; supply their class names in Node tests.
vi.mock("next/font/google", () => ({ Inter: () => ({ className: "font-inter" }) }));
vi.mock("next/font/local", () => ({ default: () => ({ className: "font-local" }) }));
vi.mock("@/components/global/website-nav", () => ({ default: () => null }));
vi.mock("@/components/global/website-footer", () => ({ default: () => null }));
vi.mock("@/lib/editorial-server", () => ({ getPublishedPosts: async () => BLOG_POSTS.filter(p=>p.slug!==state.hidden).map(p=>state.title && p.slug===EXPANSION_POSTS[1].slug ? {...p,title:state.title} : p) }));
import GrowthLibrary from "@/app/(website)/resources/instagram-growth-library/page";
import { generateMetadata } from "@/app/(website)/[slug]/page";

describe("growth content release", () => {
  it("adds exactly 100 distinct authored intents without colliding with existing URLs", () => {
    expect(EXPANSION_POSTS).toHaveLength(100);
    expect(new Set(BLOG_POSTS.map(p=>p.slug)).size).toBe(BLOG_POSTS.length);
    expect(new Set(slugs)).toEqual(new Set(EXPANSION_POSTS.map(p=>p.slug)));
    expect(new Set(EXPANSION_POSTS.map(p=>p.title)).size).toBe(100);
    for (const field of ["intro","decision","example","pitfall","measure"] as const) {
      const values=EXPANSION_CLUSTERS.flatMap(c=>c.posts.map(p=>p[field]));
      expect(new Set(values).size).toBe(100);
    }
    const destinations=new Set(["/pricing","/blog",...BLOG_POSTS.map(p=>`/blog/${p.slug}`),...COMMERCIAL_PAGES.map(p=>`/${p.slug}`)]);
    for (const p of EXPANSION_POSTS) {
      expect(p.wordCount).toBeGreaterThan(250);
      expect(p.sections.some(s=>s.steps?.length===3)).toBe(true);
      expect(p.description.length).toBeLessThanOrEqual(170);
      for(const s of p.sections) for(const l of s.links??[]) expect(destinations.has(l.href),l.href).toBe(true);
      for(const related of p.related??[]) expect(destinations.has(`/blog/${related}`)).toBe(true);
    }
    for(const p of EXPANSION_COMMERCIAL_PAGES) for(const t of p.tutorials) expect(destinations.has(`/blog/${t.slug}`)).toBe(true);
  });
  it("keeps all new pages English-canonical, discoverable and free of invented language alternates", async () => {
    const entries=buildSitemap();
    const paths=[...EXPANSION_POSTS.map(p=>`/blog/${p.slug}`),...EXPANSION_COMMERCIAL_PAGES.map(p=>`/${p.slug}`)];
    for(const path of paths) {
      for(const locale of SUPPORTED_LOCALES) {
        expect(localizePublicPath(path,locale)).toBe(path);
        expect(resolveRequestLocale(path,locale)).toBe("en");
      }
      expect(localeAlternates(path)).toEqual({en:path,"x-default":path});
      expect(entries.filter(e=>new URL(e.url).pathname===path)).toHaveLength(1);
      expect(entries.some(e=>new URL(e.url).pathname===`/fr${path}`)).toBe(false);
    }
    for(const p of EXPANSION_COMMERCIAL_PAGES) {
      const metadata=await generateMetadata({params:Promise.resolve({slug:p.slug})});
      expect(metadata.alternates?.canonical).toBe(`https://ap3k.com/${p.slug}`);
      expect(metadata.openGraph).toMatchObject({locale:"en_US"});
    }
  });
  it("retires the old library in favor of the blog", () => {
    expect(buildSitemap().some(e => e.url.includes('/resources/instagram-growth-library'))).toBe(false);
  });
});
