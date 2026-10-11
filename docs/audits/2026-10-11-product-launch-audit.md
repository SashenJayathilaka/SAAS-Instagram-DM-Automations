# AP3K product and launch audit — 2026-10-11

Base: main 780f29c (PR #231). Changes: PR #232. Homepage layout preserved.

## Changes

- Basic comment automations support Next published post. The activation timestamp is server-owned; the earliest post after activation is verified against the connected account timeline, then bound with a compare-and-swap. Drafts do not arm the trigger; edits and pauses preserve the binding. Missing or incomplete Meta results fail closed. Backtracking uses the bound post only.
- Editing an existing basic automation now updates its listener rather than deleting it, preserving DM/comment totals and clearing removed optional fields.
- Link tracking already existed. Added per-destination first-click measurement, repeat-click deduplication, clearer attribution, responsive analytics, seven-day aggregate CSV export, and measurement explanations. Historical destination clicks cannot be reconstructed. Prepared links are not delivery receipts, and clicks are not sales.
- Added bounded background follower-status checks for previously verified non-followers who interacted with an automation in the last seven days. Each scheduler invocation checks at most 20 contacts with four concurrent requests, 30-minute recheck spacing and an atomic claim. Unknown profile responses never become follows. Existing followers and account-wide growth are not counted as conversions.
- Billing now exposes server-owned Stripe portal flows for plan changes, payment methods and cancellation, with mobile layouts, status/renewal clarity, restrained motion and reduced-motion support. Incomplete subscriptions block duplicate Checkout creation. No live charge, cancellation or customer message was executed.
- Footer social icons fit the brand column and narrow mobile screens while retaining 44px touch targets.
- Added original Next Post and link-tracking articles with examples, FAQs, product imagery and internal links. Added three product support guides. Publication dates are genuine; existing article dates were not reset. New English articles are explicitly English-only to avoid fake localized duplicates.

## Verification

- Local full suite: 259 files / 2,008 tests passed using four workers. An earlier unrestricted run timed out one PostgreSQL fixture; the bounded full rerun passed. A subsequent activation concurrency regression passed in the 18-test tenant suite.
- TypeScript, lint (existing non-blocking warnings) and production build passed before final cleanup. GitHub CI passed on the preview commit. Final commit must also pass CI before merging.
- Prisma migration tested against an isolated Neon branch. Pre/post automation counts, tracked-link counts and listener reply sums were unchanged. Migration adds nullable fields and a partial index; no destructive SQL.
- Actual billing, analytics, footer and editor components inspected in a protected preview using sample data. Mobile widths 320/390 and desktop 1280 checked; billing and analytics light/dark checked, long destination URLs wrap without page overflow. Next Post selected through the mobile editor UI. Temporary review page and migration verification script removed before merge.
- Both new article URLs returned 200 in preview with production self-canonicals and inclusion in sitemap.xml. Preview remains noindex.
- Production crawl: all 681 sitemap URLs checked, with 647 successful initially and 34 successful on a bounded retry. Successful pages had title/description, one H1, self-canonical, valid JSON-LD, language and image-alt markup. No hreflang return-link errors or sitemap URLs missing incoming links in the sample. One identical cookie-policy title spans Spanish/Portuguese translations; this alone is not a duplicate-content defect.
- Search Console on Oct 11 reports 510 indexed / 334 excluded URLs, last aggregate update Oct 4. Discovered-not-indexed: 320, validation already Started. Noindex: 7, validation Started. Canonical alternates: 3; redirects: 2; robots: 1; crawled-not-indexed: 1. Aggregate reports predate this release. Core Web Vitals has insufficient field data. Request new guide indexing only after deployment; indexing is Google's decision.
- Recent production and preview error-log checks found no errors in the available 30-minute window. This is not proof of absence of all errors.

## Remaining constraints and follow-up

- AP3K's access to Meta's restricted new-follower messaging capability is unverified. Do not implement follower scraping or unsolicited follower-only DMs through unsupported APIs, and do not market this feature as available. A user-initiated DM keyword welcome flow is already supported.
- The workspace has internal plan access; after deployment it displayed one connected Instagram account and no automations. Real Instagram delivery and Stripe financial transactions were not exercised; external responses are covered by regression tests, not a claim of live delivery or payment verification.
- npm audit reports the unpatched braces <=3.0.3 stack-exhaustion advisory (GHSA-vfj7-8cjw-p6xm) through Tailwind's build dependencies. No application-source imports of braces/micromatch/fast-glob were found. Do not replace the existing styling stack blindly to hide this advisory. Track an upstream fix; do not process untrusted glob input with this build chain. This audit is not a guarantee of perfect security.
- Recheck follower conversion against a consented contact and current Meta permissions after release. The worker intentionally skips suspended/locked/reconnect-required integrations and stops attribution after seven days.
- Confirm final deployment READY, production guide metadata/discovery, authenticated billing UI and final runtime errors after merge. Record any blocked Search Console indexing request honestly.

## Production verification

PR #232 merged as 17d903e and Vercel reached READY. Production migration applied successfully and the existing QStash schedule was preserved. Final CI passed 259 files / 2,009 tests, lint and TypeScript. Both guides, the archive and all three support pages returned 200 with index/follow and matching canonicals; the sitemap contains both guides. The temporary review route returns 404. Authenticated billing correctly shows internal access without a recurring charge. Stripe charges and payouts are enabled, with no currently due requirements; portal products include Pro/Business monthly and annual prices. No live payment/cancellation or Instagram message was performed. Production error logs were clear in the checked window.

Search Console URL Inspection confirms the templates article is indexed, despite its stale aggregate exclusion. Both submitted sitemaps show Success. Google accepted the link-tracking guide into its priority crawl queue. The Next Post guide's Request indexing returned a Google submission error on the initial attempt and one retry (try again later); that request was not accepted. Both new URLs remain discoverable through the published sitemap and archive. Live navigation between the two guides succeeded, and the production Next Post editor control was verified without saving or publishing a campaign.
