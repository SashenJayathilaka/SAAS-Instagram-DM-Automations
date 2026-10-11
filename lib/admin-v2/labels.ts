// lib/admin-v2/labels.ts
// Human-readable label maps for admin v2 UI — shared between activity and diagnostics pages.

export const HUMAN_EVENT: Record<string, string> = {
  COMMENT_RECEIVED: "Comment received",
  WEBHOOK_RECEIVED: "Webhook received",
  KEYWORD_MATCHED: "Keyword matched",
  PUBLIC_REPLY_SENT: "Public reply sent",
  DM_SENT: "DM sent",
  DM_FAILED: "DM failed",
  DM_SKIPPED: "DM skipped",
  PUBLIC_REPLY_FAILED: "Reply failed",
  AI_REPLY_GENERATED: "AI reply generated",
  DUPLICATE_SKIPPED: "Duplicate skipped",
  SELF_COMMENT_SKIPPED: "Self-comment skipped",
  COMMENT_SKIPPED: "Comment skipped",
  LOOP_GUARD_TRIGGERED: "Loop guard triggered",
  LOOP_GUARD_PAUSED_CAMPAIGN: "Automation auto-paused",
  NO_MATCH: "No keyword match",
};

export const HUMAN_ERROR: Record<string, string> = {
  PUBLIC_REPLY_SENT: "Public reply sent",
  PUBLIC_REPLY_SKIPPED_SELF_COMMENT: "Skipped: comment author is the connected Instagram account",
  PUBLIC_REPLY_SKIPPED_DUPLICATE_COMMENT: "Skipped: duplicate webhook for the same comment ID",
  PUBLIC_REPLY_SKIPPED_AP3K_GENERATED_REPLY: "Skipped: AP3K-generated public reply",
  PUBLIC_REPLY_SKIPPED_KEYWORD_MISMATCH: "Skipped: keyword mismatch",
  PUBLIC_REPLY_SKIPPED_MEDIA_MISMATCH: "Skipped: media mismatch",
  PUBLIC_REPLY_FAILED_META_API: "Public reply failed: Meta API rejected the request",
  PUBLIC_REPLY_FAILED_RATE_LIMIT: "Public reply failed: Meta rate limit",
  PUBLIC_REPLY_FAILED_UNKNOWN: "Public reply failed: unknown error",
  self_comment_author: "Self-comment: comment from the connected Instagram account",
  duplicate_comment_webhook: "Duplicate: same comment webhook received more than once",
  automation_rate_limit_loop_guard: "Legacy Rate limit: too many replies; historical loop guard event only",
  dm_capability_missing: "Meta DM permission not yet approved for this account",
  commenter_recently_handled: "Legacy skip: commenter was processed recently",
  recent_ap3k_reply_text_match: "Legacy skip: AP3K-generated reply text detected in comment",
  no_keyword_match: "No keyword matched in this comment",
  ap3k_generated_comment: "Skipped: AP3K-generated comment detected",
  webhook_verification_failed: "Webhook verification failed",
  external_dm_tool_enabled: "DM skipped: external tool handles messaging for this automation",
  token_expired: "Access token has expired — reconnect required",
  page_token_missing: "Page access token missing or invalid",
  webhook_subscription_failed: "Webhook subscription could not be established",
  token_exchange_failed: "OAuth token exchange failed during connection",
};

export function humanError(raw: string | null | undefined): string {
  if (!raw) return "—";
  return HUMAN_ERROR[raw] ?? raw.replace(/_/g, " ");
}

export function humanEvent(eventType: string): string {
  return HUMAN_EVENT[eventType] ?? eventType.replace(/_/g, " ").toLowerCase();
}
