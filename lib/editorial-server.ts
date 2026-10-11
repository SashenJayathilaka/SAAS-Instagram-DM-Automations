import "server-only";
import { unstable_cache } from "next/cache";
import { BLOG_POSTS } from "@/lib/blog";
import { client } from "@/lib/prisma";
import { mergeEditorialPosts } from "@/lib/editorial";

const getEditorialRows = unstable_cache(
  async () => {
    return client.editorialPost.findMany({
      select: { slug: true, published: true, hidden: true },
    });
  },
  ["editorial-published-rows-v1"],
  // Publishing and hiding articles invalidate this tag immediately. The TTL is
  // a fallback for out-of-band changes, not a reason to query Neon every minute.
  { revalidate: 3600, tags: ["editorial"] },
);

export async function getPublishedPosts() {
  // Next's data cache survives deployments. Cache CMS rows, not the merge with
  // bundled articles, so a code release immediately serves its revised content.
  const rows = await getEditorialRows();
  return mergeEditorialPosts(BLOG_POSTS, rows).map(post => ({ ...post, author: "AP3K" }));
}

export async function getPublishedPost(slug: string) {
  return (await getPublishedPosts()).find((p) => p.slug === slug) || null;
}
