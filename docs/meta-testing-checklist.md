# AP3k — Meta Webhook & Real Comment Testing Checklist

## Target Account Details

| Field | Value |
|-------|-------|
| Instagram username | `@ceptice` |
| Facebook Page | Ceptice |
| Facebook Page ID | `100121532610908` |
| IG Business Account ID | `17841451766608292` |
| Callback URL | `https://ap3k.com/api/webhooks/meta` |

---

## Required Vercel Environment Variables

| Variable | Purpose |
|----------|---------|
| `META_VERIFY_TOKEN` | Webhook verify token (matches what you set in Meta Developers) |
| `META_APP_ID` | Facebook App ID (Meta Developers → App Settings → Basic) |
| `META_APP_SECRET` | Facebook App Secret (signs/verifies webhook payloads) |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_HOST_URL` | `https://ap3k.com` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |

Optional fallback secrets (tried if `META_APP_SECRET` is missing):
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_CLIENT_SECRET`

---

## Step 1 — Verify Route Health

```
GET https://ap3k.com/api/webhooks/meta/health
```

Expected:
```json
{
  "ok": true,
  "route": "/api/webhooks/meta",
  "routeVersion": "2026-05-tenant-diagnostics-v2",
  "timestamp": "..."
}
```

Owner-only diagnostics now live behind owner-admin authentication:

```
GET https://ap3k.com/api/admin/meta-health
```

---

## Step 2 — Verify GET Challenge Endpoint

```
GET https://ap3k.com/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=123456
```

Expected: plain text `123456` with HTTP 200.

---

## Step 3 — Run Admin Signed Self-Test

1. Go to `/admin` → Webhooks tab
2. Click **Run webhook self-test**
3. Expected: `ok: true`, `responseStatus: 200`

If self-test passes, the route is reachable and signature verification is working.

---

## Step 4 — Meta Developers Configuration (CRITICAL)

### Which webhook product/object to use

**Do NOT use the "User" webhook object/product for Instagram comment automation.**

Use one of:
- **Instagram API** → API setup with Facebook login → Configure webhooks
- **Page** (if Meta shows this option for your setup)

Instagram comment webhooks fire on the **Instagram** or **Page** object depending on how Meta routes them.

### Exact configuration steps

1. Go to **Meta Developers → AP3k → Use cases → Instagram API**
2. Open **API setup with Facebook login**
3. Open **Configure webhooks**
4. Set **Callback URL**: `https://ap3k.com/api/webhooks/meta`
5. Set **Verify Token**: value of `META_VERIFY_TOKEN` in Vercel
6. Click **Verify and Save** — this triggers a GET that should appear in `/admin` as `WEBHOOK_VERIFY_GET PROCESSED`
7. Subscribe **comments** field
8. Subscribe **messages** field

### App mode

- If app is in **Development mode**: only accepted testers can trigger real webhooks
- Add testers: Meta Developers → App Roles → Testers (Facebook account) AND Instagram Tester (Instagram account)
- OR: submit for App Review to go **Live**

---

## Step 5 — Meta Test Button

In Meta Developers → Webhooks, click the test button for the `comments` field.

Expected in `/admin` Webhooks tab: a `META_TEST_EVENT` event with `status=RECEIVED`.

> Note: The Meta Test button sends fake payloads (`entry.id=0`, `media.id=123123123`). These are correctly classified as `META_TEST_EVENT`, not `REAL_COMMENT_EVENT`. This is correct behavior.

---

## Step 6 — Run Real Comment Test

### Prerequisites

Before testing, in Admin:
1. **Integration connected**: @ceptice with valid page token
2. **Active campaign**: Any Post, keyword `ai`, matching CONTAINS
3. **Checklist passes**: GET verify = PROCESSED, no signature failures

### Test procedure

