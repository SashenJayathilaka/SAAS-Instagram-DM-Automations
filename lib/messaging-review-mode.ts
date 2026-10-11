const PUBLIC_REPLY_META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
  "instagram_basic",
  "instagram_manage_comments",
] as const;

export const DEFAULT_MESSAGING_REVIEW_PRIVATE_REPLY =
  "Thanks for commenting. Here is the information you requested.";

export function isMessagingReviewMode() {
  return process.env.NEXT_PUBLIC_MESSAGING_REVIEW_MODE === "true";
}

export function applyMessagingReviewCampaignDefaults(
  input: { sendPrivateDm: boolean; prompt: string },
  enabled = isMessagingReviewMode()
) {
  if (!enabled) return input;

  return {
    sendPrivateDm: true,
    prompt:
      input.prompt.trim() ||
      DEFAULT_MESSAGING_REVIEW_PRIVATE_REPLY,
  };
}

export function getMetaBusinessOAuthScopes() {
  return isMessagingReviewMode()
    ? [...PUBLIC_REPLY_META_SCOPES, "instagram_manage_messages"]
    : [...PUBLIC_REPLY_META_SCOPES];
}
