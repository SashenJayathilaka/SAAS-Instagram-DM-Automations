# AP3k

AP3k turns Instagram comments into automated DMs, leads, and sales.

---

## Features

- **Comment → DM automation** — trigger a private DM when a keyword is spotted in a comment
- **3 matching modes** — Exact, Contains, and Smart AI (OpenAI-powered intent matching)
- **Template variables** — `{{username}}`, `{{first_name}}`, `{{keyword}}`, `{{link}}` in every DM
- **Optional public reply** — reply to the comment thread at the same time
- **Lead tracking** — every triggered DM is saved as a lead with full event log
- **Analytics** — per-automation stats: triggers, DMs sent, replies sent, leads captured
- **Stripe billing** — FREE (3 automations) and PRO (unlimited) plans

---

## Tech Stack

Next.js 14 · TypeScript · Prisma (PostgreSQL) · Clerk (auth) · Stripe · Meta Graph API · OpenAI · Tailwind CSS · React Query · Vitest

---

## Local Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a hosted DB — Neon, Supabase, etc.)
- A [Meta Developer account](https://developers.facebook.com) with an app
- A [Clerk account](https://clerk.com) with an application
- A [Stripe account](https://stripe.com) in test mode
- (Optional) An [OpenAI API key](https://platform.openai.com) for Smart AI matching

### 2. Clone and Install

```bash
git clone <your-repo-url>
cd SAAS-Instagram-DM-Automations
npm install
```

### 3. Environment Variables

Copy the example and fill in all values:

```bash
cp .env.example .env.local
```

See `.env.example` for the full list with inline documentation. Every variable must be set before running `npm run dev`.

### 4. Database

```bash
# Apply migrations and generate the Prisma client
npx prisma migrate deploy
npx prisma generate
```

To inspect the database locally:

```bash
npx prisma studio
```

### 5. Run Locally

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Meta Developer Setup

### Create a Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**
2. Choose **Business** type
3. Add the **Instagram** product to your app

### Configure OAuth

1. Under **Instagram Login / Business Login**, add an OAuth redirect URI:
   ```
   https://ap3k.com/callback/instagram
   ```
2. Copy the parent Meta **App ID** → `META_APP_ID`
3. Copy the Instagram API setup **Instagram App ID** → `INSTAGRAM_APP_ID`
4. Copy the matching app secret → `INSTAGRAM_APP_SECRET` if Meta shows a separate Instagram app secret; otherwise `META_APP_SECRET` is used.
4. Request the comment-to-DM permissions used by AP3k:
   - `instagram_business_basic`
   - `instagram_business_manage_comments`
   - `instagram_business_manage_messages`

### Configure the Webhook

You need a public HTTPS URL for Meta to send events. Use [ngrok](https://ngrok.com) in development:

```bash
# Install ngrok, then:
ngrok http 3000
```

Copy the `https://xxxx.ngrok.io` URL.

1. Under **Instagram → Webhooks**, add a new subscription:
   - **Callback URL:** `https://ap3k.com/api/webhooks/meta`
   - **Verify Token:** the value you set in `META_VERIFY_TOKEN`
2. Subscribe to `comments` and `messages` fields

Meta will make a GET request to verify the URL — the handler at `/api/webhooks/meta` responds to this automatically.

### Test Accounts

During development, add your personal Instagram account as a **Test User** in the Meta app so it can receive webhooks without going through App Review.

---

## Stripe Setup

### Test Mode Keys

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers → API Keys**
2. Copy the **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`
3. Copy the **Publishable key** (`pk_test_...`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Create Prices

1. Go to **Products → Add Product** → create `AP3k Creator` as a recurring monthly product
2. Copy the Creator **Price ID** (`price_...`) → `STRIPE_PRICE_ID_CREATOR`
3. Create `AP3k Agency` as a recurring monthly product
4. Copy the Agency **Price ID** (`price_...`) → `STRIPE_PRICE_ID_AGENCY`

### Stripe Webhook (Local)

```bash
# Install Stripe CLI, then:
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

Copy the **webhook signing secret** it prints → `STRIPE_WEBHOOK_SECRET`

Events handled:
- `checkout.session.completed` — binds the verified Stripe customer and subscription
- `customer.subscription.created` — syncs a new subscription if it arrives before/after checkout completion
- `customer.subscription.updated`, `customer.subscription.paused`, `customer.subscription.resumed` — sync plan status
- `customer.subscription.deleted` — downgrades to FREE
- `invoice.paid` — syncs access and qualifies an eligible referral reward
- `invoice.payment_failed` — keeps subscription recovery state in sync without issuing a reward
- `charge.refunded`, `charge.dispute.created` — reverse referral rewards tied to refunded or disputed invoices

---

## Running Tests

```bash
npm test           # run once
npm run test:watch # watch mode
```

---

## Vercel Deployment

### 1. Push to GitHub

```bash
git push origin main
```

### 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → import repository
2. Framework: **Next.js** (auto-detected)

### 3. Set Environment Variables

In Vercel → Project → Settings → Environment Variables, add every variable from `.env.example` with production values. Key differences from local:

| Variable | Production value |
|---|---|
| `NEXT_PUBLIC_HOST_URL` | `https://ap3k.com` |
| `META_APP_ID` | Meta app ID |
| `META_APP_SECRET` | Meta app secret |
| `INSTAGRAM_APP_ID` | Instagram app ID from Instagram API setup; used as OAuth `client_id` |
| `INSTAGRAM_APP_SECRET` | Optional Instagram app secret if different from Meta app secret |
| `META_VERIFY_TOKEN` | Same value entered in Meta webhook config |
| `META_REDIRECT_URI` | `https://ap3k.com/callback/instagram` |
| `INSTAGRAM_EMBEDDED_OAUTH_URL` | Full Instagram OAuth URL with `redirect_uri=https://ap3k.com/callback/instagram` |
| `STRIPE_SECRET_KEY` | Live or test secret key from Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Matching live or test publishable key from Stripe |
| `STRIPE_PRICE_ID_CREATOR` | Creator recurring price ID |
| `STRIPE_PRICE_ID_AGENCY` | Agency recurring price ID |
| `STRIPE_WEBHOOK_SECRET` | Secret from Vercel webhook endpoint (see below) |
| `AI_CONFIG_ENCRYPTION_KEY` | 32-byte secret used only to encrypt provider API keys at rest |

### 4. Stripe Webhook (Production)

1. Go to Stripe → **Developers → Webhooks → Add endpoint**
2. URL: `https://ap3k.com/api/webhooks/stripe`
3. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.paused`, `customer.subscription.resumed`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`
4. Copy the signing secret → `STRIPE_WEBHOOK_SECRET` in Vercel env vars

### 5. Meta Webhook (Production)

Update the webhook callback URL in Meta Developer Console:

```text
https://ap3k.com/api/webhooks/meta
```

Use the same verify token value that is stored in `META_VERIFY_TOKEN`.

Subscribe the Instagram webhook to:
- `comments`
- `messages`

Webhook POST requests are verified with Meta's `x-hub-signature-256` header
using `META_APP_SECRET`. Comment and messaging receipts are stored in
`WebhookEvent`, matched campaign activity is stored in `AutomationEvent`, and
send attempts are stored in `MessageLog`.

AP3k only sends a private reply/DM to users who commented or messaged the connected Instagram account. It does not scrape Instagram, log in with passwords, or send unsolicited DMs.

### AP3K AI provider setup

Open **Admin → System & safety → AP3K AI routing**. AP3K stores a separate encrypted key for Google AI Studio, Groq Cloud, and OpenRouter, while routing traffic through only one active provider.

For each provider:

1. Open **Get API key**, create a key on the provider's official site, and paste it into AP3K.
2. Choose a listed model or enter another model ID supported by that provider.
3. Save the configuration, run **Test saved connection**, then select **Make active provider**.

Recommended free starting points:

- Google AI Studio: `gemini-3.5-flash-lite`
- Groq Cloud: `openai/gpt-oss-20b`
- OpenRouter: `openrouter/free`

Gemini 1.5 and 2.0 Flash are intentionally not offered because Google has shut them down. Provider free tiers and model availability can change, so the model field accepts current provider model IDs without requiring a deployment.

### Why real comments may not trigger in Meta development mode

Meta dashboard test webhooks only prove the callback URL and verify token work.
They do not prove that a real Instagram comment is eligible for delivery.

For real comment delivery while the app is still in Development mode, verify:

- The connected Instagram account is Business or Creator.
- The connected account owns the media being commented on.
- The commenter is a separate Instagram account, not the connected business account.
- The commenter has been added as a Meta app admin/developer/tester and accepted the invite.
- The app is subscribed to `comments,messages,messaging_postbacks` for the connected IG user after OAuth.
- Vercel production has `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_REDIRECT_URI`, and `NEXT_PUBLIC_HOST_URL`.

The dashboard Integrations page includes **Resubscribe webhooks** and webhook
health cards. Do not mark delivery fixed until a real comment creates
`WebhookEvent.eventType = REAL_COMMENT_EVENT`.

### Owner Admin

AP3k includes a safe owner-only admin UI at:

```text
/admin
```

Access is server-side restricted to:

```text
ADMIN_EMAILS=officialabde@gmail.com
ADMIN_CLERK_USER_IDS=<optional comma-separated Clerk user IDs>
```

The admin panel shows production counts, users, integrations, campaigns,
webhook events, automation events, message logs, and leads. It masks tokens and
does not expose Prisma Studio or raw secrets publicly.

---

## Project Structure

```
app/
  (website)/          # Public pages: landing, pricing
  (auth)/             # Clerk sign-in / sign-up
  (protected)/        # Auth-gated: dashboard, onboarding, callback
    dashboard/[slug]/ # Per-user slug: campaigns, integrations, settings
    onboarding/       # First-run flow: connect Instagram
  api/
    webhooks/meta/    # Meta comment + DM webhook (GET verify, POST events)
    webhooks/stripe/  # Stripe subscription lifecycle webhook
actions/              # Next.js Server Actions (DB writes + reads)
components/global/    # Reusable UI: wizard-stepper, dm-editor, stat-card, etc.
hooks/                # Client state: use-wizard, use-automation, etc.
lib/                  # Utilities: prisma client, stripe proxy, openai, fetch helpers
prisma/               # Schema + migrations
```

---

## Known Limitations

- **Plan enforcement** — FREE plan limit (3 automations) is tracked in the DB schema but not yet enforced on the backend. Activation is not blocked for FREE users. Marked as TODO.
- **Story reply automations** — the DB schema supports story reply triggers but the wizard UI does not expose them.
- **Token refresh** — Instagram long-lived tokens expire after 60 days. AP3k refreshes near expiry when the user profile is loaded, but users may need to reconnect if Meta revokes a token or permissions change.
- **Legacy Smart AI matching** — the older trigger-matching mode still uses `OPENAI_API_KEY`. AP3K AI comment and DM replies use the encrypted provider selected in the admin dashboard.
