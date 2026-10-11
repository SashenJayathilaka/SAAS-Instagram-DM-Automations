import { describe, expect, it } from "vitest";
import { formatUserFacingMetaError } from "@/lib/user-facing-errors";

describe("user-facing Meta errors", () => {
  it("summarizes Meta code 100 webhook field-list errors", () => {
    const result = formatUserFacingMetaError(
      "status=400 code=100 message=(#100) Param subscribed_fields[0] must be one of messages, comments, live_comments, messaging_seen, standby, story_insights, lots, of, fields"
    );

    expect(result).toEqual({
      title: "Webhook subscription needs review",
      detail: "Meta rejected one or more webhook fields. AP3K can still process comments if the comments webhook is active.",
      severity: "warning",
    });
    expect(JSON.stringify(result)).not.toContain("subscribed_fields[0]");
  });

  it("summarizes DM capability code 3 errors", () => {
    expect(formatUserFacingMetaError("code=3 dm_capability_missing")).toEqual({
      title: "Private DM capability pending",
      detail: "Meta blocks private replies until instagram_manage_messages is approved.",
      severity: "warning",
    });
  });

  it("explains how to restore Instagram connected-tool message access", () => {
    expect(
      formatUserFacingMetaError(
        "status=403 code=200 subcode=2534041 message=The account owner has disabled access to Instagram Direct Messaging."
      )
    ).toEqual({
      title: "Instagram message access is off",
      detail: "In Instagram, open Messages and story replies → Message controls, then enable message access for connected tools. Use a new comment to test after enabling it.",
      severity: "error",
    });
  });

  it("summarizes expired token errors", () => {
    expect(formatUserFacingMetaError("OAuth token expired")).toEqual({
      title: "Instagram token expired",
      detail: "Reconnect the Instagram account to refresh access.",
      severity: "error",
    });
  });

  it("returns no failures without raw detail", () => {
    expect(formatUserFacingMetaError()).toEqual({ title: "No failures", severity: "ok" });
  });
});
