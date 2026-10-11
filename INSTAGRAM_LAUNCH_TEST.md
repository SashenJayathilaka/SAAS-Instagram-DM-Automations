# AP3k — Instagram Launch Test

Production domain:

```text
NEXT_PUBLIC_HOST_URL=https://ap3k.com
META_REDIRECT_URI=https://ap3k.com/callback/instagram
META_WEBHOOK_URL=https://ap3k.com/api/webhooks/meta
```

## 1. Meta App Setup

1. Open Meta for Developers and select the AP3k app.
2. Add the Instagram product/API flow used for Instagram Login or Business Login.
3. Confirm the app has a Privacy Policy URL, Terms URL, icon, and business details before public App Review.

## 2. Required Products And Features

Enable the Meta products/features needed for:

- Instagram login/profile/media access
- Instagram comment management
- Instagram messaging/private replies
- Webhooks for Instagram events

## 3. OAuth Redirect URI

Register this exact redirect URI, with no trailing slash:

```text
https://ap3k.com/callback/instagram
```

AP3k also expects:

```text
META_REDIRECT_URI=https://ap3k.com/callback/instagram
INSTAGRAM_EMBEDDED_OAUTH_URL=<OAuth URL whose redirect_uri is https://ap3k.com/callback/instagram>
```

## 4. Webhook Callback URL

Register:

```text
https://ap3k.com/api/webhooks/meta
```

## 5. Verify Token

Set any strong random value in both places:

- Meta webhook configuration → Verify Token
- Vercel Production env → `META_VERIFY_TOKEN`

The app logs verification safely:

```text
[webhook] GET verify { mode, token_match, challenge_exists }
```

## 6. Required Webhook Fields / Events

In Meta Developers, subscribe the Instagram product/webhooks to these fields:

- `comments`
- `messages`

AP3k verifies every POST with `x-hub-signature-256` using `META_APP_SECRET`. If the
signature is missing or invalid, the webhook returns `401` and stores a safe
`SIGNATURE_VERIFICATION_FAILED` receipt without logging secrets or payload tokens.

Use Meta's test event sender first, then test a real comment from another Instagram account.

## 7. Instagram Account Requirements

- The connected Instagram account must be Business or Creator.
- The commenter must be a real account that can receive DMs from the connected account.
- In Meta app Development mode, both the connected account and the commenter/tester may need to be added as app/test users.

## 8. Facebook Page Connection

Some Meta app setups require the Instagram Business/Creator account to be connected to a Facebook Page for account discovery, webhook subscriptions, and page-level permissions. If media or webhook subscription discovery fails, verify the Page connection in Meta Business settings.

## 9. Test User Setup

1. Add the Instagram owner account as a tester or app role.
2. Add the separate commenter account as a tester when the app is in Development mode.
3. Accept all tester invites from Instagram/Facebook before testing.

## 10. First Real Comment-To-DM Test

1. In Vercel Production env, set:
   ```text
   META_APP_ID=
   INSTAGRAM_APP_ID=
   META_APP_SECRET=
   META_VERIFY_TOKEN=
   META_REDIRECT_URI=https://ap3k.com/callback/instagram
   INSTAGRAM_EMBEDDED_OAUTH_URL=
   NEXT_PUBLIC_HOST_URL=https://ap3k.com
   ```
2. Redeploy production after env changes.
3. Go to `https://ap3k.com/dashboard`.
4. Open Integrations and click Connect Instagram.
5. Confirm the integration row exists:
   ```sql
   SELECT "instagramId", "expiresAt" FROM "Integrations";
   ```
6. Create a campaign:
   - Choose a post/Reel from the picker.
   - If media fetching fails, paste the Meta media ID in the manual fallback.
   - Add a keyword such as `guide`.
   - Use `CONTAINS` matching.
   - Write the DM message.
   - Optionally write a public comment reply.
   - Activate the campaign.
7. From a different Instagram account, comment the keyword on the selected post.
8. Confirm:
   - The commenter receives the private reply/DM.
   - Public reply appears if configured.
   - Dashboard Meta review flow marks View Logs after activity arrives.
   - Campaign detail shows the visual flow and live automation log.
   - Database rows exist:
     ```sql
     SELECT * FROM "WebhookEvent" ORDER BY "createdAt" DESC LIMIT 10;
     SELECT * FROM "Lead" ORDER BY "createdAt" DESC LIMIT 5;
     SELECT * FROM "AutomationEvent" ORDER BY "createdAt" DESC LIMIT 10;
     SELECT * FROM "MessageLog" ORDER BY "createdAt" DESC LIMIT 10;
     ```
   - The campaign detail page shows:
     - Webhook Received
     - Keyword Matched
     - Dm Sent or Dm Failed

## 11. Debugging Table

| Symptom | Likely Cause | Check |
|---|---|---|
| Webhook verification returns 403 | Verify token mismatch | Compare Meta Verify Token with `META_VERIFY_TOKEN`; check `token_match` log |
| Webhook POST returns 401 | Meta signature missing/invalid or wrong app secret | Confirm `META_APP_SECRET` belongs to the same Meta app sending webhooks |
| OAuth redirect mismatch | Registered URI differs | Meta redirect URI and `META_REDIRECT_URI` must both equal `https://ap3k.com/callback/instagram` |
| Connect succeeds but no posts | Missing media permission or token issue | Check `instagram_business_basic` scope and `[instagram-media]` safe logs |
| Comment webhook arrives but no automation matches | Wrong media ID or inactive campaign | Confirm `Post.postid` equals webhook `media.id` and `Automation.active=true` |
| Keyword does not match | Matching mode or keyword mismatch | Use `CONTAINS` and comment a phrase containing the keyword |
| Private reply fails | Missing messaging permission or DM restriction | Inspect `MessageLog.errorMessage`; no tokens are logged |
| Public reply fails but DM sends | Comment reply permission or deleted comment | Inspect `MessageLog` for `COMMENT_REPLY` failures |
| Duplicate skipped | Same automation/commenter/comment already sent | Inspect `MessageLog` for previous `DM` `SENT` row |
| WebhookEvent exists but no AutomationEvent | Event was unsupported, incomplete, unmatched, or tied to a different media ID | Inspect `WebhookEvent.status` and `WebhookEvent.errorMessage` |

## Live Safety Rules

- AP3k never asks for Instagram passwords.
- AP3k never scrapes Instagram.
- AP3k never sends mass DMs.
- AP3k only replies to users who commented or messaged the connected Instagram account through official Meta APIs.
