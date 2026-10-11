# AP3k — Integration Testing Guide

Step-by-step instructions for verifying every live service locally before deploying to production.

---

## Prerequisites

Install these tools before starting:

```bash
# Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# ngrok (macOS)
brew install ngrok/ngrok/ngrok

# Prisma CLI (already in devDependencies)
npx prisma --version
```

---

## 1. Local .env Setup

Copy the example file and fill in every value:

```bash
cp .env.example .env.local
```

Open `.env.local` and set:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Your local Postgres: `postgresql://postgres:password@localhost:5432/replyflow` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → API keys → Publishable key |
| `STRIPE_PRICE_ID_CREATOR` | Stripe Dashboard → Products → AP3k Creator → Price ID |
| `STRIPE_PRICE_ID_AGENCY` | Stripe Dashboard → Products → AP3k Agency → Price ID |
| `META_APP_ID` | Meta for Developers → your app → Settings → Basic |
| `META_APP_SECRET` | Meta for Developers → your app → Settings → Basic |
| `INSTAGRAM_APP_ID` | Instagram API setup → Instagram App ID; AP3k uses this as OAuth `client_id` |
| `INSTAGRAM_APP_SECRET` | Optional Instagram app secret if shown separately; otherwise `META_APP_SECRET` is used |
| `META_VERIFY_TOKEN` | Any random secret you choose (e.g. `my-local-verify-secret`) |
| `META_REDIRECT_URI` | Production: `https://ap3k.com/callback/instagram`; local/ngrok: `https://abc123.ngrok-free.app/callback/instagram` |
| `INSTAGRAM_CLIENT_ID` | Legacy fallback; prefer `INSTAGRAM_APP_ID` |
| `INSTAGRAM_CLIENT_SECRET` | Same as `META_APP_SECRET` |
| `INSTAGRAM_EMBEDDED_OAUTH_URL` | Full Instagram OAuth URL whose `redirect_uri` exactly matches `META_REDIRECT_URI` |
| `OPENAI_API_KEY` | platform.openai.com → API keys (only needed for SMARTAI mode) |

`NEXT_PUBLIC_HOST_URL` stays as `http://localhost:3000` for local testing.

---

## 2. Database — Prisma Migrate

```bash
# Make sure Postgres is running locally
psql -U postgres -c "CREATE DATABASE replyflow;" 2>/dev/null || true

# Apply all migrations
npx prisma migrate deploy

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

To seed with demo data:

```bash
npm run db:seed
```

To reset and reseed from scratch:

```bash
npx prisma migrate reset --force
npm run db:seed
```

---

## 3. Clerk Setup

1. Go to [clerk.com](https://clerk.com) → create a new application.
2. Choose **Email + Password** (and Google if desired).
3. Copy **Publishable Key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
4. Copy **Secret Key** → `CLERK_SECRET_KEY`
5. In Clerk Dashboard → **Paths**, set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in redirect: `/dashboard`
   - After sign-up redirect: `/dashboard`
6. Start the app and sign up for a new account at `http://localhost:3000/sign-up`.
7. Verify the User row appears in your database:
   ```bash
   psql -U postgres -d replyflow -c "SELECT id, email FROM \"User\";"
   ```

---

## 4. Stripe CLI — Webhook Testing

### 4a. Start Stripe webhook listener

In a separate terminal:

```bash
stripe login   # one-time browser auth

stripe listen \
  --forward-to http://localhost:3000/api/webhooks/stripe
```

Copy the **webhook signing secret** printed (starts with `whsec_`) and set it in `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

### 4b. Start the dev server (if not already running)

```bash
npm run dev
```

### 4c. Trigger a test checkout

1. Go to `http://localhost:3000/pricing` and click **Upgrade to Creator**.
2. Use Stripe's test card: `4242 4242 4242 4242`, any future expiry, any CVC.
3. Complete the checkout.
4. Confirm the Stripe CLI terminal shows `checkout.session.completed` → 200.
5. Verify subscription in the database:
   ```bash
   psql -U postgres -d replyflow -c "SELECT plan, \"customerId\" FROM \"Subscription\";"
   ```
   `plan` should be `PRO`.

