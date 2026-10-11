# AP3K Google Ads launch plan

## Conversion setup before spend

Set these public environment variables in the production deployment, then verify one real page view in each vendor's diagnostics:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — GA4 ID such as `G-...`
- `NEXT_PUBLIC_GOOGLE_ADS_ID` — Google Ads destination such as `AW-...`
- `NEXT_PUBLIC_META_PIXEL_ID` — numeric Meta Pixel ID
- `GOOGLE_SITE_VERIFICATION` — the Search Console HTML-tag token only, without the surrounding meta tag

AP3K uses its documented production GA4 stream ID by default; ad and pixel IDs remain optional. Never use a placeholder ID in production.

For the current paused campaign copy, approved tracking labels, and launch requirements, see [the September 29 acquisition package](acquisition-launch-2026-09-29.md).

Create conversion events for completed signup, connected Instagram account, and paid subscription. Do not optimize a new campaign toward page views once enough deeper events are available.

## First search campaign

Use exact and phrase match first:

- instagram dm automation
- instagram comment automation
- auto dm instagram comments
- instagram comment to dm
- instagram auto reply comments
- manychat alternative
- instagram automation for creators

Start with these negative keywords:

- auto follower
- auto like
- mass dm
- spam bot
- cracked
- download
- github
- python script
- jobs
- salary
- login hack

## Landing-page mapping

| Search intent | Landing page |
| --- | --- |
| Instagram DM automation | `/instagram-dm-automation` |
| Instagram comment automation | `/instagram-comment-automation` |
| Auto DM Instagram comments | `/instagram-comment-to-dm` |
| Instagram auto reply comments | `/instagram-auto-reply` |
| ManyChat alternative | `/manychat-alternative` |
| Creator automation | `/instagram-automation-for-creators` |

Do not send every keyword to the homepage. Keep the ad promise, page headline, example, and CTA aligned.

## Launch checks

1. Confirm the ad destination loads quickly on a real phone.
2. Confirm signup, Instagram connection, and Stripe conversion events once each.
3. Exclude irrelevant search terms every day during the first week.
4. Compare activation and paid conversion by landing page, not only click-through rate.
5. Pause keywords that attract scraping, follower-bot, hacking, or developer-script intent.
