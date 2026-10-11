# AP3k — Launch Checklist

## Development Readiness

- [x] Production Next.js build exits 0 on Vercel
- [x] TypeScript validation passes during production build
- [ ] `npx eslint . --max-warnings 0` exits 0
- [ ] `npm test` — run the current full suite before a major release
- [x] Prisma Client generates successfully during production build
- [ ] `npx prisma migrate status` — no pending migrations
- [ ] `.env.local` has all variables set (compare with `.env.example`)
- [ ] `npm run dev` starts without errors

## User Flow Verification (Manual)

Walk through this flow end-to-end with real credentials before launch and after material integration changes:

- [x] Sign in via Clerk and reach the AP3k workspace
- [x] Connect Instagram OAuth — integration row saved, token stored
- [x] Return to dashboard with the Instagram professional account connected
- [x] Create a comment automation/campaign
- [x] Activate a campaign
- [x] Trigger a comment on the linked post with the configured keyword
- [x] Public reply is sent when configured
- [x] Private reply arrives when configured
- [x] Lead/activity is recorded
- [ ] Navigate to `/pricing` → click Upgrade → Stripe checkout opens
- [ ] Complete a Stripe test payment in a non-production test environment and verify the plan change
- [ ] Verify subscription cancellation/downgrade handling in a non-production test environment

## Meta / Instagram Integration

- [x] Meta app has Instagram product configured
- [x] Instagram Login uses the production callback `https://ap3k.com/callback/instagram`
- [x] Webhook callback is `https://ap3k.com/api/webhooks/meta`
- [x] `comments` and `messages` webhook delivery is active
- [x] Webhook POST signatures are verified before processing
- [x] OAuth requests `instagram_business_basic`, `instagram_business_manage_comments`, and `instagram_business_manage_messages`
- [x] Meta App Review approved all three `instagram_business_*` permissions on August 26, 2026
- [x] Connected accounts are Instagram Business or Creator accounts
- [x] Real comment webhook events are received and processed in production
- [x] Real public and private replies are successfully sent in production
- [x] AP3k persists the permissions actually returned by Instagram Login
- [x] Integrations UI reports granted/missing/unknown capability state
- [x] Explicitly missing profile/media or comment access prevents a connection from being treated as campaign-ready
- [x] Expired Instagram access tokens are not treated as healthy connections
- [x] Daily proactive refresh is scheduled for eligible Instagram Login long-lived tokens before expiry

## Stripe Integration

- [x] Production Stripe account is connected
- [x] Stripe webhook requires and verifies the `stripe-signature` header
- [x] Stripe webhook processing has ownership/reassignment safeguards
- [ ] Verify current production price IDs match the intended Creator/Agency products before marketing launch
- [ ] Run a complete Stripe test-mode checkout → upgrade → cancellation regression test before pricing changes

## Security

- [x] Meta webhook verifies `META_VERIFY_TOKEN` on GET requests
- [x] Meta webhook verifies `x-hub-signature-256` on POST requests
- [x] Stripe webhook verifies `stripe-signature`
- [x] Meta webhook has request-rate and automation loop guards
- [x] Admin routes remain owner protected
- [x] Cron endpoints reject ordinary public requests
- [x] Instagram access tokens are not exposed in permission-health UI
- [ ] Review secret/environment-variable inventory periodically in Vercel
- [ ] Rotate secrets immediately after any suspected disclosure

## Production Deployment (Vercel)

- [x] AP3k production deployment is active on `https://ap3k.com`
- [x] Instagram callback and webhook endpoints are present in production
- [x] Daily Neon database keepalive is configured
- [x] Daily Instagram token-refresh job is configured
- [x] Production builds compile and type-check before merge
- [x] Sign-in → connect → campaign → comment → reply flow works on production

## Meta App Review

- [x] `instagram_business_basic` approved
- [x] `instagram_business_manage_comments` approved
- [x] `instagram_business_manage_messages` approved
- [x] Existing `pages_show_list`, `pages_read_engagement`, `business_management`, and `instagram_basic` access renewed
- [x] End-to-end screencast accepted by Meta
- [x] Real Instagram authorization screen exposes profile/media, comments, and messages access

## Remaining Product Work

- [ ] Add story/reply trigger support only if it fits Meta's currently permitted API use cases
- [ ] Improve Smart AI matching failure/recovery UX
- [ ] Keep payment/pricing regression tests current before changing plans or limits
- [ ] Periodically review production warnings and dependency upgrades

## Operational Baseline — August 26, 2026

At the post-approval audit checkpoint:

- 5 Instagram integrations were connected and healthy
- 38 campaigns were active
- 87 webhook events were recorded in the preceding 24 hours
- 0 outbound message failures were recorded in the preceding 24 hours
- The preceding 7 days contained successful public comment replies and private replies with no failed MessageLog sends
