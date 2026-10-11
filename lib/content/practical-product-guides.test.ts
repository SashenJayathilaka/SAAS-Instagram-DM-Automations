import { describe, expect, it } from 'vitest';
import { PRACTICAL_PRODUCT_GUIDES } from './practical-product-guides';
import { BLOG_POSTS } from '../blog';
import { getEditorialArchive, getBlogDirectory } from '../blog-archive';
import { editorialSchema } from '../editorial';
import { PLAN_LIMITS } from '../plan-limits';

describe('new practical AP3K guides', () => {
  it('publishes substantial distinct guides with valid metadata and internal discovery', () => {
    const archive = getEditorialArchive(BLOG_POSTS).posts;
    const directory = getBlogDirectory(BLOG_POSTS).flatMap(group => group.articles);
    for (const post of PRACTICAL_PRODUCT_GUIDES) {
      expect(editorialSchema.safeParse(post).success, post.slug).toBe(true);
      expect(post.wordCount).toBeGreaterThan(650);
      expect(archive.some(p => p.slug === post.slug)).toBe(true);
      expect(directory.some(p => p.slug === post.slug)).toBe(true);
      for (const link of post.sections.flatMap(s => s.links ?? [])) {
        if (link.href.startsWith('/blog/')) expect(BLOG_POSTS.some(p => `/blog/${p.slug}` === link.href), link.href).toBe(true);
      }
    }
  });
  it('uses configured plan capacities rather than a second hardcoded table', () => {
    const rows = PRACTICAL_PRODUCT_GUIDES[0].sections[0].table!.rows;
    expect(rows[0][2]).toBe(String(PLAN_LIMITS.FREE.activeCampaigns));
    expect(rows[2][4]).toBe(PLAN_LIMITS.BUSINESS.aiRepliesPerMonth.toLocaleString('en-US'));
  });
});
