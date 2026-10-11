vi.mock("@/components/website/blog-fonts", () => ({ blogSans: {className:"",variable:""}, blogSerif: {variable:""} }));
vi.mock("@/lib/imported-blog-server", () => ({ getImportedArticleHtml: async () => "<p>Imported article</p>" }));
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import en from "./en.json";
import fr from "./fr.json";
import es from "./es.json";
import de from "./de.json";
import pt from "./pt.json";
import intents from "./search-intents.json";
import { translateUi } from "../../i18n/translate";
import { localizePublicPath, type Locale } from "../../i18n/config";
import { buildSitemap as sitemap } from "@/lib/sitemap";
const state = vi.hoisted(() => ({ locale: "en" as Locale }));
vi.mock("@/lib/i18n/server", () => ({ getServerLocale: () => state.locale }));
vi.mock("@/providers/i18n-provider", () => ({ useI18n: () => ({ locale: state.locale }) }));
vi.mock("@/components/global/website-nav", () => ({ default: () => null }));
vi.mock("@/components/global/website-footer", () => ({ default: () => null }));
vi.mock("@/lib/editorial-server", async () => {
  const { BLOG_POSTS } = await import("@/lib/blog");
  return { getPublishedPosts: async () => BLOG_POSTS, getPublishedPost: async (slug: string) => BLOG_POSTS.find(post => post.slug === slug) };
});
import BlogPage, { generateMetadata } from "@/app/(website)/blog/[slug]/page";

describe("localized growth guides", () => {
  it("assigns all 37 search intents to six substantial guides", () => {
    expect(Object.values(intents).flat()).toHaveLength(37);
    expect(new Set(Object.values(intents).flat()).size).toBe(37);
    expect(Object.keys(intents)).toEqual(en.map(post => post.slug));
    for (const post of en) expect(post.sections).toHaveLength(4);
  });
  it("renders authored language copies, source links, conversion actions and correct search metadata", async () => {
    for (const [locale, posts] of Object.entries({ en, fr, es, de, pt })) {
      state.locale = locale as Locale;
      for (const [index, post] of Array.from(posts.entries())) {
        expect(post.slug).toBe(en[index].slug);
        expect(translateUi(en[index].title, state.locale)).toBe(post.title);
        const html = renderToStaticMarkup(await BlogPage({ params: Promise.resolve({ slug: post.slug }) }));
        expect(html).toContain(post.title);
        expect(html).toContain(post.sections[3].paragraphs[0]);
        expect(html).not.toContain("comment-to-dm-example.jpg");
        expect(html).toContain(`href="${localizePublicPath("/pricing", state.locale)}"`);
        if (locale !== "en") expect(html).not.toContain(en[index].intro);
        const metadata = await generateMetadata({ params: Promise.resolve({ slug: post.slug }) });
        const url = `https://ap3k.com${localizePublicPath(`/blog/${post.slug}`, state.locale)}`;
        expect(metadata.alternates?.canonical).toBe(url);
        expect(Object.keys(metadata.alternates?.languages ?? {})).toHaveLength(6);
        expect(metadata.description).toBe(post.description);
        expect(sitemap().find(item => item.url === url)).toBeTruthy();
        expect(html).toContain(`"inLanguage":"${locale}"`);
        if (post.slug === "compare-instagram-dm-automation-tools") expect(html).toContain('href="https://chatfuel.com/instagram"');
      }
    }
  });
});
