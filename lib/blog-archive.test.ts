import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "./blog";
import { getEditorialArchive, blogPaginationItems, getBlogDirectory } from "./blog-archive";
import { buildSitemap } from "./sitemap";
import { getBlogPage } from "./blog-pagination";

describe("editorial archive", () => {
  it("links every eligible guide in the directory without exposing hidden CMS or noindex entries", () => {
    const supplied = BLOG_POSTS.slice(1).concat({ ...BLOG_POSTS[0], slug: "noindex-test", noIndex: true });
    const listed = getBlogDirectory(supplied).flatMap(group => group.articles.map(post => post.slug));
    expect(new Set(listed).size).toBe(listed.length);
    expect(getBlogDirectory(supplied).length).toBeLessThanOrEqual(8);
    expect(new Set(listed)).toEqual(new Set(supplied.filter(post => !post.noIndex).map(post => post.slug)));
    expect(listed).not.toContain(BLOG_POSTS[0].slug);
    expect(listed).not.toContain("noindex-test");
  });
  it("keeps every indexable published article reachable exactly once across archive pages", () => {
    const { featured, posts } = getEditorialArchive(BLOG_POSTS);
    const seen: string[] = [];
    const pages = getBlogPage(undefined, posts.length)!.pages;
    for (let page = 1; page <= pages; page++) {
      const range = getBlogPage(String(page), posts.length)!;
      const visible = posts.slice(range.start, range.end);
      if (page < pages) expect(visible).toHaveLength(9);
      seen.push(...visible.map(p => p.slug));
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toContain("ap3k-workspace-visual-guide");
    expect(seen).toContain("comment-to-dm-button-labels");
    expect(BLOG_POSTS.some(p => p.slug === "ap3k-workspace-visual-guide")).toBe(true);
    expect(new Set(seen)).toEqual(new Set(BLOG_POSTS.filter(p => !p.noIndex).map(p => p.slug)));
    expect(posts.map(p => p.publishedAt)).toEqual(posts.map(p => p.publishedAt).sort().reverse());
  });
  it("finds original guides by search and excludes deliberately noindexed posts", () => {
    expect(getEditorialArchive(BLOG_POSTS, "button labels").posts.some(p => p.slug === "comment-to-dm-button-labels")).toBe(true);
    const hidden = { ...BLOG_POSTS[0], slug: "excluded", noIndex: true };
    expect(getEditorialArchive([hidden]).posts).toEqual([]);
  });
  it("only puts valid editorial archive pages in the sitemap", () => {
    const total = getEditorialArchive(BLOG_POSTS).posts.length;
    const pages = buildSitemap(BLOG_POSTS).filter(p => new URL(p.url).pathname === "/blog" && new URL(p.url).searchParams.has("page"));
    expect(pages).toHaveLength(getBlogPage(undefined, total)!.pages - 1);
    for (const page of pages) expect(getBlogPage(new URL(page.url).searchParams.get("page")!, total)).not.toBeNull();
  });
  it("searches featured posts and respects the published collection passed by the CMS", () => {
    const { featured } = getEditorialArchive(BLOG_POSTS);
    expect(getEditorialArchive(BLOG_POSTS, featured[0].title).posts).toContain(featured[0]);
    const hidden = featured[0].slug;
    const result = getEditorialArchive(BLOG_POSTS.filter(p => p.slug !== hidden));
    expect([...result.posts, ...result.featured].some(p => p.slug === hidden)).toBe(false);
    expect(result.featured).toHaveLength(4);
  });
  it("features maintained setup, message, comparison and troubleshooting guides", () => {
    const { featured } = getEditorialArchive(BLOG_POSTS);
    expect(featured.map(post => post.slug)).toEqual([
      "instagram-next-post-automation",
      "instagram-automation-link-tracking",
      "instagram-comment-to-dm-automation",
      "comment-to-dm-final-message-templates",
    ]);
    expect(featured.every(post => !post.importedArchive && !post.noIndex)).toBe(true);
    const excluded = featured.map(post => ({ ...post, noIndex: true }));
    expect(getEditorialArchive(excluded).featured).toEqual([]);
  });
  it("bounds page controls and always includes the current page and endpoints", () => {
    for (let page = 1; page <= 100; page++) {
      const items = blogPaginationItems(page, 100);
      expect(items).toContain(1);
      expect(items).toContain(100);
      expect(items).toContain(page);
      expect(items.length).toBeLessThanOrEqual(7);
    }
    expect(blogPaginationItems(1, 1)).toEqual([1]);
  });
});
