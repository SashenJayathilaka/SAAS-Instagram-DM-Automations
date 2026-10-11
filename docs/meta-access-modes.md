# Meta Access Modes — AP3k Instagram Automation

AP3k uses the **Instagram API with Facebook Login** product (Page access tokens via `/me/accounts`). This is distinct from the Instagram API with Instagram Login product. The two products use different token types, different endpoints, and different permission families.

---

## Permission Family

AP3k uses the **Facebook Login** permission family:

| Permission | Purpose | Access level |
|---|---|---|
| `pages_show_list` | List connected Facebook Pages | Standard |
| `pages_read_engagement` | Read Page engagement data | Standard |
| `instagram_basic` | Read IG Business Account metadata | Standard |
| `instagram_manage_comments` | Read and reply to comments | Standard (threaded replies may require Advanced) |
| `instagram_manage_messages` | Send private DMs | **Advanced — requires App Review for production** |
| `business_management` | Business account access | Standard |

The `instagram_business_*` permissions (e.g. `instagram_business_manage_messages`) belong to the **Instagram Login** product and are **not applicable** to AP3k's architecture. Do not request them.

---

## Standard Access Mode — Public Comment Reply

**Endpoint:** `POST /{mediaId}/comments`  
**Access level:** Standard (no App Review required)  
**Token type:** Facebook Page access token

AP3k uses this as the fallback when the threaded reply fails. The message is posted as a new top-level comment on the media, prefixed with `@{commenterUsername}` to create a visible mention.

```
POST https://graph.facebook.com/v25.0/{mediaId}/comments
Authorization: Bearer {pageAccessToken}

{ "message": "@username Great question! Check your DMs." }
```

**When AP3k uses this:**
- The threaded reply (Advanced Access) fails with any error
- The commenter's username is available in the webhook payload
- Both `commenterId` and `mediaId` are present

**Limitation:** The reply appears as a new top-level comment, not nested under the original comment.

---

## Advanced Access Mode — Threaded Comment Reply

**Endpoint:** `POST /{commentId}/replies`  
**Access level:** Advanced (may require App Review for `instagram_manage_comments`)  
**Token type:** Facebook Page access token

This is the primary public reply method. It posts a reply directly nested under the original comment, which is the expected UX for comment automation.

```
POST https://graph.facebook.com/v25.0/{commentId}/replies
Authorization: Bearer {pageAccessToken}

{ "message": "Check your DMs!" }
```

**When AP3k uses this:** Always attempted first. Falls back to Standard Access @mention comment on failure.

---

## Private DM — Capability Requirements

**Endpoint:** `POST /{ig-business-account-id}/messages`  
**Access level:** Requires `instagram_manage_messages` capability approved in Meta App Dashboard  
**Token type:** Facebook Page access token

```
POST https://graph.facebook.com/v25.0/{igBusinessAccountId}/messages
Authorization: Bearer {pageAccessToken}

{
  "recipient": { "comment_id": "{commentId}" },
  "message": { "text": "Here's the link you asked for!" }
}
```

AP3k tries two shapes:
1. `recipient: { comment_id }` — private reply linked to the comment (preferred)
2. `recipient: { id: commenterId }` — plain direct DM (fallback if primary fails for non-capability reason)

---

## Why Meta Code=3 Happens

`(#3) Application does not have the capability to make this API call` is an **app-level capability block**. It is independent of OAuth scopes.

Two separate layers control DM access:

1. **User scope grant (OAuth):** The user must grant `instagram_manage_messages` during the Facebook Login OAuth flow. AP3k requests this scope. This layer is working.

2. **App capability approval (Meta App Dashboard):** The Meta app itself must have `instagram_manage_messages` enabled and approved in **Meta Developers → Use cases → Instagram API with Facebook Login → Permissions → instagram_manage_messages**. Without this, every DM call returns code=3 regardless of the token.

Code=3 means layer 2 is not approved. It does **not** mean the wrong endpoint or the wrong token is being used.

---

## How to Fix Code=3

### Development mode (immediate, for testing)

1. Go to **Meta Developers → Your App → Use cases → Instagram API with Facebook Login → Customize**
2. Find `instagram_manage_messages` and click **Add**
3. Set access level to **Standard Access** (applies to app Testers, Developers, Admins)
4. Add the commenter's Facebook account under **Meta Developers → App Roles → Testers**
5. Reconnect Instagram in AP3k to issue a fresh Page token with the approved scope

### Production (requires App Review)

1. Set `instagram_manage_messages` to **Advanced Access**
2. Submit an App Review request describing the DM use case
3. After approval, reconnect Instagram to issue a fresh token
4. Confirm the `messages` webhook field is subscribed (in addition to `comments`)

---

## Comment Reply Fallback — How It Works

When the threaded reply (`POST /{commentId}/replies`) fails for any reason, AP3k automatically attempts the Standard Access fallback:

```
sendCommentReply(commentId, text, token)        // Advanced — threaded reply
  ↳ fails? → sendMediaComment(mediaId, "@username " + text, token)  // Standard — @mention
```

The fallback requires:
- `commenterUsername` to be present in the webhook payload (field: `from.username`)
- `mediaId` to be present (field: `media.id`)

If either is missing, no fallback is attempted and the reply is recorded as FAILED.

---

## IG Harness Comparison

IG Harness (reference implementation) avoids App Review blockers by using the **Instagram Login** product instead of Facebook Login:

| | AP3k | IG Harness |
|---|---|---|
| Auth product | Facebook Login (Page tokens) | Instagram Login (user tokens) |
| DM endpoint | `graph.facebook.com/{ig-biz-id}/messages` | `graph.instagram.com/{igUserId}/messages` |
| DM access level | Requires `instagram_manage_messages` Advanced Access | Standard Access in Instagram Login product |
| Public reply | `POST /{commentId}/replies` + fallback `POST /{mediaId}/comments` | `POST /{mediaId}/comments` (Standard) or `POST /{commentId}/replies` (Advanced) |
| Page selection | `/me/accounts` → Page token | Not used (user token directly) |

AP3k is designed around Facebook Login / Page tokens to support multi-Page selection and the full Facebook Business ecosystem. Migrating to Instagram Login would require rewriting the OAuth flow, removing Page selection, and switching token types across all send paths — not warranted for the current use case.

The practical fix for AP3k DM capability is to get `instagram_manage_messages` approved in Meta App Dashboard.
