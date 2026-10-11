import { describe, expect, it } from "vitest";
import {
  assessCampaignSetupHealth,
  planReconnectCampaignImpact,
  selectedPostHealth,
} from "./campaign-health";

const connected = {
  id: "integration-new",
  username: "boudofi",
  instagramId: "ig-new",
  status: "CONNECTED",
  tokenPresent: true,
};

const validCampaign = {
  id: "campaign-1",
  active: false,
  triggerMode: "SPECIFIC_KEYWORD",
  sendPrivateDm: true,
  needsReview: false,
  posts: [{ postid: "media-new" }],
  keywords: [{ word: "info" }],
  listener: { prompt: "Here is the link", commentReply: "Check your DMs" },
};

describe("campaign reconnect health", () => {
  it("reconnect to different IG marks active campaigns needsReview/paused", () => {
    const impact = planReconnectCampaignImpact({
      previousInstagramId: "ig-old",
      previousUsername: "old",
      nextInstagramId: "ig-new",
      nextUsername: "boudofi",
      campaigns: [
        { id: "active", active: true, posts: [{ postid: "media-old" }] },
        { id: "paused", active: false, posts: [{ postid: "media-old-2" }] },
      ],
    });

    expect(impact.changed).toBe(true);
    expect(impact.affectedCampaignIds).toEqual(["active", "paused"]);
    expect(impact.pauseCampaignIds).toEqual(["active"]);
    expect(impact.reason).toContain("Previous: @old / ig-old");
    expect(impact.reason).toContain("Current: @boudofi / ig-new");
  });

  it("reconnect same IG does not mark campaigns stale", () => {
    const impact = planReconnectCampaignImpact({
      previousInstagramId: "ig-new",
      previousUsername: "boudofi",
      nextInstagramId: "ig-new",
      nextUsername: "boudofi",
      campaigns: [{ id: "active", active: true }],
    });

    expect(impact.changed).toBe(false);
    expect(impact.affectedCampaignIds).toEqual([]);
  });

  it("campaign cannot activate if needsReview", () => {
    const health = assessCampaignSetupHealth({
      connectedAccount: connected,
      campaign: { ...validCampaign, needsReview: true, reviewReason: "Instagram account changed." },
      selectedPostOwner: { integrationId: "integration-new", instagramId: "ig-new", verified: true },
    });

    expect(health.okToActivate).toBe(false);
    expect(health.blockers).toContain("Instagram account changed.");
    expect(health.status).toBe("Needs review");
  });

  it("campaign can activate after repair validation", () => {
    const health = assessCampaignSetupHealth({
      connectedAccount: connected,
      campaign: { ...validCampaign, needsReview: false },
      selectedPostOwner: { integrationId: "integration-new", instagramId: "ig-new", verified: true },
    });

    expect(health.okToActivate).toBe(true);
  });

  it("stale post warning appears when selected media belongs to old account", () => {
    expect(selectedPostHealth({
      postId: "media-old",
      connectedIntegrationId: "integration-new",
      connectedInstagramId: "ig-new",
      selectedPostOwner: { integrationId: "integration-old", instagramId: "ig-old", verified: true },
    })).toBe("stale");
  });

  it("wizard only shows current account media by using current account post owner validation", () => {
    expect(selectedPostHealth({
      postId: "media-new",
      connectedIntegrationId: "integration-new",
      connectedInstagramId: "ig-new",
      selectedPostOwner: { integrationId: "integration-new", instagramId: "ig-new", verified: true },
    })).toBe("current");
  });

  it("final review shows external DM mode when sendPrivateDm=false", () => {
    const health = assessCampaignSetupHealth({
      connectedAccount: connected,
      campaign: {
        ...validCampaign,
        sendPrivateDm: false,
        listener: { prompt: "", commentReply: "Check the link in bio" },
      },
      selectedPostOwner: { integrationId: "integration-new", instagramId: "ig-new", verified: true },
    });

    expect(health.warnings).toContain("External DM mode: AP3K will not send private DMs.");
    expect(health.okToActivate).toBe(true);
  });

  it("final review warns when private DM enabled but messaging capability pending", () => {
    const health = assessCampaignSetupHealth({
      connectedAccount: connected,
      campaign: validCampaign,
      messagingCapabilityPending: true,
      selectedPostOwner: { integrationId: "integration-new", instagramId: "ig-new", verified: true },
    });

    expect(health.warnings).toContain("Private DM is enabled, but Meta messaging capability may still be pending.");
  });

  it("Any Post campaign remains valid after reconnect if trigger/replies are valid", () => {
    const impact = planReconnectCampaignImpact({
      previousInstagramId: "ig-old",
      nextInstagramId: "ig-new",
      campaigns: [{ id: "any", active: true, posts: [{ postid: "ANY" }] }],
    });
    const health = assessCampaignSetupHealth({
      connectedAccount: connected,
      campaign: {
        ...validCampaign,
        posts: [{ postid: "ANY" }],
        triggerMode: "ANY_COMMENT",
        keywords: [],
      },
    });

    expect(impact.affectedCampaignIds).toEqual([]);
    expect(health.selectedPostStatus).toBe("any");
    expect(health.okToActivate).toBe(true);
  });

  it("does not change webhook behavior: messaging delivery remains only a warning, not a comment trigger", () => {
    const health = assessCampaignSetupHealth({
      connectedAccount: connected,
      campaign: validCampaign,
      webhookStatus: "only_messaging_active",
      selectedPostOwner: { integrationId: "integration-new", instagramId: "ig-new", verified: true },
    });

    expect(health.okToActivate).toBe(true);
    expect(health.warnings).toContain("Messaging webhooks are arriving, but comment delivery is not active yet.");
  });
});
