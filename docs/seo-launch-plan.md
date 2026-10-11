# AP3K search launch plan

Updated 2026-09-17. Rankings are outcomes, not guarantees. Preserve the current product design and improve useful content rather than publishing near-duplicate keyword pages.

## Implemented foundations

- Six language versions with self-canonical URLs, reciprocal language alternates and XML sitemap entries.
- Public page text and translated metadata rendered in the initial HTML.
- Localized home FAQ and software structured data, plus WebSite identity.
- Visible localized breadcrumbs and matching BreadcrumbList data for product pages and articles.
- Articles link back to the relevant product pages using the existing tutorial relationships.
- Repeatable read-only audit: `python scripts/audit-seo.py`. A nonzero exit means a sitemap page needs investigation. This is an HTML audit, not proof that Google indexed a URL.

## Measurement required

1. Verify the `ap3k.com` domain property in Google Search Console using its exact DNS token. Do not invent a token. Existing root metadata also supports GOOGLE_SITE_VERIFICATION for URL-prefix verification.
2. Submit https://ap3k.com/sitemap.xml once. Inspect the home page and principal product page in each language. Check Google-selected canonical, rendered content and indexing reason.
3. Capture a baseline: non-brand impressions, clicks, CTR and position by query, landing page and country. Export the last 28 days and compare with the next 28 days. With a new site, small samples are not evidence of success or failure.
4. Review Page Indexing and Core Web Vitals reports weekly. Investigate excluded commercial pages and real-user LCP, INP and CLS before adding more pages.

The Ahrefs connector returned `Insufficient plan` when listing projects on 2026-09-17. No Search Console traffic, rankings or indexing totals were available through that connection. Do not upgrade an SEO subscription merely to complete these steps: Search Console provides the essential reports.

## Existing search-intent map

| Intent | Primary destination | Supporting content |
| --- | --- | --- |
| Instagram DM automation software | /instagram-dm-automation | /blog/automatic-instagram-links-and-replies |
| Automatic public comment replies | /instagram-comment-automation | /blog/instagram-comment-automation-keyword-vs-any-comment |
| Send a link after a comment | /instagram-comment-to-dm | /blog/send-link-instagram-dm-after-comment |
| Save time answering Instagram messages | /instagram-auto-reply | /blog/manage-instagram-dms-and-comments-faster |
| Compare products | /manychat-alternative | /blog/compare-instagram-dm-automation-tools |
| Lead generation and sales | /instagram-automation-for-ecommerce | /blog/instagram-dm-sales-funnel |
| Safety and permissions | /help | /blog/is-instagram-dm-automation-safe |

Use the corresponding /ar, /fr, /es, /de and /pt destinations in each language. Do not split synonymous queries into many competing pages. Use Search Console query evidence to refine local terminology.

## Content and reputation work

- Record a real comment-to-DM setup demonstration using a test Instagram account; show the trigger, public reply, opening message, optional follow request and final link. Use anonymized product screenshots with permission, captions and accessible text explaining each action.
- Publish one genuinely documented customer example after launch, with permission and measured results. Distinguish comments, contacts, successful messages, link clicks and attributable sales. Never invent results or reviews.
- Review competitor comparisons against official sources before publishing price or feature changes. State that AP3K publishes the comparison. Do not imply official Meta endorsement without documented authorization or promise an account can never be restricted.
- Add answers to actual support questions to existing relevant guides. Verify every language before publishing changes.
- Share useful demos and research with relevant creator communities or partners only when outreach is authorized. Avoid purchased links, fabricated reviews and automated unsolicited outreach.

## Review cadence

After each release: run the sitemap audit and check representative mobile pages.
Weekly: inspect Search Console indexing, new queries and broken pages.
After 4–8 weeks: compare the baseline; improve pages with meaningful impressions and weak CTR or poor intent fit. Changes may take longer to affect rankings.

References: Google Search Central SEO Starter Guide, localized versions guidance, and Search Console URL Inspection documentation. Structured data supports understanding and eligibility; it does not guarantee rich results or a higher ranking.
