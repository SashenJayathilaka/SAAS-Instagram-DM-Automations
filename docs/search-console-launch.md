# AP3K Google Search Console launch

AP3K now exposes the technical SEO assets needed for Search Console:

- Canonical production host: `https://ap3k.com`
- Sitemap: `https://ap3k.com/sitemap.xml`
- Robots: `https://ap3k.com/robots.txt`
- Blog hub: `https://ap3k.com/blog`
- Blog posts include `BlogPosting` JSON-LD and canonical metadata.
- Public navigation/footer provide crawlable internal links to the blog.
- Dashboard, admin, API, auth, checkout, onboarding, and callback routes are excluded from crawling in `robots.txt`.

## One-time Search Console steps

1. Add `https://ap3k.com` as a Search Console property (Domain property is preferred if DNS access is available).
2. If using HTML-tag verification instead, copy Google's verification token into Vercel as `GOOGLE_SITE_VERIFICATION` and redeploy.
3. Open **Sitemaps** in Search Console and submit: `sitemap.xml`.
4. Use **URL inspection** for the homepage, `/pricing`, `/blog`, and the most important new article; request indexing after the production deployment is live.
5. Watch the **Pages**, **Sitemaps**, and **Enhancements** reports for crawl/indexing or structured-data issues.

Do not add low-value programmatic pages only to increase index count. Publish useful articles that answer real Instagram automation questions and internally link them to relevant AP3K product pages.
