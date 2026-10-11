import { describe, expect, it } from "vitest";
import {
  buildCampaignBindingDiagnostics,
  classifyAccountWebhookDelivery,
  compareIntegrationDelivery,
  dashboardNoCommentDiagnosis,
  planReconnectCleanup,
} from "./account-webhook-diagnostics";

const now = new Date("2026-05-25T12:00:00Z");
const integration = {
  id: "current-integration",
  userId: "user-1",
  instagramId: "ig-boudofi",
  instagramUsername: "boudofi",
  webhookAccountId: "ig-boudofi",
  pageId: "page-boudofi",
  status: "CONNECTED",
  webhookSubscriptionLastAttemptedAt: new Date("2026-05-25T10:00:00Z"),
};

describe("account webhook diagnostics", () => {
  it("sets account status to only messaging active when messaging exists but no comment webhook exists", () => {
    const status = classifyAccountWebhookDelivery({
      integration,
      now,
      events: [
        {
          eventType: "REAL_MESSAGE_EVENT",
          eventSource: "META_REAL",
          field: "messaging",
          igAccountId: "ig-boudofi",
          createdAt: "2026-05-25T11:00:00Z",
        },
      ],
    });

    expect(status.status).toBe("only_messaging_active");
    expect(status.lastMessagingWebhook?.eventType).toBe("REAL_MESSAGE_EVENT");
  });

  it("sets account status to comments active when a real comment webhook exists", () => {
    const status = classifyAccountWebhookDelivery({
      integration,
      now,
      events: [
        {
          eventType: "COMMENT_WEBHOOK_RECEIVED",
          eventSource: "META_REAL",
          field: "comments",
          igAccountId: "ig-boudofi",
          mediaId: "media-1",
          commentId: "comment-1",
          createdAt: "2026-05-25T11:00:00Z",
        },
      ],
    });

    expect(status.status).toBe("comments_active");
  });

  it("excludes Meta sample entryId=0 from real comment status", () => {
    const status = classifyAccountWebhookDelivery({
      integration,
      now,
      events: [
        {
          eventType: "COMMENT_WEBHOOK_RECEIVED",
          eventSource: "META_REAL",
          field: "comments",
          igAccountId: "0",
          payload: { entryId: "0" },
          createdAt: "2026-05-25T11:00:00Z",
        },
      ],
    });

    expect(status.status).toBe("no_delivery");
    expect(status.lastCommentWebhook).toBeNull();
  });

  it("flags stale campaign binding when campaign post belongs to previous integration/user", () => {
    const [diagnostic] = buildCampaignBindingDiagnostics({
      integration,
      campaigns: [
        {
          id: "campaign-1",
          name: "Old post campaign",
          userId: "user-1",
          createdAt: "2026-05-24T10:00:00Z",
          posts: [{ postid: "old-media" }],
        },
      ],
      knownMediaOwners: {
        "old-media": { integrationId: "old-integration", userId: "old-user", instagramId: "old-ig" },
      },
    });

    expect(diagnostic.stale).toBe(true);
    expect(diagnostic.warnings.join(" ")).toContain("different integration");
    expect(diagnostic.warnings.join(" ")).toContain("before the current reconnect");
  });

  it("returns dashboard no-comment diagnosis when only messaging webhooks exist", () => {
    expect(dashboardNoCommentDiagnosis({ username: "boudofi", status: "only_messaging_active" })).toEqual({
      title: "Only messaging is arriving",
      detail: "Messaging webhooks are active, but no real comment webhook has arrived yet.",
    });
  });

  it("plans reconnect cleanup without deleting stale integrations", () => {
    const plan = planReconnectCleanup({
      current: integration,
      integrations: [
        integration,
        { id: "old-integration", userId: "user-1", instagramId: "old-ig", instagramUsername: "old", status: "CONNECTED" },
      ],
      campaigns: [
        {
          id: "campaign-old",
          active: true,
          User: { integrations: [{ id: "old-integration", userId: "user-1", instagramId: "old-ig" }] },
        },
      ],
    });

    expect(plan.staleIntegrationIds).toEqual(["old-integration"]);
    expect(plan.shouldPauseCampaignIds).toEqual(["campaign-old"]);
  });

  it("keeps wizard post scope account-specific by requiring the current connected integration media source", () => {
    const [diagnostic] = buildCampaignBindingDiagnostics({
      integration,
      campaigns: [{ id: "campaign-1", posts: [{ postid: "new-media" }], createdAt: "2026-05-25T11:00:00Z" }],
      knownMediaOwners: {
        "new-media": { integrationId: "current-integration", userId: "user-1", instagramId: "ig-boudofi" },
      },
    });

    expect(diagnostic.stale).toBe(false);
  });

  it("preserves tenant isolation by flagging media owned by another user", () => {
    const [diagnostic] = buildCampaignBindingDiagnostics({
      integration,
      campaigns: [{ id: "campaign-1", userId: "user-1", posts: [{ postid: "media-other-user" }] }],
      knownMediaOwners: {
        "media-other-user": { integrationId: "current-integration", userId: "other-user", instagramId: "ig-boudofi" },
      },
    });

    expect(diagnostic.warnings).toContain("Automation post belongs to a different user.");
  });

  it("compares working and failing accounts with correct statuses", () => {
    const comparison = compareIntegrationDelivery({
      now,
      working: {
        integration: { id: "working", userId: "user-2", instagramId: "ig-working", instagramUsername: "working" },
        events: [{ eventType: "REAL_COMMENT_EVENT", eventSource: "META_REAL", igAccountId: "ig-working", createdAt: now }],
        campaigns: [{ id: "w-campaign", active: true, posts: [{ postid: "media-working" }] }],
      },
      failing: {
        integration,
        events: [{ eventType: "REAL_MESSAGE_EVENT", eventSource: "META_REAL", field: "messaging", igAccountId: "ig-boudofi", createdAt: now }],
        campaigns: [{ id: "f-campaign", active: true, posts: [{ postid: "media-boudofi" }] }],
      },
    });

    expect(comparison.working.delivery.status).toBe("comments_active");
    expect(comparison.failing.delivery.status).toBe("only_messaging_active");
    expect(comparison.failing.campaigns.map((campaign) => campaign.postId)).toEqual(["media-boudofi"]);
  });

  it("never treats DM webhooks as comment triggers", () => {
    const status = classifyAccountWebhookDelivery({
      integration,
      now,
      events: [
        {
          eventType: "REAL_MESSAGE_EVENT",
          eventSource: "META_REAL",
          field: "messaging",
          igAccountId: "ig-boudofi",
          payload: { message: "info" },
          createdAt: now,
        },
      ],
    });

    expect(status.status).toBe("only_messaging_active");
    expect(status.lastCommentWebhook).toBeNull();
  });
});
