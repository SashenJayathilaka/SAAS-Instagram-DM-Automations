import { describe, expect, it } from "vitest";
import { normalizeMessageAutomationPayload, validateMessageAutomationPayload } from "./message-automation";

describe("message automation payloads", () => {
  it("normalizes a story reply, preserves a real queue delay and disables simulated typing", () => {
    const payload = normalizeMessageAutomationPayload({
      source: "STORY",
      storyTriggerType: "REPLY",
      name: " Story leads ",
      message: " Here's the guide ",
      quickReplies: ["Tell me more", "Pricing", "Book", "Thanks", "ignored"],
      deliveryDelaySeconds: 10,
      typingIndicator: true,
    });
    expect(payload.name).toBe("Story leads");
    expect(payload.storyTriggerType).toBe("REPLY");
    expect(payload.quickReplies).toHaveLength(4);
    expect(payload.deliveryDelaySeconds).toBe(10);
    expect(payload.typingIndicator).toBe(false);
    expect(payload.followRequestButtonText).toBe("Following");
    expect(validateMessageAutomationPayload(payload)).toBeNull();
  });

  it("supports any incoming DM without a keyword", () => {
    const payload = normalizeMessageAutomationPayload({ source: "DM", triggerMode: "ANY_MESSAGE", message: "Hello" });
    expect(payload.triggerMode).toBe("ANY_MESSAGE");
    expect(payload.keywords).toEqual([]);
    expect(validateMessageAutomationPayload(payload)).toBeNull();
  });

  it("requires keywords in specific-keyword DM mode", () => {
    const payload = normalizeMessageAutomationPayload({ source: "DM", triggerMode: "SPECIFIC_KEYWORD", message: "Hello" });
    expect(validateMessageAutomationPayload(payload)).toBe("Add at least one DM keyword or choose any incoming message.");
  });

  it("rejects missing link and media destinations", () => {
    const link = normalizeMessageAutomationPayload({ source: "STORY", responseFormat: "LINK", message: "Open this" });
    const media = normalizeMessageAutomationPayload({ source: "STORY", responseFormat: "MEDIA", message: "Watch this" });
    expect(validateMessageAutomationPayload(link)).toBe("Complete every link label and add a valid destination URL.");
    expect(validateMessageAutomationPayload(media)).toBe("Add a valid public image or video URL.");
  });

  it("stores three link buttons and mirrors the first for legacy delivery", () => {
    const payload = normalizeMessageAutomationPayload({
      source: "DM",
      responseFormat: "LINK",
      message: "Choose a resource",
      linkButtons: [
        { label: "Guide", url: "example.com/guide" },
        { label: "Pricing", url: "https://example.com/pricing" },
        { label: "Book", url: "https://example.com/book" },
      ],
    });

    expect(payload.quickReplies).toHaveLength(3);
    expect(payload.ctaButtonTitle).toBe("Guide");
    expect(payload.ctaLink).toBe("https://example.com/guide");
    expect(validateMessageAutomationPayload(payload)).toBeNull();
  });

  it("uses AI text mode with a safe fallback and no link payload", () => {
    const payload = normalizeMessageAutomationPayload({
      source: "DM",
      triggerMode: "ANY_MESSAGE",
      message: "A person will reply soon.",
      aiReplyEnabled: true,
      followGateRequired: true,
      responseFormat: "LINK",
      linkButtons: [{ label: "Ignored", url: "https://example.com" }],
    });

    expect(payload.aiReplyEnabled).toBe(true);
    expect(payload.responseFormat).toBe("TEXT");
    expect(payload.quickReplies).toEqual([]);
    expect(payload.ctaLink).toBeUndefined();
    expect(payload.followGateRequired).toBe(false);
    expect(validateMessageAutomationPayload(payload)).toBeNull();
  });
});
