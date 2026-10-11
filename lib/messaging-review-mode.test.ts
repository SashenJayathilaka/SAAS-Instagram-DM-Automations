import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyMessagingReviewCampaignDefaults,
  DEFAULT_MESSAGING_REVIEW_PRIVATE_REPLY,
  getMetaBusinessOAuthScopes,
  isMessagingReviewMode,
} from "@/lib/messaging-review-mode";

describe("messaging review mode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does not request message management by default", () => {
    vi.stubEnv("NEXT_PUBLIC_MESSAGING_REVIEW_MODE", "false");
    expect(isMessagingReviewMode()).toBe(false);
    expect(getMetaBusinessOAuthScopes()).not.toContain("instagram_manage_messages");
    expect(getMetaBusinessOAuthScopes()).toContain("instagram_manage_comments");
  });

  it("requests message management only for the exact true flag", () => {
    vi.stubEnv("NEXT_PUBLIC_MESSAGING_REVIEW_MODE", "true");
    expect(isMessagingReviewMode()).toBe(true);
    expect(getMetaBusinessOAuthScopes()).toContain("instagram_manage_messages");
    vi.stubEnv("NEXT_PUBLIC_MESSAGING_REVIEW_MODE", "TRUE");
    expect(isMessagingReviewMode()).toBe(false);
  });

  it("prepares an unconfigured campaign for messaging review", () => {
    expect(applyMessagingReviewCampaignDefaults({ sendPrivateDm: false, prompt: "" }, true)).toEqual({
      sendPrivateDm: true,
      prompt: DEFAULT_MESSAGING_REVIEW_PRIVATE_REPLY,
    });
  });

  it("preserves an existing DM message", () => {
    expect(applyMessagingReviewCampaignDefaults({ sendPrivateDm: false, prompt: "Existing message" }, true)).toEqual({
      sendPrivateDm: true,
      prompt: "Existing message",
    });
  });

  it("does not alter campaign data when review mode is off", () => {
    expect(applyMessagingReviewCampaignDefaults({ sendPrivateDm: false, prompt: "" }, false)).toEqual({
      sendPrivateDm: false,
      prompt: "",
    });
  });
});
