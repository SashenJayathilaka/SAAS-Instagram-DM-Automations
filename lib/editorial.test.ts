import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "@/lib/blog";
import {
  editorialSchema,
  mergeEditorialPosts,
  normalizeEditorial,
} from "@/lib/editorial";
import { buildSitemap } from "@/lib/sitemap";

describe("editorial content contracts", () => {
  it("accepts every existing article without losing structured content", () => {
    for (const post of BLOG_POSTS) {
      const result = editorialSchema.safeParse(post);
      expect(
        result.success,
        post.slug + ": " + (!result.success ? result.error.message : ""),
      ).toBe(true);
    }
  });
  it("keeps drafts private, preserves existing articles, and respects unpublishing", () => {
    const base = BLOG_POSTS[0];
    const live = { ...base, title: "A published revision" };
    expect(
      mergeEditorialPosts(
        [base],
        [{ slug: base.slug, published: null, hidden: false }],
      ),
    ).toEqual([base]);
    expect(
      mergeEditorialPosts(
        [],
        [{ slug: "private-draft", published: null, hidden: false }],
      ),
    ).toEqual([]);
    expect(
      mergeEditorialPosts(
        [base],
        [{ slug: base.slug, published: live, hidden: false }],
      ),
    ).toEqual([live]);
    expect(
      mergeEditorialPosts(
        [base],
        [{ slug: base.slug, published: live, hidden: true }],
      ),
    ).toEqual([]);
  });
  it("rejects executable links, protocol-relative URLs, and reserved slugs", () => {
    for (const href of [
      "javascript:alert(1)",
      "//evil.example",
      "/\\evil.example",
      "data:text/html,test",
    ]) {
      expect(
        editorialSchema.safeParse({
          ...BLOG_POSTS[0],
          sections: [
            {
              heading: "Links",
              paragraphs: [],
              links: [{ label: "Link", href }],
            },
          ],
        }).success,
      ).toBe(false);
    }
    expect(
      editorialSchema.safeParse({ ...BLOG_POSTS[0], slug: "new" }).success,
    ).toBe(false);
  });
  it("recalculates editorial timestamps and reading time", () => {
    const post = normalizeEditorial(
      BLOG_POSTS[0],
      new Date("2026-09-23T12:00:00Z"),
    );
    expect(post.updatedAt).toBe("2026-09-23");
    expect(post.wordCount).toBeGreaterThan(0);
    expect(post.readingTime).toMatch(/min read$/);
  });
  it("excludes noindex content and gives new English articles one canonical sitemap entry", () => {
    const base = BLOG_POSTS[0];
    const posts = [
      { ...base, slug: "new-english-article", contentLocale: "en" as const },
      { ...base, slug: "hidden-from-search", noIndex: true },
    ];
    const sitemap = buildSitemap(posts);
    const article = sitemap.filter((page) =>
      page.url.includes("new-english-article"),
    );
    expect(article).toHaveLength(1);
    expect(Object.keys(article[0].alternates?.languages || {})).toEqual([
      "en",
      "x-default",
    ]);
    expect(
      sitemap.some((page) => page.url.includes("hidden-from-search")),
    ).toBe(false);
  });
});
