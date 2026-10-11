# AP3k — Phase 1 Design Spec
**Date:** 2026-05-13  
**Scope:** Core reliability — webhook hardening, schema additions, duplicate prevention, keyword matching, template variables, analytics foundation  
**Out of scope:** Landing page redesign, dashboard UI overhaul, 3-tier billing, automation wizard

---

## 1. Webhook Route Fix

**Problem:** The webhook is at `app/(protected)/api/webhook/instagram/route.ts`. The `(protected)` route group is matched by Clerk middleware (`/dashboard(.*)`, `/api/payment(.*)`). However, the webhook path `/api/webhook/instagram` does NOT match those patterns — so it may actually be publicly accessible. **Confirmed:** middleware only protects `/api/payment(.*)`, not `/api/webhook/(.*)`. The route is inside the `(protected)` folder but the Clerk matcher does not block it.

**Remaining issue:** The GET handler echoes `hub.challenge` without verifying `hub.verify_token`. This must be fixed.

**Decision:** Move the webhook to `app/api/webhooks/meta/route.ts` (outside `(protected)`) to make intent explicit and remove any future ambiguity. Add `META_VERIFY_TOKEN` check on GET.

---

## 2. Webhook GET — Meta Verification

Current:
```ts
export async function GET(req) {
  const hub = req.nextUrl.searchParams.get("hub.challenge");
  return new NextResponse(hub);
}
```

Fixed:
- Read `hub.mode`, `hub.verify_token`, `hub.challenge`
- If `mode === "subscribe"` and `verify_token === process.env.META_VERIFY_TOKEN`, return `hub.challenge`
- Otherwise return 403

---

## 3. createChatHistory Bug Fix

`createChatHistory(automationId, sender, message, receiver)` — the function signature has parameters in order `(automationId, sender, message, receiver)`, but the Prisma create sets `senderId: sender` and `message: message` and `reciever: receiver`. 

At call sites the order used is: `(automationId, id, senderId, messageText)` — i.e., it passes the Instagram account ID as `sender`, the actual sender's user ID as the `message` field, and the message text as `reciever`. This is backwards.

**Fix:** Correct the argument order at all call sites to match the function signature, OR rename the parameter to eliminate ambiguity. Will fix at both the definition and call sites.

---

## 4. Duplicate Prevention

**Requirement:** Same automation + same commenter + same comment/media should never trigger more than one DM send.

**Implementation:** Add a `DuplicatePrevention` lookup before sending. Use the `MessageLog` model (see §6) as the source of truth. Before sending, query `MessageLog` for `(automationId, recipientIgId, mediaId)`. If a sent record exists, skip and return early.

---

## 5. New Prisma Models

### Lead
```prisma
model Lead {
  id           String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  automationId String     @db.Uuid
  automation   Automation @relation(...)
  igUserId     String
  igUsername   String?
  firstName    String?
  commentText  String?
  mediaId      String?
  createdAt    DateTime   @default(now())
}
```

### AutomationEvent
```prisma
model AutomationEvent {
  id           String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  automationId String          @db.Uuid
  automation   Automation      @relation(...)
  eventType    EVENT_TYPE
  igUserId     String?
  mediaId      String?
  commentId    String?
  keyword      String?
  meta         Json?
  createdAt    DateTime        @default(now())
}

enum EVENT_TYPE {
  COMMENT_RECEIVED
  DM_SENT
  PUBLIC_REPLY_SENT
  DM_FAILED
  PUBLIC_REPLY_FAILED
  DUPLICATE_SKIPPED
  NO_MATCH
}
```

### MessageLog
```prisma
model MessageLog {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  automationId    String         @db.Uuid
  automation      Automation     @relation(...)
  recipientIgId   String
  mediaId         String?
  commentId       String?
  messageType     MESSAGE_TYPE
  status          SEND_STATUS
  errorMessage    String?
  sentAt          DateTime?
  createdAt       DateTime       @default(now())
}

enum MESSAGE_TYPE { DM COMMENT_REPLY }
enum SEND_STATUS  { SENT FAILED SKIPPED }
```

