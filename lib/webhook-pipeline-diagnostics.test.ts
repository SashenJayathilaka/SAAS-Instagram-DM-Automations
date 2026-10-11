import { describe, expect, it } from "vitest";
import {
  buildWebhookPipelineDiagnostics,
  developmentModeDeliveryMessage,
  shouldShowDevelopmentModeDeliveryBanner,
} from "./webhook-pipeline-diagnostics";

describe("webhook pipeline diagnostics", () => {
  it("shows Development mode guidance only when Meta has not delivered a real POST", () => {
    expect(shouldShowDevelopmentModeDeliveryBanner(null)).toBe(true);
    expect(developmentModeDeliveryMessage()).toContain("Development mode");
    expect(shouldShowDevelopmentModeDeliveryBanner({ eventType: "WEBHOOK_POST_RECEIVED_RAW" })).toBe(false);
  });

  it("summarizes an arrived, matched, replied, and DM-attempted comment", () => {
    const diagnostics = buildWebhookPipelineDiagnostics({
      lastPostRaw: { eventType: "WEBHOOK_POST_RECEIVED_RAW", createdAt: new Date() },
      lastRealComment: {
        eventType: "REAL_COMMENT_EVENT",
        status: "FAILED",
        errorMessage: "dm_failed: dm_capability_missing",
        payload: {
          mediaMatching: {
            matchingIntegrationFound: true,
            matchedAutomationIds: ["automation-1"],
          },
          triggerMatching: {
            triggerDecisions: [{ automationId: "automation-1", matchedKeyword: "ai" }],
          },
        },
      },
      automationEvents: [{ eventType: "KEYWORD_MATCHED", keyword: "ai" }],
      messageLogs: [
        { messageType: "COMMENT_REPLY", status: "SENT" },
        { messageType: "DM", status: "FAILED", errorMessage: "dm_capability_missing" },
      ],
    });

    expect(diagnostics.rawArrived).toBe(true);
    expect(diagnostics.signaturePassed).toBe(true);
    expect(diagnostics.realCommentClassified).toBe(true);
    expect(diagnostics.integrationMatched).toBe(true);
    expect(diagnostics.mediaMatched).toBe(true);
    expect(diagnostics.triggerMatched).toBe(true);
    expect(diagnostics.publicReplyAttempted).toBe(true);
    expect(diagnostics.dmAttempted).toBe(true);
    expect(diagnostics.finalReason).toBe("dm_capability_missing");
  });

  it("uses media and trigger diagnostics to expose exact failures", () => {
    const diagnostics = buildWebhookPipelineDiagnostics({
      lastPostRaw: { eventType: "WEBHOOK_POST_RECEIVED_RAW" },
      lastRealComment: {
        eventType: "REAL_COMMENT_EVENT",
        status: "PROCESSED",
        errorMessage: "no_keyword_match",
        payload: {
          mediaMatching: {
            matchingIntegrationFound: true,
            matchedAutomationIds: ["automation-1"],
          },
          triggerMatching: {
            triggerDecisions: [{ automationId: "automation-1", matchedKeyword: null, noMatchReason: "no_keyword_match" }],
          },
        },
      },
    });

    expect(diagnostics.integrationMatched).toBe(true);
    expect(diagnostics.mediaMatched).toBe(true);
    expect(diagnostics.triggerMatched).toBe(false);
    expect(diagnostics.finalReason).toBe("no_keyword_match");
  });
});
