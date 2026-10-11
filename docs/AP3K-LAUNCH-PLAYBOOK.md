# AP3K launch playbook

Updated acquisition assets and the opt-in launch-kit implementation are documented in [the September 29 launch package](acquisition-launch-2026-09-29.md).

## First milestone: ten creators getting repeatable value

Recruit ten consenting pilot customers who already receive Instagram comments. Start with French- and English-speaking creators/coaches. Avoid broad paid acquisition until these users can connect, publish, and get a real result without developer intervention. This is a proposed pilot, not a claim that participants or results already exist.

Offer one concrete outcome: a commenter asks for a guide, price list, or booking link and receives it through the configured automation. Observe the first setup, record where help was needed, and ask whether the creator used the tool again after seven days. Never request Instagram passwords.

## Thirty-day sequence

1. Days 1–7: validate the release on desktop and actual iOS/Android devices; onboard the first five creators; record connection and setup failures.
2. Days 8–14: onboard five more; address the most frequent activation blocker; capture a real product walkthrough in each launch language.
3. Days 15–21: publish two evidence-based tutorials and one customer-approved case study if evidence is available. Improve articles already attracting relevant search impressions before adding more pages.
4. Days 22–30: review activation, repeat use, cancellations and actual costs. Interview users who stopped. Expand acquisition only when the recurring use case is clear.

## Measurements and definitions

| Measure | Source | Interpretation |
| --- | --- | --- |
| Signup CTA clicks | Consented browser analytics | Interest; not a completed signup. Ad blockers and declined consent cause undercounting. |
| Checkout CTA clicks | Consented browser analytics | Checkout intent; not revenue. |
| New AP3K accounts | Admin overview, last 30 days | Current database users created during the window; includes staff/test users. |
| Connected accounts in cohort | Admin overview | AP3K users with at least one connection marked CONNECTED; not a live token health check. |
| First accepted send in cohort | Admin overview | Users with at least one SENT log; API acceptance does not prove delivery, reading or a sale. |
| Recent send in cohort | Admin overview | New users with a SENT log in the last seven days; not a formal seven-day retention cohort. |
| Paid conversion and net receipts | Verified Stripe invoice/payment records | Exclude test mode; account for refunds and failed payments. A paid plan label alone is insufficient. |
| Sales or bookings | Customer store/booking records | Verify independently; a captured lead is not a sale. |

Operational counters use surviving records and are not immutable historical analytics. Deleted users/automations/logs change the results. Never join private message text or Instagram IDs into marketing analytics.

Weekly worksheet: new accounts, connected users, first-send users, returning pilot users, actual paid customers, net receipts, hosting, database, AI, email, support hours. Calculate first-send activation = first-send users / new accounts using the same cohort. Calculate gross contribution = net receipts minus direct service costs; track founder/support time separately. Do not estimate revenue from plan selections.

## Release checklist requiring real accounts

- Connect a new Instagram account and reconnect an existing one.
- Switch between two profiles; verify automations, contacts and inbox remain isolated.
- Trigger a public reply; trigger a direct final DM; test opening-button continuation and optional follow verification.
- Retry a webhook and verify no duplicate customer message.
- Confirm disconnection/token errors produce understandable guidance.
- Complete a Stripe test checkout; verify upgrade, cancellation, and renewal handling using test-mode records.
- On actual iPhone Safari and Android Chrome, open support, focus the input, type, send, close and reopen with the keyboard visible.
- Review supported-language signup consent, pricing, templates and error states; retain user-edited campaign text when changing UI language.
- Check the onboarding progress for a brand-new profile and a second connected profile.

Automated tests supplement these checks; this document does not assert that all live checks have been performed.

## Content that can earn trust

Prioritize three complete tutorials: comment-to-DM setup, automatic link delivery, and troubleshooting a missing reply. Each needs current AP3K screenshots, prerequisites, exact steps, limitations, and an observable success check. Translate the complete useful tutorial, not only titles or navigation. Link it from the matching product/help page. Avoid publishing near-identical pages for every keyword.

Keep the browser language preference subordinate to an explicit selected language or language URL. Maintain stable locale URLs, self-canonicals, reciprocal hreflang and a sitemap of indexable pages. Check Search Console for concrete rejected URLs; expected redirects and private noindex pages are not automatically errors. Ranking first is not guaranteed.

## Customer evidence template

With written publication consent, capture: creator/use case; dates and comparison period; eligible comments; API-accepted sends; verified leads; verified purchases/bookings if available; setup time; manual time measured before/after; limitations and attribution uncertainty. Have the customer approve the quote and screenshot. Redact private names/messages. Never turn a mock demo into a customer testimonial.

The homepage's Meta Business Partner claim requires independent verification of actual partnership status. Approved API access alone is not evidence of partnership. Retain or remove that claim based on the owner's documented status.

## Performance and cost follow-up

Run the same mobile PageSpeed test three times after release and compare median lab LCP under the same conditions. Identify the actual LCP element before making another performance change. Check field LCP/INP/CLS separately over their reporting window. The hero video is deferred; that change alone does not establish that the LCP target has been met.

Review Neon preview branches weekly and confirm automated cleanup. Preserve production and any needed recovery branches. Monitor AI tokens/cost per active customer, failed-send rates and API latency. Set spending alerts; do not silently reduce promised entitlements. Verify backup restoration in an isolated environment before relying on it.

## Explicitly deferred until evidence/access is available

Customer testimonials, independently verified ROI, a partner badge verification, completed real-device testing, new performance measurements, and paid growth experiments. No customer outreach or paid campaign is authorized by this playbook.