**Automation model additions:**
- `leads          Lead[]`
- `events         AutomationEvent[]`
- `messageLogs    MessageLog[]`

---

## 6. Keyword Matching Modes

Add `matchingMode` to `Automation`:

```prisma
model Automation {
  ...
  matchingMode  MATCHING_MODE  @default(EXACT)
}

enum MATCHING_MODE { EXACT CONTAINS SMART_AI }
```

**Matching logic (webhook):**
- `EXACT`: case-insensitive full-string equality (current behavior)
- `CONTAINS`: the comment text contains the keyword (case-insensitive substring)
- `SMART_AI`: try OpenAI semantic check, fall back to CONTAINS if key missing

`matchKeyword` query updated to accept the comment text + automationId and apply the correct mode.

---

## 7. Template Variables

Support in DM prompt and commentReply fields:
- `{{first_name}}` — from commenter's first name (fetched via Graph API or empty)
- `{{username}}` — commenter's IG username
- `{{keyword}}` — the matched keyword
- `{{link}}` — the CTA link (new field on Listener)

**Implementation:** `resolveTemplate(template, vars)` utility in `lib/template.ts`. Called before sending.

New fields on `Listener`:
- `ctaLink String?` — the URL to substitute for `{{link}}`

---

## 8. Public Comment Reply

Use the Instagram Graph API `POST /{comment-id}/replies` endpoint (official, available on Business/Creator accounts with `instagram_manage_comments` permission).

Only send if `commentReply` is non-null on the Listener. Log result to `MessageLog` with `MESSAGE_TYPE = COMMENT_REPLY`.

---

## 9. Webhook POST — Updated Flow

```
1. Parse body
2. Identify event type (messaging vs changes/comments)
3. For COMMENT events:
   a. Extract mediaId, commentId, commenterId, commentText
   b. Find active automation matching mediaId
   c. Match keyword against automation keywords (using matchingMode)
   d. Check MessageLog for duplicate → if found, log DUPLICATE_SKIPPED event, return 200
   e. Resolve template variables
   f. Send public reply if commentReply set → log result
   g. Send DM → log result  
   h. Upsert Lead record
   i. Return 200 fast
4. For DM events:
   a. Match keyword in automation keywords (exact)
   b. Duplicate check
   c. Send DM
   d. Log
5. SMARTAI path: unchanged, but wrap in try/catch, never crash webhook
6. All errors caught → log to AutomationEvent, return 200 (never 5xx to Meta)
```

---

## 10. Analytics Query

`getAutomationAnalytics(automationId)` — aggregates from MessageLog + AutomationEvent:
- total comments received
- DMs sent / failed
- public replies sent / failed
- duplicates skipped
- leads count

Exposed as a server action, used by existing dashboard metrics cards.

---

## 11. .env.example Updates

Add:
- `META_APP_ID`
- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- `META_REDIRECT_URI`
- `OPENAI_API_KEY` (rename from `OPEN_AI_KEY`)
- `REDIS_URL` (optional, placeholder)

---

## 12. Files Modified / Created

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Lead, AutomationEvent, MessageLog, matchingMode, ctaLink |
| `app/api/webhooks/meta/route.ts` | New canonical webhook (moved + hardened) |
| `app/(protected)/api/webhook/instagram/route.ts` | Redirect to new route or delete |
| `actions/webhook/queries.ts` | Update matchKeyword to support modes, add duplicate check, add logging |
| `lib/template.ts` | New — resolveTemplate utility |
| `lib/fetch.ts` | Add sendCommentReply function |
| `actions/automation/queries.ts` | Add analytics query, add ctaLink to addListener |
| `.env.example` | Add missing vars |

---

## Constraints

- Never return 5xx to Meta — always 200 even on internal error
- Webhook must respond within 5s (do heavy work, but keep it lean)  
- Never expose access tokens to client
- Duplicate check must be atomic (Prisma upsert pattern)
- SMART_AI mode falls back to CONTAINS if `OPENAI_API_KEY` is missing
