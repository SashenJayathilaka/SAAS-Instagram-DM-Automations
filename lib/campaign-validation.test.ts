import { describe, expect, it } from "vitest";
import {
  canAdvancePublicReplyStep,
  canAdvanceTriggerStep,
  mediaMatchesCampaignPost,
} from "./campaign-validation";

describe("campaign trigger validation", () => {
  it("rejects specific keyword triggers without keywords", () => {
    expect(canAdvanceTriggerStep("SPECIFIC_KEYWORD", [])).toBe(false);
  });

  it("allows any-comment triggers without keywords", () => {
    expect(canAdvanceTriggerStep("ANY_COMMENT", [])).toBe(true);
  });
});

describe("campaign media matching", () => {
  it("matches any post against any incoming media ID", () => {
    expect(mediaMatchesCampaignPost("ANY", "179000")).toBe(true);
  });

  it("matches a specific stored media ID only against the same incoming media ID", () => {
    expect(mediaMatchesCampaignPost("179000", "179000")).toBe(true);
    expect(mediaMatchesCampaignPost("179000", "180000")).toBe(false);
  });
});

describe("public reply validation", () => {
  it("requires at least one variation when public reply is enabled", () => {
    expect(canAdvancePublicReplyStep(true, ["", undefined, " "])).toBe(false);
    expect(canAdvancePublicReplyStep(true, ["Sending it now", "", ""])).toBe(true);
  });

  it("allows no variations when public reply is disabled", () => {
    expect(canAdvancePublicReplyStep(false, [])).toBe(true);
  });
});
