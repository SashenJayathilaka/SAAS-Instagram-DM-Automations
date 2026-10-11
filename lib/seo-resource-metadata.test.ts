vi.mock("next/font/google", () => ({ Inter: () => ({className:"font-inter"}) }));
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/i18n/server", () => ({ getServerLocale: () => "en" }));
import { metadata as resources } from "@/app/(website)/resources/page";
import { metadata as calculator } from "@/app/(website)/tools/instagram-comment-to-dm-calculator/page";
import { generateMetadata } from "@/app/(website)/resources/[slug]/page";
import { SEO_RESOURCES } from "@/lib/seo-resources";
import { buildSitemap as sitemap } from "@/lib/sitemap";

describe("English resource search metadata", () => {
  it("matches sitemap language alternates instead of inheriting homepage peers", async () => {
    const entries = sitemap();
    const pages = await Promise.all([resources, calculator, ...SEO_RESOURCES.map(resource => generateMetadata({ params: Promise.resolve({ slug: resource.slug }) }))]);
    for (const page of pages) {
      const canonical = `https://ap3k.com${page.alternates?.canonical}`;
      const entry = entries.find(item => item.url === canonical);
      expect(entry).toBeDefined();
      expect(page.alternates?.languages).toEqual(entry?.alternates?.languages);
    }
  });
});
