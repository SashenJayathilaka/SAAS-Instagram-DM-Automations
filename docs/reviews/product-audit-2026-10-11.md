# AP3K product audit — 11 October 2026

Baseline: production commit `45f5d268ae8cd68dc372ed257cf1929f25b38edf` (PR #230).

## Scope and preserved behavior

The homepage hero, section order, product animations and overall design are unchanged. Its CSV FAQ is corrected to match Pro/Business export availability, and the shared footer gains the supplied official TikTok account. Existing article URLs, publication dates, indexing flags, archive pagination, authentication, quotas and delivery permissions are preserved.

## Confirmed defects addressed

- Flow Builder saved a successful publication without leaving the editor. It now invalidates saved automation data and returns to Automations with the existing published-tools behavior. Drafts and failed saves stay in the editor. Policy review still precedes publication.
- Stripe customer lookup failures could be interpreted as Free-plan referral ineligibility. Unknown billing state is now explicit. Eligibility refresh/unlock does not revoke an existing promotion while Stripe cannot be verified; new discounts still require verified eligibility.
- Missing Stripe customer records are distinguished from transient errors. The billing portal can recover an existing customer only with Stripe-side AP3K ownership proof and a verified subscription. Updating a stale mapping uses compare-and-swap to avoid overwriting a concurrent webhook change. No new subscription, charge, plan downgrade or automatic clearing of unresolved customer IDs occurs.
- AI setup counted an unconditional third step and kept stale knowledge after changes. Three visible steps now reflect knowledge, behavior and a successful playground response. Saved knowledge updates the parent state without discarding unsaved behavior. Playground messages persist when switching tabs. Tests predating saved configuration changes do not count as current setup verification.
- Month-to-date analytics compared against an entire prior month. They now compare the same elapsed portion, capped at the prior month's end. The account-wide monthly usage card no longer displays a selected-account period delta.
- Inbox called an open Meta reply window “Active now” and compared message unread counts with conversation totals. It now says “Reply window open” and counts unread conversations. Failed loading is visible and the existing 100-conversation scope is stated.
- Automation rows say “Enabled” rather than implying verified live delivery; analytics remains the place to review actual sends.
- The pricing comparison contains absolutely positioned screen-reader labels inside its horizontal scroll region, preventing those labels from widening the mobile page.
- Dashboard plan-label fallback recognizes Business; duplicate account-summary badges are removed. Contacts state when filters are applied and explain CSV export scope.

## Content and navigation

The blog directory groups all eligible articles into at most eight navigation topics, without changing article categories or dropping links. Featured cards no longer repeat cards visible in the current article grid. Documentation starts with common tasks; advanced AI integrations remain available in a separate section. Comparison pages show three related choices and link to the full comparison directory. Pricing uses “Recommended” rather than an unsupported popularity claim and explains that a public reply followed by a DM uses two actions.

## Published videos

- Channel: https://www.youtube.com/@AP3Kautomation/videos
- General AP3K demo: `TmsqoNRkG64`, public, embeddable, 36 seconds.
- Established full setup walkthrough: `SSOYGbfwLUQ`, 184 seconds.
- New demo placements: documentation landing page and three deliberately selected overview/setup articles, listed in `lib/product-videos.ts`.
- The new player is click-to-load, responsive, uses youtube-nocookie.com and makes no third-party player request before the click.
- Eleven recent uploads have the same tutorial title and description. Do not infer feature-specific content from those titles. This browser could load the watch page but not play the media, so feature-specific upload mappings were not claimed or added.
- Official TikTok supplied by the owner: https://www.tiktok.com/@ap3kautomation

## Release verification

Automated regression coverage includes successful/failed/draft flow publication, AI knowledge and playground state, stale Stripe recovery and concurrent updates, unknown-billing promotion preservation, month boundaries, complete archive discovery and localization. The complete suite contains 1,992 tests across 256 files. CI passes lint, tests and TypeScript checking, and Vercel preview builds succeed.

Protected preview inspection covered 320px and 390px phone widths and desktop layouts, including light/dark AI setup, billing-error states, article video loading, the blog directory and comparison pages. The video iframe is absent until a user clicks, then points to the curated YouTube ID. The temporary product-audit fixture routes are removed before merge; the repository's pre-existing preview-only review tools are unchanged. Browser log inspection showed extension metadata errors, not an identified application exception. YouTube media playback could not be fully verified in this browser.

Live Instagram delivery and a real payment require an appropriately connected account and customer action. The current browser account has no connected Instagram account. The stale Stripe customer observed in production belongs to a different AP3K account than the current browser session; its live Stripe record was not found. Unresolved billing mappings need owner reconciliation and must not be silently reset to permit another subscription.
