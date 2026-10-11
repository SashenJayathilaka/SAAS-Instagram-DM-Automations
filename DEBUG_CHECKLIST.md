# AP3k — Debug Checklist

Quick-reference for common integration failures. Work through each section in order.

---

## 1. Meta Webhook Not Verifying (GET returns 403)

**Symptom:** Meta shows "Webhook verification failed" when you click Verify and Save.

**Check:**
1. `META_VERIFY_TOKEN` in `.env.local` must be **exactly** the same string entered in the Meta webhook config (no extra spaces or quotes).
2. Restart `npm run dev` after changing env vars — Next.js does not hot-reload `.env.local`.
3. Ensure the webhook URL is publicly reachable. `http://localhost:3000` will not work — you must use your ngrok HTTPS URL.
4. Confirm ngrok is running and the forwarding URL has not changed (free ngrok URLs regenerate each restart).
5. Check the app terminal for the log line:
   ```
   [webhook] GET verify { mode: 'subscribe', token_match: false, challenge_exists: true }
   ```
   If `token_match=false`, the tokens do not match.
6. Verify the route exists: `GET /api/webhooks/meta` — confirm the file is at `app/api/webhooks/meta/route.ts`.

---

## 2. OAuth Redirect Mismatch

**Symptom:** Instagram OAuth returns `redirect_uri_mismatch` or browser lands on a 404.

**Check:**
1. The `META_REDIRECT_URI` in `.env.local` must match **exactly** what is registered in Meta app → Instagram Login / Business Login → Valid OAuth Redirect URIs. No trailing slash differences.
2. The `INSTAGRAM_EMBEDDED_OAUTH_URL` `redirect_uri` parameter must match the same string.
3. Your ngrok URL changes every restart (free tier). Update all three places when it changes:
   - `.env.local` → `META_REDIRECT_URI`
   - `.env.local` → `INSTAGRAM_EMBEDDED_OAUTH_URL` (the `redirect_uri=` parameter)
   - Meta Developer Console → Valid OAuth Redirect URIs
4. Restart `npm run dev` after updating env vars.
5. In Meta app → App Review → make sure `instagram_business_manage_messages` and `instagram_business_manage_comments` permissions are added (even for test users in development mode).
6. In production, the expected redirect is:
   ```text
   https://ap3k.com/callback/instagram
   ```

---

## 3. Instagram Account Not Showing After OAuth

**Symptom:** OAuth completes but no Instagram account appears in the Integrations page.

**Check:**
1. Check the app terminal for `[oauth] callback received` — if absent, the redirect did not reach the callback.
2. Check `[oauth] token exchange failed` — this means the code→token exchange with Meta's API failed. Common causes:
   - `INSTAGRAM_APP_ID` is missing or not the Instagram app ID shown in Instagram API setup.
   - `META_APP_ID` / `META_APP_SECRET` or legacy `INSTAGRAM_CLIENT_ID` / `INSTAGRAM_CLIENT_SECRET` are wrong or mismatched.
   - The code has already been used (codes are one-time use).
3. Verify the Integrations row in the database:
   ```bash
   psql -U postgres -d replyflow -c "SELECT * FROM \"Integrations\";"
   ```
4. If `token` exists but the UI still shows "Not connected", check that the `userId` foreign key links to the correct `User.id` — not the `clerkId`.
5. Check that the Instagram account is added as a **Test User** in the Meta app (required in development mode). Go to Meta app → Roles → Instagram Test Users.
6. Reconnecting now updates the existing integration row. If reconnect still fails, inspect only `instagramId` and `expiresAt`; do not print tokens.

---

## 4. Private Reply (DM) Not Sending

**Symptom:** Automation triggers but the commenter never receives a DM.

**Check:**
1. Confirm the Stripe subscription is `PRO` if you are testing SMARTAI mode — SMARTAI DMs only fire on PRO plan.
2. Check `MessageLog` for the failed send:
   ```bash
   psql -U postgres -d replyflow -c "
     SELECT \"messageType\", status, \"errorMessage\", \"createdAt\"
     FROM \"MessageLog\"
     ORDER BY \"createdAt\" DESC LIMIT 10;
   "
   ```
3. Common `errorMessage` values:
   - `(#100) …` — permission missing. Ensure `instagram_business_manage_messages` is approved.
   - `(#10) …` — account not authorized for private replies. Account must be a Business or Creator account.
   - `(#551) …` — the commenter has DMs disabled or blocked the account.
4. Check that the stored `token` has not expired (60-day expiry). `Integrations.expiresAt` should be in the future.
5. Verify the `sendPrivateMessage` call uses `recipient: { comment_id: commentId }` (not `id`).
6. In development, Meta may block DMs to accounts that are not test users. Add the commenter account as a test user in Meta app → Roles → Instagram Test Users.

