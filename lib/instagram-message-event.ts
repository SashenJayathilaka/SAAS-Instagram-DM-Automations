// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParsedMessagingData = {
  senderId: string;
  recipientId?: string;
  messageText?: string;
  messageMid?: string;
  messageTimestamp?: number;
  postback?: { payload?: string; title?: string };
  quickReplyPayload?: string;
  attachments: Array<{ type?: string; url?: string; mediaId?: string }>;
  replyToStory?: { id?: string; url?: string };
  storyMention: boolean;
  isEcho: boolean;
  systemEventType?: "DELIVERY" | "READ" | "REACTION";
};

export type MessagingDiagnostics = {
  hasSenderId: boolean;
  hasRecipientId: boolean;
  hasMessageText: boolean;
  hasMessageMid: boolean;
  hasTimestamp: boolean;
  hasPostback: boolean;
  hasQuickReply: boolean;
  hasAttachments: boolean;
  hasStoryContext: boolean;
  isEcho: boolean;
  hasSystemEvent: boolean;
};

export type MessagingParseResult =
  | { ok: true; data: ParsedMessagingData; diagnostics: MessagingDiagnostics }
  | { ok: false; reason: string; diagnostics: MessagingDiagnostics };

const EMPTY_DIAGNOSTICS: MessagingDiagnostics = {
  hasSenderId: false,
  hasRecipientId: false,
  hasMessageText: false,
  hasMessageMid: false,
  hasTimestamp: false,
  hasPostback: false,
  hasQuickReply: false,
  hasAttachments: false,
  hasStoryContext: false,
  isEcho: false,
  hasSystemEvent: false,
};

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parses a single entry from entry.messaging[] into structured, typed data.
 *
 * Instagram inbound DM webhooks arrive in entry.messaging (not entry.changes).
 * The shape is:
 *   { sender: { id }, recipient: { id }, message: { mid, text, is_echo }, timestamp }
 *   or for postbacks:
 *   { sender: { id }, recipient: { id }, postback: { payload, title }, timestamp }
 *
 * Returns ok:false with a reason string when the item cannot be used.
 * Never throws — all field access is defensive.
 */
export function parseMessagingItem(item: unknown): MessagingParseResult {
  if (!item || typeof item !== "object") {
    return { ok: false, reason: "messaging_item_not_object", diagnostics: EMPTY_DIAGNOSTICS };
  }

  const m = item as Record<string, any>;

  const senderId = m.sender?.id ? String(m.sender.id) : undefined;
  const recipientId = m.recipient?.id ? String(m.recipient.id) : undefined;
  const messageText = typeof m.message?.text === "string" ? m.message.text : undefined;
  const messageMid = typeof m.message?.mid === "string" ? m.message.mid : undefined;
  const messageTimestamp = typeof m.timestamp === "number" ? m.timestamp : undefined;
  const isEcho = Boolean(m.message?.is_echo);
  const quickReplyPayload = typeof m.message?.quick_reply?.payload === "string"
    ? m.message.quick_reply.payload
    : undefined;
  const attachments: Array<{ type?: string; url?: string; mediaId?: string }> = Array.isArray(m.message?.attachments)
    ? m.message.attachments.map((attachment: any) => ({
        type: typeof attachment?.type === "string" ? attachment.type : undefined,
        mediaId: typeof attachment?.payload?.ig_post_media_id === "string" ? attachment.payload.ig_post_media_id : undefined,
        url: typeof attachment?.payload?.url === "string" ? attachment.payload.url : undefined,
      }))
    : [];
  const story = m.message?.reply_to?.story;
  const replyToStory = story && typeof story === "object"
    ? {
        id: typeof story.id === "string" ? story.id : undefined,
        url: typeof story.url === "string" ? story.url : undefined,
      }
    : undefined;
  const storyMention = attachments.some((attachment) => attachment.type === "story_mention");
  const postback =
    m.postback && typeof m.postback === "object"
      ? {
          payload: typeof m.postback.payload === "string" ? m.postback.payload : undefined,
          title: typeof m.postback.title === "string" ? m.postback.title : undefined,
        }
      : undefined;
  const systemEventType = m.delivery && typeof m.delivery === "object"
    ? "DELIVERY"
    : m.read && typeof m.read === "object"
      ? "READ"
      : m.reaction && typeof m.reaction === "object"
        ? "REACTION"
        : undefined;

  const diagnostics: MessagingDiagnostics = {
    hasSenderId: Boolean(senderId),
    hasRecipientId: Boolean(recipientId),
    hasMessageText: Boolean(messageText),
    hasMessageMid: Boolean(messageMid),
    hasTimestamp: messageTimestamp !== undefined,
    hasPostback: Boolean(postback),
    hasQuickReply: Boolean(quickReplyPayload),
    hasAttachments: attachments.length > 0,
    hasStoryContext: Boolean(replyToStory) || storyMention,
    isEcho,
    hasSystemEvent: Boolean(systemEventType),
  };

  if (!senderId) {
    return { ok: false, reason: "missing_sender_id", diagnostics };
  }

  return {
    ok: true,
    data: {
      senderId,
      recipientId,
      messageText,
      messageMid,
      messageTimestamp,
      postback,
      quickReplyPayload,
      attachments,
      replyToStory,
      storyMention,
      isEcho,
      systemEventType,
    },
    diagnostics,
  };
}

// ---------------------------------------------------------------------------
// Error reason constants — used in webhook route and admin queries
// ---------------------------------------------------------------------------

export const INBOUND_MESSAGE_NO_AUTOMATION = "inbound_message_received_no_dm_automation" as const;
export const INBOUND_MESSAGE_ECHO_SKIPPED = "echo_message_skipped" as const;
export const INBOUND_SYSTEM_EVENT_SKIPPED = "inbound_system_event_skipped" as const;

export type StoryInteractionType = "MENTION" | "REACTION" | "REPLY";

/** Story reactions arrive as emoji-only story replies; generic message reactions are not story interactions. */
export function classifyStoryInteraction(data: ParsedMessagingData): StoryInteractionType | null {
  if (data.storyMention) return "MENTION";
  if (!data.replyToStory) return null;
  return isEmojiOnly(data.messageText) ? "REACTION" : "REPLY";
}

function isEmojiOnly(value?: string) {
  const text = value?.trim();
  if (!text) return false;
  return Array.from(text).every((character) => {
    if (/\s/.test(character) || character === "\uFE0F" || character === "\u200D") return true;
    const codePoint = character.codePointAt(0) ?? 0;
    return (
      (codePoint >= 0x1f000 && codePoint <= 0x1faff) ||
      (codePoint >= 0x2600 && codePoint <= 0x27ff) ||
      (codePoint >= 0x2300 && codePoint <= 0x23ff) ||
      (codePoint >= 0x2b00 && codePoint <= 0x2bff)
    );
  });
}
