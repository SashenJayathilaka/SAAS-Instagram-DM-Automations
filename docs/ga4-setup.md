# AP3K GA4 setup

Created September 22, 2026 in the owner's requested Google account.

- Analytics property: AP3K — Production (555317801)
- Web stream: AP3K Web — Production (15821797088)
- Stream URL: https://ap3k.com
- Measurement ID: G-1DKJMY5EQ0 (public identifier, not a secret)
- Reporting timezone: Morocco; currency USD.
- Industry: Computers & Electronics. Small-business category selected as a provisional setup default; owner should correct it if team size exceeds ten.

## Collection behavior

GA4 loads only after accepting analytics in the existing cookie controls, only on the production hostname `ap3k.com`. Preview/local builds do not send Google events. The repository supplies the public stream ID; a valid `NEXT_PUBLIC_GA_MEASUREMENT_ID` can override it. Do not enable a second GA4 integration in GTM.

Enhanced Measurement is disabled on the stream. The application sends one manual `page_view` per pathname transition and disables the automatic initial view. Private areas collapse to a generic path (for example `/dashboard`); query strings, fragments and private referrer paths are excluded. Public language paths are retained. Google Signals and ad personalization signals are disabled for this GA4 destination.

As of September 29, 2026, the initial consented page view accepts only campaign labels enumerated in analyticsCampaign (including the launch-kit and initial search campaign). Arbitrary parameters and identifiers remain excluded. This supports published campaign links, not complete paid-campaign or cross-session revenue attribution.

| Event | Meaning | Key event? |
| --- | --- | --- |
| page_view | Consented page visit, including client navigation | No |
| signup_cta_clicked | Click on an internal signup link | No: not a completed signup |
| checkout_cta_clicked | Click on an internal payment link | No: not a completed checkout |
| launch_kit_requested | Accepted public form request | No: confirmation and subscription eligibility are not established by this event |

CTA events include locale, content group, and only recognized plan/interval values. Failures in Vercel Analytics do not prevent Google event delivery or navigation. Early Google events queue while its script loads.

Completed registrations, first Instagram connections, successful automations and paid subscriptions are not yet GA4 conversions. Add these only at authoritative successful-action boundaries with deduplication; never synthesize a purchase from a pricing CTA or dashboard visit.

## Verification

Focused tests cover redaction, locale paths, external referrers, early event queuing and SEO metadata. Production build validates the integrated client components. Confirm received events in GA4 Realtime after deployment; installing a tag alone does not prove ingestion. Rejection of optional cookies should leave the Google script absent.

Google reference: https://developers.google.com/analytics/devguides/collection/ga4/views

## Search Console association

The Analytics property and stream exist. After the owner's approval, the Google Analytics interface confirmed `LINK CREATED` for Search Console domain `ap3k.com` and stream `AP3K Web — Production` (15821797088), linked by the requested Google account on September 22, 2026. No duplicate link was created.

Seven focused tests and the production build passed before release. After deployment, verify consent behavior and received events in Realtime; account creation and linking alone do not prove live ingestion.
