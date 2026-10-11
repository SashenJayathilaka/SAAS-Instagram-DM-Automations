vi.mock("@/components/website/blog-fonts", () => ({ blogSans: {className:"",variable:""}, blogSerif: {variable:""} }));
vi.mock("@/lib/imported-blog-server", () => ({ getImportedArticleHtml: async () => "<p>Imported article</p>" }));
vi.mock("next/font/google", () => ({ Inter: () => ({className:"font-inter"}) }));
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BLOG_POSTS } from "@/lib/blog";
const mocks = vi.hoisted(() => ({
  getPost: vi.fn(),
  getPosts: vi.fn(),
  locale: "fr",
  path: "/blog/custom-english-article",
}));
vi.mock("@/lib/editorial-server", () => ({
  getPublishedPost: mocks.getPost,
  getPublishedPosts: mocks.getPosts,
}));
vi.mock("@/lib/i18n/server", () => ({ getServerLocale: () => mocks.locale }));
vi.mock("next/headers", () => ({
  headers: () => new Headers({ "x-ap3k-request-path": mocks.path }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  permanentRedirect: (url: string) => {
    throw new Error("REDIRECT:" + url);
  },
}));
import BlogPage, { generateMetadata } from "@/app/(website)/blog/[slug]/page";

describe("published editorial routing", () => {
  beforeEach(() => {
    mocks.locale = "fr";
    mocks.path = "/blog/custom-english-article";
    mocks.getPost.mockResolvedValue({
      ...BLOG_POSTS[0],
      slug: "custom-english-article",
      contentLocale: "en",
      seoTitle: "Owner-authored search title",
      noIndex: true,
    });
    mocks.getPosts.mockResolvedValue([]);
  });
  it("does not redirect the canonical English URL because of a French preference", async () => {
    await expect(
      BlogPage({ params: Promise.resolve({ slug: "custom-english-article" }) }),
    ).resolves.toBeTruthy();
  });
  it("redirects an actual locale-prefixed URL to the English article", async () => {
    mocks.path = "/fr/blog/custom-english-article";
    await expect(
      BlogPage({ params: Promise.resolve({ slug: "custom-english-article" }) }),
    ).rejects.toThrow("REDIRECT:/blog/custom-english-article");
  });
  it("returns 404 for private drafts or unpublished articles", async () => {
    mocks.getPost.mockResolvedValue(null);
    await expect(
      BlogPage({ params: Promise.resolve({ slug: "private-draft" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
  it("respects owner search overrides, noindex, canonical and the article language", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "custom-english-article" }),
    });
    expect(metadata.title).toBe("Owner-authored search title");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe(
      "https://ap3k.com/blog/custom-english-article",
    );
    expect(Object.keys(metadata.alternates?.languages || {})).toEqual([
      "en",
      "x-default",
    ]);
    expect(metadata.openGraph?.locale).toBe("en_US");
  });
});