### 4d. Test subscription cancellation

```bash
# Find your customer ID from the subscription row above, then:
stripe subscriptions list --customer cus_xxxx

# Cancel it
stripe subscriptions cancel sub_xxxx

# Confirm event fires
# Stripe CLI should show customer.subscription.deleted → 200
# DB plan should revert to FREE
```

---

## 5. Meta OAuth — Instagram Integration

### 5a. Set up ngrok

In a separate terminal:

```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL (e.g. `https://abc123.ngrok-free.app`).

### 5b. Update .env.local with ngrok URL

```
NEXT_PUBLIC_HOST_URL=https://abc123.ngrok-free.app
META_REDIRECT_URI=https://abc123.ngrok-free.app/callback/instagram
INSTAGRAM_EMBEDDED_OAUTH_URL=https://www.instagram.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://abc123.ngrok-free.app/callback/instagram&scope=instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages&response_type=code
```

Restart `npm run dev` after changing env vars.

### 5c. Configure Meta app

1. Go to [developers.facebook.com](https://developers.facebook.com) → your app.
2. **Instagram Login / Business Login** → Add Platform → Website → Site URL = your ngrok URL.
3. **Valid OAuth Redirect URIs** → add: `https://abc123.ngrok-free.app/callback/instagram`
4. **Instagram Test Users** → add yourself as a tester.
5. Accept the tester invite from your Instagram account settings.

### 5d. Connect Instagram from the dashboard

1. Open `https://abc123.ngrok-free.app/dashboard/{your-slug}/integrations`.
2. Click **Connect Instagram**.
3. Authorize in the popup.
4. You should be redirected back and see your Instagram account listed.
5. Verify in the database:
   ```bash
   psql -U postgres -d replyflow -c "SELECT \"instagramId\", \"expiresAt\" FROM \"Integrations\";"
   ```

---

## 6. ngrok — Meta Webhook Testing

### 6a. Configure the Meta webhook endpoint

1. In your Meta app → **Webhooks** → Product Settings.
2. Callback URL: `https://abc123.ngrok-free.app/api/webhooks/meta`
3. Verify Token: the value you set in `META_VERIFY_TOKEN`
4. Subscribe to fields: `comments`, `messages`
5. Click **Verify and Save** — Meta sends a GET challenge and the app must return it.

Check the app terminal for:
```
[webhook] GET verify: mode=subscribe token_match=true
```

Current safe log shape:
```
[webhook] GET verify { mode: 'subscribe', token_match: true, challenge_exists: true }
```

### 6b. Subscribe to your Instagram account

In Meta Webhooks dashboard, subscribe your Instagram business/creator account to the webhook.

### 6c. Send a test event from Meta

Meta Developer Console → Webhooks → **Send Test** → select `comments` field.

Check the app terminal for:
```
[webhook] POST comments igAccountId=...
[webhook] automation match: none (no automation configured yet)
```

---

## 7. Create Your First Automation

1. Make sure your Instagram account is connected (Step 5).
2. Go to `http://localhost:3000/dashboard/{slug}/automation/new`.
3. Complete the wizard:
   - **Step 1 — Post**: pick a recent Instagram post from the list.
   - **Step 2 — Keywords**: enter a keyword (e.g. `info`), choose CONTAINS mode.
   - **Step 3 — DM Message**: write your DM (e.g. `Hey {{username}}, here's the link: {{link}}`).
   - **Step 4 — CTA Link** (optional): add a URL.
   - **Step 5 — Review**: confirm all settings.
   - **Step 6 — Activate**: toggle the automation ON.
4. The automation row in the DB should have `active = true`.

---

## 8. Test a Real Instagram Comment Trigger

### 8a. Go live flow

1. Ensure ngrok is running and the Meta webhook is verified (Steps 5–6).
2. Ensure your automation is active on a specific post (Step 7).
3. On the Instagram app (from a **different account** — not the connected business account), comment on the post with your keyword (e.g. `info`).

### 8b. What to watch

**App terminal:**
```
[webhook] POST comments igAccountId=<id>
[webhook] automation match: <automation-id> keyword="info"
[webhook] DM_SENT recipientId=<commenter-ig-id>
```

**Database verification:**
```bash
# Should show COMMENT_RECEIVED, DM_SENT events
psql -U postgres -d replyflow -c "
  SELECT \"eventType\", \"igUserId\", \"keyword\", \"createdAt\"
  FROM \"AutomationEvent\"
  ORDER BY \"createdAt\" DESC
  LIMIT 5;
"

# Should show a new Lead
psql -U postgres -d replyflow -c "
  SELECT \"igUsername\", \"commentText\", \"createdAt\"
  FROM \"Lead\"
  ORDER BY \"createdAt\" DESC
  LIMIT 5;
"
```

**Instagram:** the commenter should receive a DM within seconds.

If the post list is empty in Step 1, use the manual media ID fallback. Paste the Instagram media ID shown by the Graph API. A post URL can be saved as a reference, but webhook matching is most reliable with the Meta media ID because comment webhooks identify the media by ID.

### 8c. Test DM trigger (instead of comment)

Send a DM directly to your connected business Instagram account from a different account, using your configured keyword. The app should auto-reply.

---

## 9. Full Environment Checklist

Before considering a test session complete, verify:

- [ ] `npm run build` passes with no errors
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `npx vitest run` all tests pass
- [ ] Clerk sign-up and sign-in work
- [ ] Stripe checkout upgrades plan to PRO
- [ ] Stripe cancellation reverts plan to FREE
- [ ] Instagram OAuth connects and stores `instagramId`
- [ ] Meta webhook GET verification returns 200
- [ ] Meta webhook POST processes a comment event
- [ ] Automation triggers DM on real comment
- [ ] Dashboard analytics show real event counts

---

## 10. Vercel Production Deployment

After local testing passes:

```bash
# Push all env vars to Vercel
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
vercel env add CLERK_SECRET_KEY production
# ... repeat for all vars in .env.example

# Or pull from local to sync
vercel env pull .env.production.local

# Deploy
vercel --prod
```

Update the following in production:
- Vercel env → `NEXT_PUBLIC_HOST_URL=https://ap3k.com`
- Vercel env → `META_REDIRECT_URI=https://ap3k.com/callback/instagram`
- Vercel env → `INSTAGRAM_EMBEDDED_OAUTH_URL=https://www.instagram.com/oauth/authorize?...&redirect_uri=https://ap3k.com/callback/instagram&...`
- Clerk → **Allowed callback URLs** → add `https://ap3k.com`
- Meta app → **Valid OAuth Redirect URIs** → add `https://ap3k.com/callback/instagram`
- Meta Webhooks → update Callback URL to `https://ap3k.com/api/webhooks/meta`
- Stripe Dashboard → Webhooks → add `https://ap3k.com/api/webhooks/stripe`
- Stripe Dashboard → Webhooks → subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.paused`, `customer.subscription.resumed`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`

Production endpoint reference:

```text
NEXT_PUBLIC_HOST_URL=https://ap3k.com
META_REDIRECT_URI=https://ap3k.com/callback/instagram
INSTAGRAM_EMBEDDED_OAUTH_URL=https://www.instagram.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://ap3k.com/callback/instagram&scope=instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages&response_type=code
STRIPE_WEBHOOK_URL=https://ap3k.com/api/webhooks/stripe
META_WEBHOOK_URL=https://ap3k.com/api/webhooks/meta
```
