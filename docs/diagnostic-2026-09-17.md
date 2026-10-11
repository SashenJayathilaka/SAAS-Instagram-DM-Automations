# AP3K diagnostic — September 17, 2026

## Confirmed fixes

- Authentication pages explicitly emit noindex and no longer inherit the homepage canonical or language alternates. Robots.txt permits crawling these forms so search engines can read the directive and remove previously indexed sign-up URLs.
- Sitemap modification dates reflect the September 17 homepage, commercial-page, and blog navigation/content release. Dates remain fixed to the release rather than changing on every request.
- Regression checks cover unique public sitemap URLs, complete reciprocal language alternates, and crawlable authentication noindex directives.

## Verification

- Baseline: 115 test files and 933 tests passed, including account isolation, selected-account ownership, webhook processing, subscription limits, billing, deletion, admin, and translation regressions.
- TypeScript check passed after these changes.
- Live browser: English → French → Arabic → English changed the URL, document language, text, and RTL/LTR direction correctly.
- Live browser: Knowledge base navigation reached /help; searching billing filtered the articles to relevant results.
- Available production logs for the sampled last hour contained no 5xx responses. Three webhook requests returned HTTP 200; this is evidence of endpoint responses, not proof of message delivery.
- Older error clusters included a Clerk user-not-found response, an intentional duplicate-Instagram-account ownership rejection, and a Node URL deprecation warning. No current failure was reproduced from these clusters; the dependency warning's origin remains unconfirmed.

## Verification limits and follow-up

- The complete production URL crawl was blocked by the execution environment's network policy. Sitemap checks run locally; they do not prove every live URL is reachable.
- Authenticated customer/admin journeys were covered by regression tests and source review, not a signed-in production browser session. No production account was deleted, no payment was charged, and no real DM was sent.
- Physical iPhone keyboard behavior was not verified in this audit.
- Search Console screenshots show 15 discovered-but-not-indexed URLs and three crawled-but-not-indexed URLs. The latter three URLs were not supplied. Inspect their exact URLs before diagnosing a content or canonical problem.
- Google must recrawl changed pages. Sitemap acceptance and passing technical checks do not guarantee indexing or a particular ranking.

