import { describe, expect, it } from "vitest";
import { BLOG_POSTS, LEGACY_BLOG_POSTS, getBlogPost } from "./blog";

describe("AP3K blog content", () => {
  it("keeps every article slug unique and discoverable", () => {
    const slugs = BLOG_POSTS.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(BLOG_POSTS.length).toBeGreaterThanOrEqual(11);
    for (const slug of slugs) expect(getBlogPost(slug)?.slug).toBe(slug);
  });

  it("provides complete SEO and visual metadata", () => {
    for (const post of LEGACY_BLOG_POSTS) {
      expect(post.title.length).toBeGreaterThan(20);
      expect(post.description.length).toBeGreaterThan(80);
      expect(post.description.length).toBeLessThanOrEqual(170);
      expect(post.keywords.length).toBeGreaterThanOrEqual(3);
      expect(post.visualAlt.length).toBeGreaterThan(30);
      expect(post.visualCaption.length).toBeGreaterThan(30);
      expect(post.sections.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("includes actionable numbered tutorials in the new content cluster", () => {
    const tutorials = LEGACY_BLOG_POSTS.filter((post) => post.publishedAt === "2026-08-30");
    expect(tutorials).toHaveLength(6);
    for (const post of tutorials) {
      const hasStepCards = post.sections.some((section) => section.steps && section.steps.length >= 4);
      const hasNumberedChecklist = post.sections.filter((section) => /^\d+\./.test(section.heading)).length >= 4;
      expect(hasStepCards || hasNumberedChecklist).toBe(true);
    }
  });
});