1. Click **Start test window** in `/admin` Overview tab
2. From a **separate Instagram account** (not @ceptice) that is accepted as a tester:
3. Find any real post or Reel owned by @ceptice
4. Comment exactly `ai` on that post
5. Wait 30–60 seconds for Meta to deliver the webhook
6. Go to `/admin` → Webhooks tab (test window filter will be active)

### Expected pipeline

| Step | Event |
|------|-------|
| 1 | `WEBHOOK_POST_RECEIVED_RAW` — proves POST received |
| 2 | `REAL_COMMENT_EVENT` — classified as real, not synthetic |
| 3 | `WEBHOOK_RECEIVED` AutomationEvent |
| 4 | `KEYWORD_MATCHED` AutomationEvent |
| 5 | Lead created |
| 6 | `DM_SENT` or `DM_FAILED` with reason in MessageLog |

### Verdict badge progression

| Badge | Meaning |
|-------|---------|
| A — AP3k route works; waiting for Meta real delivery | Self-test passed but no real comment arrived |
| B — Meta delivering comments; matching failed | Real comment arrived but no integration/campaign matched |
| C — Keyword matched; DM failed | Matching worked but DM send failed |
| D — End-to-end working | Real comment → keyword match → DM sent |

---

## Integration Matching — How AP3k Finds the Right User

When Meta sends a real comment webhook, AP3k tries to match the `entry.id` against:

1. `integration.pageId` — Facebook Page ID (used when `object=page`)
2. `integration.webhookAccountId` — auto-stored after first successful match
3. `integration.instagramId` — IG Business Account ID (`17841451766608292`) — used when `object=instagram`
4. `integration.businessId` — fallback

If no match: `no_matching_integration` error. Check that your integration has the correct Page ID and IG Business ID stored.

---

## Diagnosing `no_matching_integration`

In `/admin` Webhooks tab, look at the `REAL_COMMENT_EVENT` payload (expand "Sanitized payload"):

- `incomingPageId` — the ID Meta sent as `entry.id`
- `allCandidatePageIds` — what AP3k has stored as Page IDs
- `allCandidateInstagramIds` — what AP3k has stored as IG Business IDs
- `matchingIntegrationFound` — if false, the incoming ID doesn't match any stored ID

Fix: reconnect Instagram so the correct IDs are stored.

---

## Diagnosing `no_active_automation_for_media`

Integration matched but no active campaign matches this media.

- If campaign has **Any Post**: matches any `mediaId` — should always match
- If campaign has **Specific Post**: the stored post ID must match the incoming `mediaId`

Check the campaign's post setting in the dashboard.

---

## Diagnosing DM failure

When `KEYWORD_MATCHED` exists but DM fails:

- Check MessageLog error in `/admin` Leads & Messages tab
- Common reasons:
  - `permission_denied` — instagram_manage_messages scope not granted or app not live
  - `24_hour_window` — user has not messaged the account first (for `sendDm` path)
  - `comment_id_invalid` — comment ID not recognized by Meta
  - `rate_limited` — Meta API rate limit exceeded
  - `token_expired` — page access token expired (reconnect Instagram)

---

## OAuth Scopes (Do not change)

Required:
```
pages_show_list
pages_read_engagement
business_management
instagram_basic
instagram_manage_comments
instagram_manage_messages
```

Do NOT add:
- `pages_manage_metadata` — not available in Meta app permissions UI
- `instagram_business_basic` — wrong scope family for Facebook Login for Business
- `instagram_business_manage_comments` — wrong scope family
- `instagram_business_manage_messages` — wrong scope family
- `instagram_content_publish` — not needed

---

## Subscription Mode Notes

AP3k currently uses **META_DASHBOARD_MANAGED** mode because `pages_manage_metadata` is unavailable.

Manual steps required in Meta Developers:
1. Meta Developers → AP3k → Instagram API → Webhooks
2. Find the connected Instagram account
3. Confirm the webhook toggle is **ON**
4. Confirm `comments` and `messages` fields are subscribed
