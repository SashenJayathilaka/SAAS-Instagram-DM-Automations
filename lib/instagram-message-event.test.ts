import { describe, it, expect } from "vitest";
import {
  parseMessagingItem,
  classifyStoryInteraction,
  INBOUND_MESSAGE_NO_AUTOMATION,
  INBOUND_MESSAGE_ECHO_SKIPPED,
  INBOUND_SYSTEM_EVENT_SKIPPED,
} from "./instagram-message-event";

const SENDER_ID = "17841451234567890";
const RECIPIENT_ID = "17841459999999999";
const MESSAGE_MID = "mid.abc123xyz";
const TIMESTAMP = 1715940000;

function validTextItem(overrides: Record<string, unknown> = {}) {
  return {
    sender: { id: SENDER_ID },
    recipient: { id: RECIPIENT_ID },
    message: { text: "hello ap3k", mid: MESSAGE_MID },
    timestamp: TIMESTAMP,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseMessagingItem
// ---------------------------------------------------------------------------

describe("parseMessagingItem — text messages", () => {
  it("parses all fields from a valid text message event", () => {
    const result = parseMessagingItem(validTextItem());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.senderId).toBe(SENDER_ID);
    expect(result.data.recipientId).toBe(RECIPIENT_ID);
    expect(result.data.messageText).toBe("hello ap3k");
    expect(result.data.messageMid).toBe(MESSAGE_MID);
    expect(result.data.messageTimestamp).toBe(TIMESTAMP);
    expect(result.data.isEcho).toBe(false);
    expect(result.data.postback).toBeUndefined();
  });

  it("sets all diagnostics flags correctly for a full message", () => {
    const result = parseMessagingItem(validTextItem());
    expect(result.diagnostics.hasSenderId).toBe(true);
    expect(result.diagnostics.hasRecipientId).toBe(true);
    expect(result.diagnostics.hasMessageText).toBe(true);
    expect(result.diagnostics.hasMessageMid).toBe(true);
    expect(result.diagnostics.hasTimestamp).toBe(true);
    expect(result.diagnostics.hasPostback).toBe(false);
    expect(result.diagnostics.isEcho).toBe(false);
  });

  it("succeeds with missing optional fields (no recipient, no mid, no timestamp)", () => {
    const result = parseMessagingItem({ sender: { id: SENDER_ID }, message: { text: "hi" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.recipientId).toBeUndefined();
    expect(result.data.messageMid).toBeUndefined();
    expect(result.data.messageTimestamp).toBeUndefined();
  });

  it("returns ok:true even if message text is missing but sender ID is present", () => {
    const result = parseMessagingItem({ sender: { id: SENDER_ID } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.senderId).toBe(SENDER_ID);
    expect(result.data.messageText).toBeUndefined();
    expect(result.diagnostics.hasMessageText).toBe(false);
  });

  // Messaging events must NOT carry comment or media IDs — they are separate paths
  it("does not expose comment or media ID fields (messaging vs comment path separation)", () => {
    const result = parseMessagingItem(validTextItem());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.data as any).commentId).toBeUndefined();
    expect((result.data as any).mediaId).toBeUndefined();
  });
});

describe("parseMessagingItem — postback events", () => {
  it("parses postback payload and title", () => {
    const item = {
      sender: { id: SENDER_ID },
      recipient: { id: RECIPIENT_ID },
      postback: { payload: "BUY_NOW", title: "Buy Now" },
      timestamp: TIMESTAMP,
    };
    const result = parseMessagingItem(item);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.postback?.payload).toBe("BUY_NOW");
    expect(result.data.postback?.title).toBe("Buy Now");
    expect(result.data.messageText).toBeUndefined();
    expect(result.diagnostics.hasPostback).toBe(true);
    expect(result.diagnostics.hasMessageText).toBe(false);
  });
});

describe("story interaction classification", () => {
  it("classifies story mentions from the attachment type", () => {
    const result = parseMessagingItem({
      sender: { id: SENDER_ID },
      message: { mid: MESSAGE_MID, attachments: [{ type: "story_mention", payload: { url: "https://example.com/story" } }] },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.storyMention).toBe(true);
    expect(classifyStoryInteraction(result.data)).toBe("MENTION");
  });

  it("separates emoji reactions from text replies when both reference a story", () => {
    const reaction = parseMessagingItem({ sender: { id: SENDER_ID }, message: { text: "🔥", reply_to: { story: { id: "story-1" } } } });
    const reply = parseMessagingItem({ sender: { id: SENDER_ID }, message: { text: "Can I get this?", reply_to: { story: { id: "story-1" } } } });
    expect(reaction.ok && classifyStoryInteraction(reaction.data)).toBe("REACTION");
    expect(reply.ok && classifyStoryInteraction(reply.data)).toBe("REPLY");
  });

  it("does not mistake a generic message reaction for a story reaction", () => {
    const result = parseMessagingItem({ sender: { id: SENDER_ID }, reaction: { action: "react", emoji: "❤️" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(classifyStoryInteraction(result.data)).toBeNull();
  });

  it("parses quick reply payloads", () => {
    const result = parseMessagingItem({ sender: { id: SENDER_ID }, message: { text: "I followed", quick_reply: { payload: "AP3K_FOLLOW_CHECK:abc" } } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.quickReplyPayload).toBe("AP3K_FOLLOW_CHECK:abc");
    expect(result.diagnostics.hasQuickReply).toBe(true);
  });
});

describe("parseMessagingItem — echo messages", () => {
  it("detects echo messages via message.is_echo", () => {
    const item = validTextItem({
      message: { text: "sent by page", mid: MESSAGE_MID, is_echo: true },
    });
    const result = parseMessagingItem(item);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.isEcho).toBe(true);
    expect(result.diagnostics.isEcho).toBe(true);
  });

  it("non-echo items have isEcho=false", () => {
    const result = parseMessagingItem(validTextItem());
    expect(result.diagnostics.isEcho).toBe(false);
    if (!result.ok) return;
    expect(result.data.isEcho).toBe(false);
  });
});

describe("parseMessagingItem — system events", () => {
  it.each([
    ["DELIVERY", { delivery: { mids: [MESSAGE_MID] } }],
    ["READ", { read: { watermark: TIMESTAMP } }],
    ["REACTION", { reaction: { action: "react", emoji: "❤️" } }],
  ])("classifies %s events without treating them as messages", (type, event) => {
    const result = parseMessagingItem({ sender: { id: SENDER_ID }, ...event });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.systemEventType).toBe(type);
    expect(result.diagnostics.hasSystemEvent).toBe(true);
    expect(result.diagnostics.hasMessageText).toBe(false);
  });
});

describe("parseMessagingItem — invalid inputs", () => {
  it("returns ok:false for null", () => {
    const result = parseMessagingItem(null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("messaging_item_not_object");
    expect(result.diagnostics.hasSenderId).toBe(false);
  });

  it("returns ok:false for undefined", () => {
    const result = parseMessagingItem(undefined);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("messaging_item_not_object");
  });

  it("returns ok:false when sender.id is missing", () => {
    const result = parseMessagingItem({ message: { text: "hi" } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("missing_sender_id");
    expect(result.diagnostics.hasSenderId).toBe(false);
    expect(result.diagnostics.hasMessageText).toBe(true);
  });

  it("returns ok:false when sender is present but id is missing", () => {
    const result = parseMessagingItem({ sender: {}, message: { text: "hi" } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("missing_sender_id");
  });

  it("sender id is coerced to string", () => {
    const result = parseMessagingItem({ sender: { id: 12345 }, message: { text: "hi" } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.senderId).toBe("12345");
    expect(typeof result.data.senderId).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Error reason constants — used in webhook route and admin UI queries
// ---------------------------------------------------------------------------

describe("error reason constants", () => {
  it("INBOUND_MESSAGE_NO_AUTOMATION is the correct reason for unmatched inbound DMs", () => {
    expect(INBOUND_MESSAGE_NO_AUTOMATION).toBe("inbound_message_received_no_dm_automation");
  });

  it("INBOUND_MESSAGE_ECHO_SKIPPED is the correct reason for echo messages", () => {
    expect(INBOUND_MESSAGE_ECHO_SKIPPED).toBe("echo_message_skipped");
  });

  it("INBOUND_SYSTEM_EVENT_SKIPPED is the correct reason for receipts and reactions", () => {
    expect(INBOUND_SYSTEM_EVENT_SKIPPED).toBe("inbound_system_event_skipped");
  });

  it("no_keyword_match is NOT used for inbound message events without automation", () => {
    expect(INBOUND_MESSAGE_NO_AUTOMATION).not.toBe("no_keyword_match");
  });
});

it("preserves Meta's ig_post identity for post-scoped share automations",()=>{
 const result=parseMessagingItem(validTextItem({message:{mid:MESSAGE_MID,attachments:[{type:"ig_post",payload:{ig_post_media_id:"18139494541428835",url:"https://www.instagram.com/p/example/"}}]}}));
 expect(result.ok).toBe(true);if(result.ok)expect(result.data.attachments[0]).toEqual({type:"ig_post",mediaId:"18139494541428835",url:"https://www.instagram.com/p/example/"});
});
