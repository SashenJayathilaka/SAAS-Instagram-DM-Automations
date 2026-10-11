import type { BlogPost } from "./blog";
/** Literal, case-insensitive terms; do not interpret visitor input as a regex. */
export function filterBlogPosts(posts: BlogPost[], query: string): BlogPost[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return posts;
  return posts.filter((post) => {
    const text =
      `${post.title} ${post.description} ${post.category} ${post.keywords.join(" ")}`.toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
