import { describe, expect, it } from "vitest";
import {
  formatActivityDisplay,
  formatRecentActivity,
  formatLogError,
  getCampaignModeLabels,
  getMetaCapabilityPendingDisplay,
  getReviewerTestCopy,
  groupCampaignActivity,
  isWeakPublicReply,
  DM_ACCESS_DISABLED_HELPER,
  META_CAPABILITY_PENDING_HELPER,
  META_CAPABILITY_PENDING_LABEL,
} from "@/lib/campaign-activity-format";

describe("campaign activity display formatting", () => {
  it("displays capability-limited private reply attempts as neutral recorded workflow", () => {
    expect(
      formatActivityDisplay({
        type: "REAL_COMMENT_EVENT",
        status: "FAILED",
        errorMessage: "dm_failed: dm_capability_missing",
      })
    ).toMatchObject({
      label: "Comment processed",
      badge: "RECORDED",
      tone: "green",
      detail: META_CAPABILITY_PENDING_HELPER,
      technical: true,
    });
  });

  it("formats Meta code=3 without leaking raw tokens", () => {
    expect(formatLogError("Meta error code=3")).toBe(META_CAPABILITY_PENDING_HELPER);
    expect(
      getMetaCapabilityPendingDisplay({
        metaError: {
          code: 3,
          type: "OAuthException",
          message: "(#3) Application does not have the capability to make this API call",
          access_token: "must-not-be-rendered",
        },
      })
    ).toEqual({
      label: META_CAPABILITY_PENDING_LABEL,
      details: {
        code: 3,
        type: "OAuthException",
        message: "Application does not have the capability to make this API call.",
      },
    });
  });

  it("keeps reviewer copy neutral", () => {
    expect(getReviewerTestCopy(true)).toContain("records the private reply workflow");
    expect(getReviewerTestCopy(true)).not.toContain("approval");
    expect(getReviewerTestCopy(true)).not.toContain("instagram_manage_messages");
  });

  it("displays campaign modes from saved database values", () => {
    expect(getCampaignModeLabels({ sendPrivateDm: false, publicReplyCount: 0 })).toEqual({
      publicReply: "Off",
      privateDm: "Off — external tool",
    });
  });

  it("formats recent public replies and private reply workflow events cleanly", () => {
    expect(formatRecentActivity({ type: "PUBLIC_REPLY_SENT", igUserId: "tester", commentId: "180123456789" })).toMatchObject({
      title: "Public reply sent",
      actor: "Instagram user tester",
      tone: "green",
    });
    expect(formatRecentActivity({ type: "DM_FAILED", errorMessage: "dm_capability_missing" })).toMatchObject({
      title: META_CAPABILITY_PENDING_LABEL,
      subtitle: META_CAPABILITY_PENDING_HELPER,
      tone: "green",
      kind: "activity",
    });
  });

  it("shows disabled Instagram connected-tool access as an actionable failure", () => {
    const error = "status=403 code=200 subcode=2534041 message=The account owner has disabled access to Instagram Direct Messaging.";

    expect(formatActivityDisplay({ type: "DM_FAILED", status: "FAILED", errorMessage: error })).toMatchObject({
      label: "Instagram message access is off",
      badge: "ACTION NEEDED",
      tone: "red",
      detail: DM_ACCESS_DISABLED_HELPER,
    });
    expect(formatRecentActivity({ type: "DM_FAILED", errorMessage: error })).toMatchObject({
      title: "Instagram message access is off",
      tone: "red",
      kind: "failed",
    });
    expect(groupCampaignActivity([
      event("COMMENT_RECEIVED"),
      event("KEYWORD_MATCHED", { keyword: "ai" }),
      event("PUBLIC_REPLY_SENT"),
      event("DM_FAILED", { errorMessage: error }),
    ])[0]).toMatchObject({
      title: "Instagram message access is off",
      badge: "ACTION NEEDED",
      tone: "red",
      details: expect.objectContaining({ error: DM_ACCESS_DISABLED_HELPER }),
    });
  });

  it("classifies weak public replies", () => {
    expect(isWeakPublicReply("🔥🔥")).toBe(true);
    expect(isWeakPublicReply("El enlace fue enviado ahora")).toBe(false);
    expect(isWeakPublicReply("Enviado 🔥")).toBe(false);
  });

  it("groups comment received, trigger matched, public reply sent, and DM skipped into one activity", () => {
    const grouped = groupCampaignActivity([
      event("COMMENT_RECEIVED"),
      event("KEYWORD_MATCHED", { keyword: "ai" }),
      event("PUBLIC_REPLY_SENT", { commentId: "reply-1", meta: { sourceCommentId: "comment-1", publicReplyCommentId: "reply-1" } }),
      event("DM_SKIPPED", { errorMessage: "external_dm_tool_enabled" }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      title: "Comment handled successfully",
      subtitle: "Public reply sent · private reply skipped",
      badge: "SENT",
      tone: "green",
      steps: expect.objectContaining({ commentReceived: true, triggerMatched: true, publicReply: "sent", privateDm: "off" }),
    });
  });

  it("groups public reply sent and code=3 as neutral handled activity without raw Meta details", () => {
    const grouped = groupCampaignActivity([
      event("COMMENT_RECEIVED"),
      event("KEYWORD_MATCHED", { keyword: "ai" }),
      event("PUBLIC_REPLY_SENT", { commentId: "reply-1", meta: { sourceCommentId: "comment-1", publicReplyCommentId: "reply-1" } }),
      event("DM_FAILED", {
        errorMessage: "dm_capability_missing",
        meta: {
          metaError: {
            code: 3,
            type: "OAuthException",
            message: "(#3) Application does not have the capability to make this API call",
          },
        },
      }),
      event("REAL_COMMENT_EVENT", { status: "FAILED", errorMessage: "dm_failed: dm_capability_missing", source: "webhook" }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      title: "Comment handled",
      subtitle: "Public reply sent · private reply workflow recorded",
      badge: "HANDLED",
      tone: "green",
      steps: expect.objectContaining({ publicReply: "sent", privateDm: "failed" }),
      details: expect.objectContaining({ error: META_CAPABILITY_PENDING_HELPER }),
    });
    expect(grouped[0].details.metaError).toBeUndefined();
    expect(JSON.stringify(grouped[0])).not.toContain("OAuthException");
    expect(JSON.stringify(grouped[0])).not.toContain("instagram_manage_messages");
    expect(JSON.stringify(grouped[0])).not.toContain("approval");
  });

  it("deduplicates repeated raw events for the same commentId", () => {
    const grouped = groupCampaignActivity([
      event("COMMENT_RECEIVED"),
      event("COMMENT_RECEIVED"),
      event("KEYWORD_MATCHED"),
    ]);

    expect(grouped).toHaveLength(1);
  });

  it("limits to latest 20 grouped interactions instead of raw 20 events", () => {
    const raw = Array.from({ length: 25 }).flatMap((_, index) => [
      event("COMMENT_RECEIVED", { commentId: `comment-${index}`, createdAt: new Date(2026, 4, 24, 10, index).toISOString() }),
      event("KEYWORD_MATCHED", { commentId: `comment-${index}`, createdAt: new Date(2026, 4, 24, 10, index, 1).toISOString() }),
    ]);

    const grouped = groupCampaignActivity(raw, { limit: 20 });

    expect(grouped).toHaveLength(20);
    expect(new Set(grouped.map((item) => item.commentId)).size).toBe(20);
  });
});

function event(type: string, overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? `${type}-1`,
    type,
    status: overrides.status,
    keyword: overrides.keyword,
    errorMessage: overrides.errorMessage,
    meta: overrides.meta,
    source: overrides.source,
    igUserId: overrides.igUserId ?? "tester",
    mediaId: overrides.mediaId ?? "media-1",
    commentId: overrides.commentId ?? "comment-1",
    createdAt: overrides.createdAt ?? "2026-05-24T20:00:00Z",
  };
}
