import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog";
import { COMMERCIAL_PAGES } from "@/lib/commercial-pages";

describe("commercial landing pages", () => {
  it("publishes the complete English commercial route set without duplicates", () => {
    expect(COMMERCIAL_PAGES.map((page) => page.slug)).toEqual([
      "instagram-automation-tool",
      "instagram-lead-generation",
      "instagram-automation-for-agencies",
      "instagram-automation-for-local-business",
      "instagram-automation-for-course-creators",
      "instagram-customer-support-automation",
      "instagram-automation-for-real-estate",
      "instagram-dm-automation",
      "instagram-comment-automation",
      "instagram-comment-to-dm",
      "instagram-auto-reply",
      "instagram-story-automation",
      "manychat-alternative",
      "instagram-automation-for-creators",
      "instagram-automation-for-coaches",
      "instagram-automation-for-ecommerce",
    ]);
    expect(new Set(COMMERCIAL_PAGES.map((page) => page.title)).size).toBe(COMMERCIAL_PAGES.length);
  });

  it("gives every page substantive proof, limitations, FAQ, product media, and valid tutorials", () => {
    const blogSlugs = new Set(BLOG_POSTS.map((post) => post.slug));

    for (const page of COMMERCIAL_PAGES) {
      expect(page.description.length).toBeGreaterThan(80);
      expect(page.workflow).toHaveLength(4);
      expect(page.useCases.length).toBeGreaterThanOrEqual(3);
      expect(page.limitations.length).toBeGreaterThanOrEqual(4);
      expect(page.faqs.length).toBeGreaterThanOrEqual(3);
      expect(page.media).toMatch(/^\/images\/docs\/[a-z-]+\.webp$/);
      expect(page.tutorials.every((tutorial) => blogSlugs.has(tutorial.slug))).toBe(true);
    }
  });
});