---

## 5. Stripe Webhook Not Updating Subscription

**Symptom:** Checkout completes but plan stays `FREE` in the database.

**Check:**
1. Confirm the Stripe CLI listener is running:
   ```bash
   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
   ```
2. Check `STRIPE_WEBHOOK_SECRET` in `.env.local` matches the secret printed by `stripe listen` (starts with `whsec_`). The Dashboard webhook secret is **different** from the CLI secret.
3. Check the Stripe CLI output — the event should show `→ POST ... [200]`. If it shows `[400]` or `[500]`:
   - `[400] Invalid signature` → wrong `STRIPE_WEBHOOK_SECRET`
   - `[400] Missing Stripe configuration` → `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` not set
4. Verify the `checkout.session.metadata.clerkId` is set — the payment route must include it when creating the session.
5. Verify the `subscription.metadata.clerkId` is set — the payment route should pass the same metadata via `subscription_data`.
6. Check `User.subscription` row exists. If the `Subscription` row was never created (e.g. the user signed up before that code was deployed), the `updateSubscription` upsert should still create it.
7. Check app terminal for `[stripe-webhook] handler error:` lines.

---

## 6. Prisma Migration Failure

**Symptom:** `npx prisma migrate deploy` errors out.

**Check:**
1. Confirm Postgres is running:
   ```bash
   pg_isready -h localhost -p 5432
   ```
2. Confirm `DATABASE_URL` is correct and the database exists:
   ```bash
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```
3. If you see `P3009 migrate found failed migrations`:
   ```bash
   # Mark the failed migration as rolled back, then retry
   npx prisma migrate resolve --rolled-back <migration_name>
   npx prisma migrate deploy
   ```
4. If schema and DB are out of sync during development:
   ```bash
   # Nuclear option — drops and recreates (destroys all data)
   npx prisma migrate reset --force
   npm run db:seed
   ```
5. If you only changed the schema and have no migration file yet:
   ```bash
   npx prisma migrate dev --name describe_your_change
   ```
6. Check that `gen_random_uuid()` is available — requires the `pgcrypto` extension on Postgres < 13:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```

---

## 7. Vercel Environment Variable Issues

**Symptom:** Works locally but fails on Vercel (`NEXT_PUBLIC_*` returns undefined, API routes 500).

**Check:**
1. Confirm the variable is added to the correct Vercel environment (Production / Preview / Development):
   ```bash
   vercel env ls
   ```
2. `NEXT_PUBLIC_*` variables must be present at **build time** — add them and trigger a new deployment.
3. Server-only variables (no `NEXT_PUBLIC_` prefix) are available at runtime but not in client components.
4. After adding or changing env vars in Vercel, you must **redeploy** — running builds do not pick up new vars.
5. Check for typos: Vercel env names are case-sensitive.
6. Pull Vercel env vars locally for debugging:
   ```bash
   vercel env pull .env.vercel.local
   ```
7. If a secret contains special characters (`$`, `!`, `&`), wrap it in single quotes when adding via `vercel env add`.
8. `DATABASE_URL` on Vercel must point to a remote Postgres instance (Neon, Supabase, Railway, etc.) — `localhost` will not resolve.

---

## Quick Health Check Commands

```bash
# Database — list tables
psql -U postgres -d replyflow -c "\dt"

# Latest 5 automation events
psql -U postgres -d replyflow -c "SELECT \"eventType\", \"igUserId\", \"createdAt\" FROM \"AutomationEvent\" ORDER BY \"createdAt\" DESC LIMIT 5;"

# Latest 5 message logs
psql -U postgres -d replyflow -c "SELECT \"messageType\", status, \"errorMessage\" FROM \"MessageLog\" ORDER BY \"createdAt\" DESC LIMIT 5;"

# Check subscription plan
psql -U postgres -d replyflow -c "SELECT u.email, s.plan FROM \"User\" u LEFT JOIN \"Subscription\" s ON s.\"userId\" = u.id;"

# Check integrations
psql -U postgres -d replyflow -c "SELECT \"instagramId\", \"expiresAt\" FROM \"Integrations\";"

# Test meta webhook verification manually
curl -s "http://localhost:3000/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# Should return: test123
```

Production endpoint reference:

```text
NEXT_PUBLIC_HOST_URL=https://ap3k.com
META_REDIRECT_URI=https://ap3k.com/callback/instagram
INSTAGRAM_EMBEDDED_OAUTH_URL=https://www.instagram.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://ap3k.com/callback/instagram&scope=instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages&response_type=code
STRIPE_WEBHOOK_URL=https://ap3k.com/api/webhooks/stripe
META_WEBHOOK_URL=https://ap3k.com/api/webhooks/meta
```
