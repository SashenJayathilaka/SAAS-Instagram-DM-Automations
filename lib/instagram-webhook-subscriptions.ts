export const INSTAGRAM_WEBHOOK_FIELDS = [
  "comments",
  "messages",
  "messaging_postbacks",
  "messaging_seen",
  "message_reactions",
] as const;

export const INSTAGRAM_WEBHOOK_FIELDS_CSV = INSTAGRAM_WEBHOOK_FIELDS.join(",");

export function hasInstagramWebhookField(
  fields: Iterable<string>,
  expected: (typeof INSTAGRAM_WEBHOOK_FIELDS)[number],
) {
  return new Set(Array.from(fields, (field) => field.trim())).has(expected);
}
