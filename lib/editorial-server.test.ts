import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ posts: [{ slug: "guide", title: "Original", publishedAt: "2026-09-21" }], rows: [] as { slug: string; published: unknown; hidden: boolean }[], reads: 0 }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: () => Promise<unknown>) => { let cached: Promise<unknown> | undefined; return () => cached ??= fn(); } }));
vi.mock("@/lib/blog", () => ({ BLOG_POSTS: state.posts }));
vi.mock("@/lib/prisma", () => ({ client: { editorialPost: { findMany: async () => { state.reads++; return state.rows; } } } }));

describe("published editorial cache", () => {
  beforeEach(() => { vi.resetModules(); state.posts[0].title = "Original"; state.rows = []; state.reads = 0; });
  it("uses current bundled content while reusing cached CMS rows", async () => {
    const { getPublishedPosts } = await import("./editorial-server");
    expect((await getPublishedPosts())[0].title).toBe("Original");
    state.posts[0].title = "Revised guide";
    expect((await getPublishedPosts())[0].title).toBe("Revised guide");
    expect(state.reads).toBe(1);
  });
  it("preserves explicit CMS overrides and hidden posts", async () => {
    state.rows = [{ slug: "guide", published: { ...state.posts[0], title: "CMS edit" }, hidden: false }];
    const { getPublishedPosts } = await import("./editorial-server");
    expect((await getPublishedPosts())[0].title).toBe("CMS edit");
    state.rows[0].hidden = true;
    expect(await getPublishedPosts()).toEqual([]);
  });
});
