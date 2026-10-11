import type { BlogPost } from "./blog";
import { EXPANSION_POSTS } from "./content/expansion";
import { filterBlogPosts } from "./blog-search";

// Archive curation only: preserve existing product walkthrough URLs and help links.
export const REFERENCE_GUIDE_SLUGS = new Set([
  ...EXPANSION_POSTS.map(post => post.slug),
  "ap3k-workspace-visual-guide", "create-ap3k-automation-visual-guide",
  "set-up-ap3k-ai-visual-guide", "connect-instagram-to-ap3k",
]);
// Curate maintained AP3K guides independently of the imported source archive.
export const FEATURED_BLOG_SLUGS = [
  "ap3k-ai-offers-policies-faq-template",
  "ap3k-free-vs-pro-vs-business",
  "instagram-next-post-automation",
  "instagram-automation-link-tracking",
  "instagram-comment-to-dm-automation",
  "comment-to-dm-final-message-templates",
  "manychat-vs-ap3k-pricing-for-instagram",
  "comment-to-dm-wrong-link",
];
export function getEditorialArchive(posts: BlogPost[], query = "") {
  // The caller supplies the published CMS collection. Content provenance is
  // not a publication flag: original AP3K guides must remain discoverable too.
  const editorial = posts.filter(p => !p.noIndex).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug),
  );
  const selected = FEATURED_BLOG_SLUGS.flatMap(slug => {
    const post = editorial.find(p => p.slug === slug);
    return post ? [post] : [];
  });
  const featured = [...selected, ...editorial.filter(p => !selected.includes(p))].slice(0, 4);
  // Source lists featured articles again in the chronological archive.
  return {
    featured: query ? [] : featured,
    posts: query ? filterBlogPosts(editorial, query) : editorial,
  };
}
export function blogPaginationItems(page: number, pages: number): (number | "gap")[] {
  const selected = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach(p => selected.add(p));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach(p => selected.add(p));
  const numbers = Array.from(selected).filter(p => p >= 1 && p <= pages).sort((a,b) => a-b);
  const result: (number | "gap")[] = [];
  numbers.forEach((p, index) => {
    if (index && p - numbers[index - 1] > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

/** Navigation groups do not alter article metadata, dates or URLs. */
export function blogDirectoryTopic(category: string) {
  if (/troubleshoot|delivery|policy|safety|permissions/i.test(category)) return "Troubleshooting and safety";
  if (/measurement|analytics|attribution/i.test(category)) return "Analytics and measurement";
  if (/tool|compar|alternative/i.test(category)) return "Choosing a tool";
  if (/\bAI\b|autoresponder|support/i.test(category)) return "AI and customer support";
  if (/lead|qualif|email|ecommerce|business|sales|offer/i.test(category)) return "Leads and sales";
  if (/message|repl|DM|experience/i.test(category)) return "Messages and DMs";
  if (/growth|campaign|publish|handoff|content/i.test(category)) return "Campaigns and growth";
  return "Getting started and automations";
}

/** A server-rendered directory gives every published guide a direct archive link. */
export function getBlogDirectory(posts: BlogPost[]) {
  const groups = new Map<string, BlogPost[]>();
  for (const post of getEditorialArchive(posts).posts) {
    const topic = blogDirectoryTopic(post.category);
    const group = groups.get(topic) ?? [];
    group.push(post);
    groups.set(topic, group);
  }
  return Array.from(groups, ([category, articles]) => ({
    category,
    articles: articles.sort((a, b) => a.title.localeCompare(b.title)),
  })).sort((a, b) => a.category.localeCompare(b.category));
}
