# AP3K public launch runbook

## Automated launch gates

- `npm test`
- `npm run lint`
- `npm run build`
- Production `/api/health` returns HTTP 200.
- Vercel production runtime errors contain no current webhook processing failure.
- Stripe live webhook endpoint is enabled and recent test deliveries succeed.
- Resend domain and webhook remain verified.

## Infrastructure gates

- Vercel team is on Pro before commercial traffic.
- Vercel spend alerts and usage notifications are enabled.
- `DATABASE_URL` uses the Neon pooled hostname (`-pooler`).
- `DATABASE_URL_UNPOOLED` uses the direct hostname and is reserved for migrations.
- Neon production branch protection is enabled.
- A staging Neon branch and Vercel preview deployment are used for load tests.
- Cloudflare is not placed in front of Vercel during initial launch. If DNS is migrated later, copy and verify every MX, SPF, DKIM, DMARC, BIMI, Resend, and domain-verification record before changing nameservers.

## Revenue and compliance gates

- Confirm CAFUCCI LTD business identity and address in Stripe customer receipts and public legal documents.
- Configure the Stripe customer portal for upgrades, downgrades, cancellation, invoices, and payment methods.
- Confirm tax registrations with a qualified adviser. Set `STRIPE_AUTOMATIC_TAX_ENABLED=true` only after the relevant Stripe Tax registrations are active.
- Review Terms, Privacy, Cookie, Refund, and Data Deletion pages with qualified counsel.
- Use separate restricted Stripe keys for production and staging when practical.

## End-to-end release test

Use a new AP3K user and a separate Instagram test account:

1. Sign up and complete onboarding.
2. Connect an Instagram Business or Creator account.
3. Create keyword, any-comment, story, and incoming-DM automations.
4. Verify public reply only, DM only, reply plus DM, opening button, follow verification, final link, and duplicate-event behavior.
5. Upgrade with Stripe test mode and verify plan activation, usage limits, billing portal, failed payment, cancellation, and refund webhooks.
6. Disconnect Instagram and reconnect without losing automation drafts.
7. Delete the test AP3K account and confirm associated product data is removed.

## Staging capacity test

Never point the load test at `ap3k.com`.

```bash
LOAD_TEST_BASE_URL=https://your-preview.vercel.app \
LOAD_TEST_RPS=5 \
LOAD_TEST_DURATION_SECONDS=60 \
npm run load:staging
```

Run 1, 5, 10, 25, 50, then 100 requests/second. Stop when p95 exceeds 2 seconds, errors reach 1%, or database/compute usage becomes unsafe. Meta delivery capacity requires a separate synthetic test fixture that stubs outbound Meta calls; never generate bulk real DMs.

## Launch sequence

1. Five internal testers.
2. Ten founding customers with direct support.
3. Seven stable days with no lost or duplicate automation actions.
4. Open signup publicly.
5. Start paid acquisition with a small daily budget and scale only after activation, conversion, churn, support load, and gross margin are measured.
