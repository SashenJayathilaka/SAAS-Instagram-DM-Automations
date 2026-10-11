import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BLOG_POSTS } from "./blog";
import { filterBlogPosts } from "./blog-search";
import { getArticleImage, articleImageUrl } from "./blog-images";
import { COMPARISONS, comparisonPath } from "./comparisons";
import { SOLUTIONS } from "./solutions";
import { buildSitemap } from "./sitemap";
import { PLAN_CARDS, checkoutHref } from "./billing-plans";
import PublicPricing from "@/components/website/public-pricing";

vi.mock("@/providers/i18n-provider", () => ({
  useI18n: () => ({ locale: "en" }),
}));
vi.mock("@/lib/i18n/server", () => ({ getServerLocale: () => "en" }));

describe("public site discovery and billing", () => {
  it("lists all new canonical pages once, without alternate copies of English articles", () => {
    const entries = buildSitemap();
    for (const path of [
      "/compare",
      "/solutions",
      ...COMPARISONS.map(comparisonPath),
      ...SOLUTIONS.map((p) => `/solutions/${p.slug}`),
    ]) {
      expect(
        entries.filter((p) => p.url === `https://ap3k.com${path}`),
      ).toHaveLength(1);
      expect(entries.some((p) => p.url === `https://ap3k.com/fr${path}`)).toBe(
        false,
      );
    }
    expect(
      entries.some((p) => p.url === "https://ap3k.com/compare/manychat"),
    ).toBe(false);
  });
  it("uses real annual checkout prices and links, without changing subscription configuration", () => {
    const html = renderToStaticMarkup(<PublicPricing />);
    expect(html).toContain('href="/sign-up"');
    expect(html).toContain(checkoutHref("PRO", "year").replace("&", "&amp;"));
    expect(html).toContain(
      checkoutHref("BUSINESS", "year").replace("&", "&amp;"),
    );
    for (const plan of PLAN_CARDS.filter((p) => p.id !== "FREE"))
      expect(html).toContain(`$${plan.annualPrice} billed yearly`);
    expect(html).toContain('aria-label="Billing interval"');
  });
  it("searches literal terms across the complete published input and never adds hidden records", () => {
    const sample = BLOG_POSTS.slice(0, 10);
    expect(filterBlogPosts(sample, " ")).toBe(sample);
    expect(filterBlogPosts(sample, "[.*")).toEqual([]);
    const result = filterBlogPosts(
      sample,
      sample[0].title.split(" ").slice(0, 2).join(" ").toUpperCase(),
    );
    expect(result).toContain(sample[0]);
    expect(result.every((p) => sample.includes(p))).toBe(true);
  });
  it("uses consistent article, social and structured-data image URLs", () => {
    for (const post of BLOG_POSTS) {
      const image = getArticleImage(post);
      expect(image.alt.length).toBeGreaterThan(15);
      expect(image.width).toBeGreaterThan(0);
      expect(articleImageUrl(image)).toMatch(
        /^https:\/\/(ap3k\.com|images\.unsplash\.com)\//,
      );
      if (post.cover) expect(image.src).not.toContain("unsplash");
    }
    expect(
      getArticleImage({
        slug: "instagram-content-calendar",
        title: "Content calendar",
        visual: "workflow",
      }).src,
    ).toContain("/api/blog-cover?title=Content%20calendar");
    expect(
      getArticleImage({
        slug: "instagram-ecommerce",
        title: "Ecommerce",
        visual: "workflow",
      }).src,
    ).toContain("/api/blog-cover?title=Ecommerce");
  });
});
