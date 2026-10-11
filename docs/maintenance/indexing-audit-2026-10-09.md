# AP3K indexing audit — 9 October 2026

Baseline production: `3be577eca378e6b8d53ebe267b54cc1cfd05d942` (PR #226). Existing releases preserved. Property inspected: `https://ap3k.com/`, not the older domain-property report used on October 6.

## Search Console evidence

Page indexing report last updated October 4: 510 indexed; 334 not indexed. The reasons are 320 Discovered – currently not indexed, 1 Crawled – currently not indexed, 7 noindex, 3 canonical alternates, 2 redirects and 1 robots exclusion. Exported the complete 320-row discovered report; last crawled is N/A (CSV represents it as 1970-01-01, not a real crawl date).

Both submitted sitemaps report Success. Main sitemap last read October 3 with 774 discovered pages; video sitemap last read October 4 with one page/video. These are historical report counts, not a live sitemap count.

Crawl stats last updated October 6: 3.7K requests, average response 153 ms, host had no problems in the last 90 days. Purpose: 94% refresh, 6% discovery. Response breakdown rounds HTTP 200 to 100%; 301 and 404 are each below 1%. These figures do not demonstrate a current server-overload problem. Proxy request timings from our audit are not Core Web Vitals or Googlebot timings.

## Every discovered URL checked

`indexing-320-urls-2026-10-09.csv` records every exported URL. All 320 currently return HTTP 200 directly, have matching canonicals, allow indexing, and appear in the live sitemap. No duplicate title or description groups were found among them. The list includes 161 English blog articles, localized blog articles, archive pagination, documentation, help, comparison and landing pages. It is not a list of 320 defective blog posts.

The read-only crawl respects robots.txt, uses at most four concurrent requests, and also covers all sitemap-listed blog archive pages plus the home, documentation, resources, comparison and solution hubs. A successful fetch proves technical accessibility, not Google index selection, originality, factual completeness or ranking quality. Word counts in the CSV include rendered page navigation; they are diagnostics, not article-quality scores.

## Other exclusions

The single crawled example is `/docs/post-automation/post-automation-templates`: currently HTTP 200, self-canonical, index/follow. Its old content mixed fixed template counts with a changing product gallery and received an original product-specific rewrite in this release.

Six public URLs in the noindex report are currently HTTP 200, self-canonical and index/follow with no X-Robots-Tag restriction:

- `/docs/troubleshoot/fix-auto-reply-not-sending-in-dms`
- `/docs/post-automation/create-instagram-comment-to-dm-automation`
- `/docs/why/facebook-page-is-required`
- `/docs/migrating-from-manychat/disconnect-manychat-from-instagram`
- `/docs/migrating-from-manychat/connect-your-account`
- `/blog/understanding-tracking-instagram-follower-growth`

The seventh is `/sign-up`, intentionally noindex. Do not make signup indexable to force the report count to zero. Alternate examples are tracked homepages and `/fr/sign-up`; redirected examples are retired Arabic homepage variants. `/payment` was historically robots-blocked and now returns noindex in both HTML and response headers. These private/duplicate URL exclusions are expected. A whole-group noindex validation can fail on the intentionally excluded signup URL; use URL Inspection for the public pages instead of claiming all seven were defects.

## Confirmed content and discovery weaknesses

The repository contains 175 imported article records. The import/branding notes explicitly document replacing source product names, links and authors with AP3K. That is not equivalent to creating original product evidence. 117 of the imported slugs occur in the discovered list. This establishes provenance, not a Google penalty: the Discovered report cannot establish why Google has not scheduled these URLs for crawling.

Some product-specific imported pages were short, promotional or asserted unsupported scheduling/growth behavior. Seven now use original AP3K guides, existing real screenshots, specific test steps, qualified plan information and useful internal links:

- Get started with AP3K
- Ten practical AP3K workflows
- Instagram API connection
- Timing controls, delays and follow-ups
- Contact capture and CSV export
- Incoming DM setup
- Follow requests and their conversion tradeoffs

Their URLs and original publication dates are retained. Only these substantive revisions receive October 9 `updatedAt` / `dateModified` / sitemap dates. Existing revisions from earlier releases are preserved. The rest of the imported archive has **not** all been rewritten or independently source-checked in this release; the CSV identifies it for further review. Do not call all 175 original, mass-delete it, or suppress potentially valuable indexed URLs based only on this report.

The archive had pagination links but no direct directory of all published guides. The first archive page now contains a server-rendered topic directory: real links available without JavaScript, collapsible sections for mobile, no extra images and prefetch disabled. It uses the published CMS collection and excludes explicit noindex entries. Related articles no longer exclude maintained reference guides simply because of their provenance.

## Documentation accuracy

The template article is rewritten around the actual gallery, selection criteria, placeholder replacement, an illustrative GUIDE campaign, plan restrictions and positive/negative delivery tests. It includes the AP3K tutorial and current template screenshot.

The plans documentation previously contained $9/$29 and ten Business accounts despite current pricing/configuration. It now derives prices and capacities from the same product constants used by the application. The add-account guide uses the configured Business account limit. These corrected docs also feed support knowledge.

## Verification and validation discipline

Regression checks preserve original publication dates and canonical URLs; require valid guide links and real screenshot dimensions; verify directory coverage without exposing noindex/CMS-hidden posts; and verify plan documentation against current configuration. Run the complete test suite, typecheck, lint and production build, inspect preview desktop/mobile and both themes, review the PR and verify production before submitting Search Console validation.

Validation requests are requests for Google to recheck, not a promise of indexing or a completed fix in Google's report. Keep intentional exclusions. Do not submit hundreds of repeated URL Inspection requests or falsify publication dates. Record actual PR/deployment and validation outcomes in the release result.
