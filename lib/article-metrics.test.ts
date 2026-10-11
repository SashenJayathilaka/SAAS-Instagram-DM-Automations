import { describe, expect, it } from "vitest";
import { articleMetrics } from "./article-metrics";
import { BLOG_POSTS } from "./blog";
import { BLOG_POSTS as SOURCE_POSTS } from "./blog-catalog";
import { SEO_REVISIONS } from "./content/seo-revisions";

describe("revised article metrics", () => {
  it("includes visible examples, bullets and steps without counting link URLs", () => {
    expect(articleMetrics("Two words", [{
      heading: "Heading", paragraphs: ["One paragraph"], bullets: ["One bullet"],
      table: { headers: ["Column"], rows: [["Two words"]] },
      steps: [{ title: "Step", body: "Two words" }],
      links: [{ label: "Documentation", href: "/docs" }],
    }])).toEqual({ wordCount: 13, readingTime: "1 min read" });
    expect(articleMetrics("word ".repeat(221), [])).toEqual({ wordCount: 221, readingTime: "2 min read" });
  });

  it("refreshes revised schema counts while preserving original dates and untouched posts", () => {
    for (const post of BLOG_POSTS) {
      const original = SOURCE_POSTS.find(source => source.slug === post.slug)!;
      expect(post.publishedAt).toBe(original.publishedAt);
      if (SEO_REVISIONS[post.slug]) {
        expect(post.wordCount).toBeGreaterThan(500);
        expect(post.readingTime).toBe(`${Math.ceil(post.wordCount! / 220)} min read`);
      } else {
        expect(post.wordCount).toBe(original.wordCount);
        expect(post.readingTime).toBe(original.readingTime);
        expect(post.updatedAt).toBe(original.updatedAt);
      }
    }
  });
});
