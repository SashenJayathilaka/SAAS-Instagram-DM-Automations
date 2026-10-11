import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOLLOW_REQUEST_DM_TEXT,
  DEFAULT_OPENING_DM_TEXT,
  followRequestActionPayload,
  openingDmActionPayload,
  parseCommentDmActionPayload,
  resolveFollowRequestButtonText,
  resolveFollowRequestDmText,
  resolveOpeningDmButtonText,
  resolveOpeningDmText,
} from "./comment-dm-flow";

describe("comment DM flow", () => {
  it("creates and parses the two postback actions", () => {
    expect(parseCommentDmActionPayload(openingDmActionPayload("automation-1"))).toEqual({
      type: "OPENING_CONTINUE",
      automationId: "automation-1",
    });
    expect(parseCommentDmActionPayload(followRequestActionPayload("automation-1"))).toEqual({
      type: "FOLLOW_CHECK",
      automationId: "automation-1",
    });
    expect(parseCommentDmActionPayload(openingDmActionPayload("automation-1", "comment-1"))).toEqual({
      type: "OPENING_CONTINUE",
      automationId: "automation-1",
      flowId: "comment-1",
    });
    expect(parseCommentDmActionPayload(followRequestActionPayload("automation-1", "comment-1"))).toEqual({
      type: "FOLLOW_CHECK",
      automationId: "automation-1",
      flowId: "comment-1",
    });
    expect(parseCommentDmActionPayload("UNKNOWN:automation-1")).toBeNull();
  });

  it("uses the product defaults for existing automations", () => {
    expect(resolveOpeningDmText(null)).toBe(DEFAULT_OPENING_DM_TEXT);
    expect(resolveOpeningDmButtonText(null)).toBe("Send me the link");
    expect(resolveFollowRequestDmText(null)).toBe(DEFAULT_FOLLOW_REQUEST_DM_TEXT);
    expect(resolveFollowRequestButtonText(null)).toBe("Following");
  });

  it("trims editable copy to Instagram-safe limits", () => {
    expect(Array.from(resolveOpeningDmText("x".repeat(700)))).toHaveLength(640);
    expect(Array.from(resolveOpeningDmButtonText("x".repeat(40)))).toHaveLength(20);
    expect(Array.from(resolveFollowRequestButtonText("y".repeat(40)))).toHaveLength(20);
  });
});
