# AP3K customer-ready release

This release aligns the product around one customer vocabulary and one billing catalog.

## Customer vocabulary

- **Comment** — the Instagram user's comment.
- **Comment reply** — AP3K replies under the Instagram post.
- **DM** — AP3K sends a message to the commenter in Instagram.
- **Actions** — Comment reply, DM, or both.

Meta/API/database field names remain unchanged internally where compatibility requires them.

## Plans

- Free — $0, 500 automated actions/month, 1 Instagram account, and 5 active automations.
- Pro — $15/month or $120/year, 5,000 automated replies/month.
- Business — $25/month or $216/year, 20,000 automated replies/month.

One successfully sent Comment reply counts as one automated reply. One successfully sent DM counts as one automated reply. When both send for one matched comment, two automated replies are used. Failed/skipped sends do not count. Annual subscriptions still receive monthly usage resets.

## Public SEO

- `/blog`
- five initial evergreen Instagram automation guides
- `/sitemap.xml`
- `/robots.txt`
- canonical metadata
- `BlogPosting` structured data
- Search Console HTML verification environment-variable support

## Safety

- Instagram OAuth scopes, webhook parsing, Meta API endpoints and sending behavior are not renamed or reworked by this release.
- Existing legacy Stripe prices remain supported as fallback, while new checkout resolves the explicit AP3K catalog first.
- Existing paid subscriptions are not duplicated by checkout.
- Business is a first-class database entitlement.
