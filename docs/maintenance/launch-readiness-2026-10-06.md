# AP3K launch-readiness audit — 2026-10-06–07

Baseline: main `f27260fad6509adc8c3c37d20bdb6d13fb4b11d4` (PR #222), already deployed. Preserve prior PRs #210–#222. This is a code, configuration, runtime and customer-journey review, not an independent penetration test or a guarantee of security.

## Decision

Do not scale paid advertising yet. Stripe is enabled for selling, but a completed live purchase and a fresh customer's Instagram delivery flow have not been demonstrated in this audit. After release verification, use an assisted pilot to close those gates before spending on acquisition. No real payment, customer message, live automation activation, or destructive customer operation was performed.

## Confirmed findings and corrections

| Area | Finding | Correction |
| --- | --- | --- |
| Runtime dependencies | Next 14.2.7, Clerk 6.9.6 and Axios 1.7.9 had published security advisories. | Next 15.5.27, Clerk 6.39.7, Axios 1.20.0, Sharp 0.35.5 and safe transitive updates. Next's PostCSS resolves to 8.5.29. Migrated route params/searchParams and request cookie consumers. CI now uses Node 24, matching Vercel, and runs lint. |
| Checkout recovery | A previously completed checkout could restore a canceled subscription or apply its old plan; pending asynchronous payments were not rejected. Legacy `onSubscribe` duplicated weaker checks. | Require ownership, a completed/paid subscription checkout and current Stripe subscription/customer state. Shared entitlement rules; legacy entry point delegates to the verified path. |
| Webhook ordering | Old subscription event snapshots could overwrite current state. Deletion of an older subscription could revoke its replacement. | Retrieve current subscription state; cancellation checks for remaining paid subscriptions. Regression tests cover both cases. |
| Owner access | Email allowlisting did not require verified ownership of the primary email. | Verified Clerk primary email required for email allowlist access; explicit Clerk ID allowlist preserved. |
| Cron security/operations | No production CRON_SECRET. Token refresh accepted an untrusted schedule header; owner-alert retry was configured to reject every run without the secret. | Added a new sensitive production-only CRON_SECRET in Vercel. Token refresh and keepalive now fail closed without valid bearer authentication. QStash signature authentication remains supported for follow-ups. |
| Checkout UX | Canceled or failed checkout left the customer without a recovery action. | Accessible Billing, plans and support actions on status cards, with responsive layout. |
| Marketing trust | Homepage displayed a Meta Business Partner badge/claim without verified supporting evidence available to this audit. | Use supported “Official Instagram API” wording, including localized FAQ answers. A partner claim should only return with evidence of current status. |
| Analytics privacy | New admin route was not included in path redaction; optional Meta script could initialize on previews/private routes. | Redact ap3k-admin-v2; restrict Meta initialization to production public routes and disable automatic configuration. Add approved facebook/paid_social UTM vocabulary. Consent gating remains in place. |

## Dependency residual risk

`npm audit --omit=dev` changed from 27 flagged dependency entries (3 critical, 19 high, 5 moderate) to 7 (0 critical, 5 high, 2 moderate). These are dependency-chain entries, not counts of independent exploitable application flaws. Remaining entries concern Tailwind 3's build-time glob/CSS parser chain: braces, chokidar, fast-glob, micromatch, postcss-nested, postcss-selector-parser, tailwindcss. There is no untrusted runtime CSS/glob compilation in the reviewed application. A Tailwind 4 migration is a separate tested design/build migration; do not run `npm audit fix --force` against production blindly. Recheck advisories routinely.

## Production evidence at audit time

- Vercel current production was READY; recent 30-minute error/fatal runtime query returned no entries. Older price errors predated the earlier Stripe configuration correction. A url.parse deprecation warning remains maintenance work, not evidence of a failed transaction.
- Database health endpoint returned ready. Representative home, pricing, comparison, feature landing, signup, terms, privacy and documentation routes returned successful responses. Attachments/follow-up cron rejected unauthenticated requests. Production-only diagnostic/review routes returned 404. Proxy request timings are not Core Web Vitals measurements.
- Stripe live account: charges_enabled and payouts_enabled true; currently_due and past_due empty; disabled_reason null. A nonblocking pending-verification item exists. This does not guarantee future account status.
- Live Stripe webhook enabled at /api/webhooks/stripe with checkout, asynchronous payment, subscription, invoice, refund and dispute events. Event search returned no completed checkout/invoice-paid/subscription-created events in Stripe's available recent history. Existing four plan/interval checkout links had been verified in the preceding release, not charged.
- Connected AP3K Instagram account showed Connected, Comments ready, DMs ready and a fresh profile snapshot. No active automation delivery was exercised in this audit.
- EU QStash five-minute follow-up schedule enabled with last schedule state SUCCESS. Per-message scheduling exists. Resend sending domain verified.
- Production has GA fallback stream configured in code. No Meta Pixel or Google Ads ID was configured in environment metadata. Existing events measure CTA clicks and launch-kit requests, not verified registrations or purchases. First-party admin activation metrics exist, but are not an ad attribution system.

## Launch gates — must record actual outcomes

1. **Paid lifecycle:** A consenting owner/customer completes one genuine purchase using normal payment details. Confirm Stripe paid invoice, successful webhook, correct AP3K plan, receipt, billing portal and cancellation/renewal behavior. Do not submit Stripe test cards to live checkout. Use a separately configured test-mode environment for failed-payment scenarios. This audit did not charge a card.
2. **Fresh customer activation:** With an account outside the existing owner workspace, complete signup, Instagram authorization, creation and saving of a draft, explicitly publish a controlled automation, then test using a consenting second Instagram account. Confirm one correct DM, link, follow-up, deduplication and analytics. Do not send unsolicited test messages to customers.
3. **Ad measurement:** Supply the actual ad account/pixel/conversion destinations, configure consent-aware completed registration and paid purchase events with deduplication, and verify them in the provider's event debugger. A checkout button click is not a purchase. Keep tokens, emails, customer IDs and private URLs out of analytics. Use approved campaign vocabulary documented in lib/google-analytics.ts.
4. **Recovery and operations:** Confirm database backup/PITR retention and perform an isolated restore drill; this connector session did not expose a discoverable database project. Verify the next daily Vercel cron run after release accepts its injected bearer secret. Do not manually trigger owner email queues just to test authentication.

## Release verification

Local suite: 1,879 tests across 243 files after cron regressions. TypeScript, lint and optimized build must pass on the final revision. Check Vercel preview desktop/mobile and both themes, protected navigation, automation setup and payment cancellation recovery. Keep production blocked from review fixtures. Record PR, deployment and production smoke-test evidence in the release result; do not label a preview as production verification.

Preview verification on PR #223: homepage and canceled-checkout views inspected at 320/390px and desktop, in light/dark themes; no page overflow observed. The unauthenticated preview produced an RSC prefetch failure for the protected Billing destination, so the recovery link disables speculative prefetch while preserving ordinary authenticated navigation. Browser-extension metadata errors are external to AP3K. Final production authentication/navigation checks remain part of release verification.
