# AP3K recurring referrals — implementation contract

User approved matching the reference rewards while retaining AP3K prices ($9 Pro / $29 Business). Screenshot-derived layout specification is in components/referral-dashboard.spec.md. No computed CSS or live LinktoDM behavior was available.

## New referrals

- Plain referral link: 30% of collected subscription revenue after discounts and excluding tax, for the first 11 calendar subscription months. The window does not restart after cancellation or reconnection. Annual payments are prorated to eligible months; partial boundary months are prorated by time.
- Personalized code link: 40% off the first monthly subscription payment. The referrer earns 10% of that actual discounted payment, then 30% during the next 10 months. Pro therefore earns $0.54 + $27 = $27.54, Business $1.74 + $87 = $88.74 if all 11 monthly invoices are paid without adjustments.
- Personalized codes require an active paid Stripe subscription and at least 10,000 Instagram followers verified from server-side profile data. Code creation and redemption refresh eligibility. The code is redeemed through its AP3K `/r/{code}` link during new-account signup, not through Stripe's generic promotion-code field. Its coupon is automatically applied only to monthly checkout. A prior paid Stripe invoice prevents repeat first-month discounts even if webhooks are delayed.
- A qualifying paid invoice received before Instagram connection is recorded but excluded from available funds. Connecting Instagram releases the prerequisite without resetting the original earning window.
- One commission per invoice, serialized mutations, USD only. Zero payments, manual out-of-band payments and plan-change/proration invoices do not earn commissions. Stripe webhook signature validation remains at the existing endpoint boundary.
- Refunds reduce commission proportionately using cumulative amounts; disputes reverse the entire invoice commission. Adjustment records also handle refunds arriving before invoice-paid events. Paid withdrawals remain in the ledger so subsequent refunds create a debt against future available earnings.

## Withdrawals and invitations

- Withdrawal requests reserve the entire available positive balance. Only one open request per partner is allowed by both a serializable transaction and a partial unique database index.
- Withdrawals are manual review requests using a PayPal email. No API transfers money. Owner admin reviews requests at `/admin/referrals`, records an actual external payment reference or cancels the request. A refund-reduced balance blocks marking the old request paid. Audit records accompany decisions.
- Invitations are sent only on the authenticated account owner's explicit action, with fixed AP3K content. Five invitations per account/day; one invitation per recipient/calendar month across accounts. Duplicate request and delivery idempotency prevent repeat sends. Suspended users cannot invoke referral actions.
- Clicks count a browser once per partner/day using a visitor cookie and date hash. This is not a bot-filtered attribution claim.

## Existing balances

Existing attributions remain program version 1 and retain the previous Founding 10 / $9 invoice-credit terms. New attributions default to version 2. Existing reward records and Stripe invoice credits are untouched. Deleted accounts detach from retained financial ledgers instead of destroying commission/withdrawal history.

## Verification

- 82 focused tests passed for legacy referrals, recurring math/eligibility/withdrawals, webhook revenue and delayed invoices.
- TypeScript passed. The full suite passed 1,548 tests before the final targeted edge-case additions; root runs final combined gates.
- Isolated PGlite applied a full pre-change schema and this migration, then verified old rows remain version 1, new rows default version 2, a second requested withdrawal violates the unique constraint, and deleting owner/referred users retains commissions/withdrawals with null user links.
- No live invitations, payouts or coupon creation were performed during testing.

Stripe references checked: https://docs.stripe.com/billing/subscriptions/coupons and https://docs.stripe.com/api/coupons/create. The existing Stripe SDK/API integration was retained to avoid an unrelated API upgrade.
