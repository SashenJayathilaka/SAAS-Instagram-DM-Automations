import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/editorial-server";
import { buildSitemap } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Language alternates are already emitted in each public page's HTML head.
  // Keep this document in the sitemap namespace only: XHTML link elements
  // prevent Chromium from showing its readable, expandable XML tree.
  return buildSitemap(await getPublishedPosts()).map(({ alternates, ...entry }) => entry);
}
