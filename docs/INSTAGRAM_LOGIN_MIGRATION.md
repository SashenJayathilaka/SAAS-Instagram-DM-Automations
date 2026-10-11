# AP3k Instagram Login migration

This checklist is the target product flow for AP3k.

## Goal

Users should not need to connect a Facebook Page, choose Page assets, or open Meta Developers.

Target flow:

1. User clicks **Connect Instagram**.
2. User authorizes their Instagram Business or Creator account.
3. AP3k receives an Instagram User access token.
4. AP3K subscribes that Instagram account to `comments,messages,messaging_postbacks` webhooks automatically.
5. User creates a campaign.
6. Instagram comments trigger public replies and private replies through official Instagram APIs.

## Runtime flags

Keep the direct Instagram Login path disabled until Meta Developers is configured and one direct-login test passes.

```env
INSTAGRAM_LOGIN_ENABLED=false
```

Enable only after setup:

```env
INSTAGRAM_LOGIN_ENABLED=true
```

## Required environment variables

```env
META_VERIFY_TOKEN=<same secret entered in Meta webhook config>
NEXT_PUBLIC_HOST_URL=https://ap3k.com

INSTAGRAM_LOGIN_ENABLED=true
INSTAGRAM_APP_ID=<Instagram app ID from Instagram API setup>
INSTAGRAM_APP_SECRET=<Instagram app secret, or leave unset if META_APP_SECRET is the same>
INSTAGRAM_REDIRECT_URI=https://ap3k.com/callback/instagram
INSTAGRAM_GRAPH_BASE_URL=https://graph.instagram.com
INSTAGRAM_GRAPH_VERSION=v25.0
INSTAGRAM_OAUTH_URL=https://www.instagram.com/oauth/authorize
INSTAGRAM_OAUTH_TOKEN_URL=https://api.instagram.com/oauth/access_token
INSTAGRAM_LOGIN_SCOPES=instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages
```

## Meta Developers setup path

1. Open **Meta Developers**.
2. Open the AP3k app.
3. Go to **Use cases**.
4. Open **Instagram API**.
5. Choose **API setup with Instagram login**.
6. Add this redirect URI:

```text
https://ap3k.com/callback/instagram
```

7. Add webhook callback:

```text
https://ap3k.com/api/webhooks/meta
```

8. Use the same verify token as `META_VERIFY_TOKEN` in Vercel.
9. Subscribe webhook fields:

```text
comments
messages
```

10. Request these permissions in App Review:

```text
instagram_business_basic
instagram_business_manage_comments
instagram_business_manage_messages
```

## Code architecture

Direct Instagram Login code lives in:

```text
lib/instagram-login.ts
```

It handles:

- OAuth URL generation.
- Code exchange through `api.instagram.com/oauth/access_token`.
- Long-lived Instagram token exchange.
- Instagram profile lookup through `graph.instagram.com`.
- Automatic webhook subscription with `/{ig_user_id}/subscribed_apps`.

The existing integration callback in:

```text
actions/integration/index.ts
```

keeps both paths:

- `INSTAGRAM_LOGIN_ENABLED=false`: legacy Facebook Login for Business.
- `INSTAGRAM_LOGIN_ENABLED=true`: direct Business Login for Instagram.

Outbound senders now support both hosts:

```text
lib/fetch.ts
lib/instagram-dm.ts
```

They try the legacy Facebook Graph host first for compatibility, then fall back to `graph.instagram.com` on token/host/capability-shaped errors.

## App Review screencast target

Show this exact flow:

1. Open AP3k.
2. Click **Connect Instagram**.
3. Complete Instagram Login.
4. Show the connected Instagram username.
5. Create or open a campaign.
6. Show the keyword.
7. Show public reply enabled.
8. Show private reply after comment enabled.
9. Comment the keyword from another Instagram account.
10. Show AP3k activity receiving the comment.
11. Show public reply on Instagram.
12. Show private reply delivered in the native Instagram inbox.

## Rollback safety

Do not delete the legacy Facebook Login code yet. Keep it as fallback until:

- Direct Instagram Login OAuth succeeds in production.
- `subscribed_apps` succeeds for a non-dashboard Instagram professional account.
- Comment webhooks arrive for that account without manually toggling Webhook Subscription in Meta Developers.
- Public reply succeeds through AP3k.
- Private reply succeeds after Meta grants `instagram_business_manage_messages`.
