import { z } from "zod";

export const conversationStarterSchema = z.object({
  id: z.string().uuid(),
  text: z.string().trim().min(1).max(80),
  reply: z.string().trim().min(1).max(1000),
});
export const conversationStartersSchema = z.object({
  version: z.literal(1),
  items: z.array(conversationStarterSchema).max(4).refine(items => new Set(items.map(item => item.id)).size === items.length, "Starter IDs must be unique."),
});
export type ConversationStarter = z.infer<typeof conversationStarterSchema>;
export type ConversationStarters = z.infer<typeof conversationStartersSchema>;
export const STARTER_PAYLOAD_PREFIX = "AP3K_STARTER:";
export function readConversationStarters(raw: unknown): ConversationStarters {
  const result = conversationStartersSchema.safeParse(raw);
  return result.success ? result.data : { version: 1, items: [] };
}
export function conversationStarterPayload(id: string) { return `${STARTER_PAYLOAD_PREFIX}${id}`; }
export function conversationStarterId(payload: string): string | null {
  if (!payload.startsWith(STARTER_PAYLOAD_PREFIX)) return null;
  const result = z.string().uuid().safeParse(payload.slice(STARTER_PAYLOAD_PREFIX.length));
  return result.success ? result.data : null;
}
/** Meta's locale-aware Instagram Messenger Profile API structure.
 * Primary references:
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/ice-breakers/
 * https://github.com/fbsamples/messenger-platform-samples/blob/main/postman/instagram-platform-api.postman_collection.json
 */
export function conversationStarterProfile(items: ConversationStarter[]) {
  return { platform: "instagram", ice_breakers: [{ locale: "default", call_to_actions: items.map(item => ({ question: item.text, payload: conversationStarterPayload(item.id) })) }] };
}
