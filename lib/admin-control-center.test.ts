import { describe, expect, it } from "vitest";
import {
  classifyDeliveryError,
  adminActionMenuConfig,
  adminDangerZoneStatus,
  adminTableColumns,
  disabledAdminActionReason,
  getTopAdminIssue,
  isAdminConfirmReady,
  sanitizeAdminPayload,
  shortenAdminId,
  summarizeAdminError,
  stripeCustomerDashboardUrl,
} from "./admin-control-center";

describe("admin control center helpers", () => {
  it("redacts sensitive payload fields recursively", () => {
    const sanitized = sanitizeAdminPayload({
      access_token: "EAAB-secret",
      nested: {
        pageAccessToken: "page-secret",
        safeId: "1784",
      },
      events: [{ authorization: "Bearer abc", commentId: "c1" }],
    });

    expect(JSON.stringify(sanitized)).not.toContain("EAAB-secret");
    expect(JSON.stringify(sanitized)).not.toContain("Bearer abc");
    expect(sanitized).toMatchObject({
      access_token: "[redacted]",
      nested: { pageAccessToken: "[redacted]", safeId: "1784" },
      events: [{ authorization: "[redacted]", commentId: "c1" }],
    });
  });

  it("classifies dm_capability_missing as a Meta capability issue", () => {
    expect(classifyDeliveryError("dm_capability_missing")).toMatchObject({
      label: "Meta capability missing",
      tone: "red",
    });
    expect(classifyDeliveryError("dm_access_disabled")).toMatchObject({
      label: "Instagram message access disabled",
      tone: "red",
    });
    expect(classifyDeliveryError("token_missing")).toMatchObject({
      label: "Reconnect account",
      tone: "amber",
    });
    expect(classifyDeliveryError("external_dm_tool_enabled")).toMatchObject({
      label: "Skipped — external DM tool enabled",
      tone: "amber",
    });
    expect(classifyDeliveryError("static_reply_limit_reached")).toMatchObject({
      label: "Skipped — monthly reply limit reached",
      tone: "amber",
    });
    expect(classifyDeliveryError("missing_required_dm_fields")).toMatchObject({
      label: "DM webhook received",
      tone: "amber",
    });
  });

  it("keeps subscription management read-only with Stripe customer links", () => {
    expect(stripeCustomerDashboardUrl("cus_123")).toBe(
      "https://dashboard.stripe.com/customers/cus_123"
    );
    expect(stripeCustomerDashboardUrl(null)).toBeNull();
  });

  it("summarizes long Meta field-list errors for tables", () => {
    expect(
      summarizeAdminError(
        "(#100) Param subscribed_fields[0] must be one of messages, comments, live_comments, messaging_seen, standby, story_insights, lots, of, fields"
      )
    ).toBe("Webhook field mismatch");
    expect(summarizeAdminError("dm_capability_missing")).toBe("DM capability pending");
    expect(summarizeAdminError("dm_access_disabled")).toBe("Instagram message access disabled");
  });

  it("shortens long IDs but keeps short IDs readable", () => {
    expect(shortenAdminId("1784140000000000007075")).toBe("178414...7075");
    expect(shortenAdminId("abc123")).toBe("abc123");
  });

  it("explains disabled admin actions", () => {
    expect(disabledAdminActionReason("deleteUserData")).toContain("retention");
    expect(disabledAdminActionReason("planOverride")).toContain("disabled");
  });

  it("returns action menu config with enabled and disabled actions", () => {
    const campaign = adminActionMenuConfig("campaign", { active: true });
    expect(campaign.find((item) => item.id === "pause")).toMatchObject({ confirmation: "PAUSE" });
    expect(campaign.find((item) => item.id === "pause")?.disabled).not.toBe(true);
    expect(campaign.find((item) => item.id === "archive")).toMatchObject({
      confirmation: "ARCHIVE",
    });
    expect(campaign.find((item) => item.id === "delete")).toMatchObject({
      disabled: true,
    });

    expect(adminActionMenuConfig("integration").find((item) => item.id === "disconnect")).toMatchObject({
      confirmation: "DISCONNECT",
    });
    expect(adminActionMenuConfig("user").find((item) => item.id === "suspend")).toMatchObject({
      confirmation: "SUSPEND",
    });
  });

  it("validates admin confirm dialog readiness", () => {
    expect(isAdminConfirmReady({ reason: "", confirmation: "ARCHIVE", expectedConfirmation: "ARCHIVE" })).toBe(false);
    expect(isAdminConfirmReady({ reason: "cleanup", confirmation: "WRONG", expectedConfirmation: "ARCHIVE" })).toBe(false);
    expect(isAdminConfirmReady({ reason: "cleanup", confirmation: "ARCHIVE", expectedConfirmation: "ARCHIVE" })).toBe(true);
    expect(isAdminConfirmReady({ reasonRequired: false, confirmation: "DUPLICATE", expectedConfirmation: "DUPLICATE" })).toBe(true);
  });

  it("keeps raw long errors out of admin table columns", () => {
    expect(adminTableColumns("integrations")).toContain("Last error summary");
    expect(adminTableColumns("integrations")).not.toContain("Last error");
    expect(adminTableColumns("messages")).toEqual([
      "Time",
      "Owner / Campaign",
      "Type / Status",
      "Actor / Comment",
      "Summary",
      "Actions",
    ]);
  });

  it("reflects enabled audit log and disabled hard deletes in danger zone status", () => {
    expect(adminDangerZoneStatus()).toMatchObject({
      auditLog: "Enabled",
      typedConfirmations: "Enabled",
      hardDeletes: "Disabled",
      subscriptionCancel: "Disabled",
    });
  });

  it("ranks the most urgent top admin issue", () => {
    expect(
      getTopAdminIssue({
        lastPostRaw: null,
        signatureFailures24h: 0,
        dmCapabilityMissing: false,
        tokenMissingFailures24h: 0,
        dmFailed24h: 0,
        activeCampaigns: 1,
      })
    ).toMatchObject({ label: "No real webhook delivered yet", tone: "red" });

    expect(
      getTopAdminIssue({
        lastPostRaw: {},
        signatureFailures24h: 0,
        dmCapabilityMissing: false,
        tokenMissingFailures24h: 0,
        dmFailed24h: 0,
        activeCampaigns: 1,
      })
    ).toMatchObject({ label: "No active issue", tone: "green" });
  });
});
