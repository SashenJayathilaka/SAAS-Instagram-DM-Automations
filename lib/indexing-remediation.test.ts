import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "./blog";
import { BLOG_POSTS as SOURCE_POSTS } from "./blog-catalog";
import { OCTOBER_INDEXING_REVISIONS } from "./content/october-indexing-revisions";
import { DOCS_ARTICLES } from "./docs";
import { PLAN_LIMITS } from "./plan-limits";
import { AP3K_PRICING } from "./billing-plans";
import { buildSitemap } from "./sitemap";
import { existsSync } from "node:fs";
import { TUTORIAL_SCREENSHOTS } from "./tutorial-content";

describe("October indexing remediation", () => {
  it("replaces imported product claims without resetting original publication dates or URLs", () => {
    const urls = buildSitemap();
    for (const slug of Object.keys(OCTOBER_INDEXING_REVISIONS)) {
      const before = SOURCE_POSTS.find(p => p.slug === slug)!;
      const after = BLOG_POSTS.find(p => p.slug === slug)!;
      expect(after.publishedAt).toBe(before.publishedAt);
      expect(after.updatedAt).toBe("2026-10-09");
      expect(after.importedArchive).toBe(false);
      expect(after.wordCount).toBeGreaterThan(350);
      expect(after.noIndex).not.toBe(true);
      expect(urls.find(u => u.url === `https://ap3k.com/blog/${slug}`)?.lastModified).toEqual(new Date("2026-10-09T00:00:00Z"));
      for (const section of after.sections) {
        if (section.screenshot) expect(existsSync(`public/images/docs/${TUTORIAL_SCREENSHOTS[section.screenshot].file}.webp`)).toBe(true);
        for (const link of section.links ?? []) {
          if (link.href.startsWith("/docs/")) expect(DOCS_ARTICLES.some(a => `/docs/${a.slug}` === link.href)).toBe(true);
          if (link.href.startsWith("/blog/")) expect(BLOG_POSTS.some(p => `/blog/${p.slug}` === link.href)).toBe(true);
        }
      }
    }
  });
  it("uses the configured prices and account limits in the docs consumed by the assistant", () => {
    const pricing = DOCS_ARTICLES.find(a => a.slug === "getting-started/ap3k-plans-and-pricing")!;
    expect(pricing.html).toContain(`<td>$${AP3K_PRICING.PRO_MONTHLY}</td>`);
    expect(pricing.html).toContain(`<td>$${AP3K_PRICING.BUSINESS_MONTHLY}</td>`);
    expect(pricing.html).toContain(`up to ${PLAN_LIMITS.BUSINESS.connectedInstagramAccounts} Instagram accounts`);
    expect(pricing.html).not.toMatch(/<td>\$9<|<td>\$29<|ten Instagram/);
    const accounts = DOCS_ARTICLES.find(a => a.slug === "how-tos/add-another-instagram-account")!;
    expect(accounts.html).toContain(`Business supports ${PLAN_LIMITS.BUSINESS.connectedInstagramAccounts}`);
  });
  it("gives the unindexed template guide original selection and verification guidance", () => {
    const article = DOCS_ARTICLES.find(a => a.slug === "post-automation/post-automation-templates")!;
    expect(article.updated).toBe("2026-10-09");
    expect(article.video).toBe(true);
    expect(article.html).not.toMatch(/nine ready-made|gallery has 16/);
    for (const heading of article.headings) expect(article.html).toContain(`id="${heading.id}"`);
    expect(article.html).toContain("eligible inbound interaction");
  });
});
