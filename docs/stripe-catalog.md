# AP3K Stripe catalog

Checkout resolves the live product catalog by stable lookup key before using legacy price-ID environment variables.

| Tier | Interval | Price | Lookup key |
| --- | --- | ---: | --- |
| Pro | Monthly | $15 | `ap3k_pro_month` |
| Pro | Annual | $120 | `ap3k_pro_year` |
| Business | Monthly | $25 | `ap3k_business_month` |
| Business | Annual | $216 | `ap3k_business_year` |

Do not replace these lookup keys when creating new versions of a price without also updating `lib/stripe-config.ts`. Legacy Creator/Agency price IDs are fallback-only for historical compatibility.

## AP3K LLC cutover (October 2026)

New Stripe account: `acct_1UGsUb4E9nEnNdPO` (live mode).

Annual prices are total yearly charges: Pro $120/year ($10/month equivalent),
Business $216/year ($18/month equivalent). Business supports 6 Instagram accounts;
Free remains 1 and Pro remains 3. Free registration stays inside AP3K without a card.

| Plan | Monthly price ID | Annual price ID |
| --- | --- | --- |
| Pro | `price_1UMKNX4E9nEnNdPOKKRGXkmc` | `price_1UMKNZ4E9nEnNdPO4rryEHlj` |
| Business | `price_1UMKNa4E9nEnNdPOzNxlgk8V` | `price_1UMKNb4E9nEnNdPOMfso0B1L` |
| Free | `price_1UMKNd4E9nEnNdPOT3on7YPz` | `price_1UMKNe4E9nEnNdPOeUasBZf8` |

Portal: `bpc_1UMKOf4E9nEnNdPOrsF27HA6` (account default). It supports invoice history,
payment methods, plan changes, and cancellation at period end. Decreases in price
are scheduled at period end. Other changes display Stripe prorations.

Webhook: `we_1UMKP34E9nEnNdPOh7rgMASB`, receiving events at
`https://ap3k.com/api/webhooks/stripe`, API version `2026-08-26.dahlia`.

Before production release:

1. Verify the new account's live restricted API key and store it as a sensitive
   Production `STRIPE_SECRET_KEY` in Vercel. Required access: Checkout Sessions write;
   Customers write (including account credits); Customer Portal write; Subscriptions
   write (account deletion cancellation); Coupons write (referral codes); and read
   access for Prices, Products, Invoices, Invoice Payments, Charges and PaymentIntents.
2. Preserve access to the previous Stripe account while reviewing existing linked
   customers and subscriptions. Do not detach customers, cancel subscriptions, or
   start duplicate subscriptions as part of credential replacement.
3. Install the new endpoint signing secret as sensitive Production
   `STRIPE_WEBHOOK_SECRET` together with the API-key cutover. Never commit either key.
4. Stable lookup keys resolve the new catalog; legacy Creator/Agency IDs do not
   override them. If explicit Pro/Business price-ID variables exist, update all four.
5. Verify a signed webhook and each checkout interval, plus billing portal access,
   after deployment. Creating a checkout session is not evidence of a paid test.
6. Managed Payments was already enabled by default on this account. Products use
   verified `txcd_10103001` (SaaS — business use). A live unpaid Pro annual Checkout
   Session was created successfully for $120 with Managed Payments enabled.
   No payment was submitted. Do not disable Managed Payments or enable standalone
   Stripe Tax without reviewing merchant responsibilities and registrations.

The application uses Stripe SDK 22 and the current pinned API version. Invoice
payment traversal preserves refund/dispute referral reversal on the new API;
legacy event fields remain supported. Delayed checkout payments grant access only
when paid or when a no-payment-required checkout is confirmed.
