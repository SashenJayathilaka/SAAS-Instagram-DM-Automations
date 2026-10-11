import { BLOG_POSTS as SOURCE_POSTS } from "./blog-catalog";
import { SEO_REVISIONS } from "./content/seo-revisions";
import type { BlogPost } from "./blog-catalog";
import { articleMetrics } from "./article-metrics";

export type { BlogPost, BlogSection } from "./blog-catalog";
export { LEGACY_BLOG_POSTS } from "./blog-catalog";

/** Keep published URLs while applying explicit, dated editorial corrections. */
export const BLOG_POSTS: BlogPost[] = SOURCE_POSTS.map(post => {
  const revision = SEO_REVISIONS[post.slug];
  const current = { ...post, ...revision, author: "AP3K" };
  return revision && !current.importedArchive
    ? { ...current, ...articleMetrics(current.intro, current.sections) }
    : current;
});
export function getBlogPost(slug: string) {
  return BLOG_POSTS.find(post => post.slug === slug) ?? null;
}
export function getBlogPostsForLocale(locale: string): BlogPost[] {
  return locale === "en" ? BLOG_POSTS : [
    ...BLOG_POSTS.filter(post => !post.contentLocale),
    ...BLOG_POSTS.filter(post => post.contentLocale),
  ];
}
