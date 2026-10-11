const mockClaimComment = vi.hoisted(()=>vi.fn().mockResolvedValue(true));
vi.mock("@/lib/automation-delivery",()=>({claimImmediateComment:mockClaimComment,claimDmRecipient:vi.fn().mockResolvedValue(true),deferAutomationDelivery:vi.fn()}));
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindAutomationForCommentWithReason = vi.fn();
const mockCreateMessageLog = vi.fn();
const mockCreateAutomationEvent = vi.fn();
const mockCreateWebhookEvent = vi.fn();
const mockUpdateWebhookEvent = vi.fn();
const mockMergeWebhookEventPayload = vi.fn();
const mockIsDuplicate = vi.fn();
const mockHasProcessedCommentWebhook = vi.fn();
const mockHasAp3kGeneratedCommentId = vi.fn();
const mockHasRecentAp3kReplyTextMatch = vi.fn();
const mockCountRecentPublicReplies = vi.fn();
const mockHasRecentHandledCommenter = vi.fn();
const mockCountLoopGuardEvents = vi.fn();
const mockCountRecentSelfCommentSkips = vi.fn();
const mockPauseAutomationForLoopGuard = vi.fn();
const mockIsAppReviewMode = vi.fn();
const mockCanSendStaticReply = vi.fn();
const mockUpsertLead = vi.fn();
const mockTrackResponse = vi.fn();
const mockSendInstagramCommentPrivateReply = vi.fn();
const mockSendCommentReply = vi.fn();
const mockSendMediaComment = vi.fn();

const followTracking = vi.hoisted(()=>({observe:vi.fn(),profile:vi.fn()}));
vi.mock("@/lib/automation-tracking",()=>({recordAutomationHit:vi.fn(),observeAutomationFollow:followTracking.observe}));
const mockPublicSlot = vi.hoisted(() => vi.fn());
vi.mock("@/lib/public-reply-limit", () => ({ reservePublicReplySlot: (...args: any[]) => mockPublicSlot(...args), finishPublicReplySlot: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/actions/webhook/queries", () => ({
  flowTriggerForEvent: vi.fn().mockReturnValue(undefined),
  isCurrentFlowOpening: vi.fn().mockReturnValue(true),
  findAutomationForCommentWithReason: (...args: any[]) => mockFindAutomationForCommentWithReason(...args),
  findAutomationForDM: vi.fn(),
  findAutomationById: vi.fn(),
  isDuplicate: (...args: any[]) => mockIsDuplicate(...args),
  hasProcessedCommentWebhook: (...args: any[]) => mockHasProcessedCommentWebhook(...args),
  hasAp3kGeneratedCommentId: (...args: any[]) => mockHasAp3kGeneratedCommentId(...args),
  hasRecentAp3kReplyTextMatch: (...args: any[]) => mockHasRecentAp3kReplyTextMatch(...args),
  countRecentPublicReplies: (...args: any[]) => mockCountRecentPublicReplies(...args),
  hasRecentHandledCommenter: (...args: any[]) => mockHasRecentHandledCommenter(...args),
  countLoopGuardEvents: (...args: any[]) => mockCountLoopGuardEvents(...args),
  countRecentSelfCommentSkips: (...args: any[]) => mockCountRecentSelfCommentSkips(...args),
  pauseAutomationForLoopGuard: (...args: any[]) => mockPauseAutomationForLoopGuard(...args),
  createMessageLog: (...args: any[]) => mockCreateMessageLog(...args),
  upsertLead: (...args: any[]) => mockUpsertLead(...args),
  createAutomationEvent: (...args: any[]) => mockCreateAutomationEvent(...args),
  createWebhookEvent: (...args: any[]) => mockCreateWebhookEvent(...args),
  updateWebhookEvent: (...args: any[]) => mockUpdateWebhookEvent(...args),
  mergeWebhookEventPayload: (...args: any[]) => mockMergeWebhookEventPayload(...args),
  createChatHistory: vi.fn(),
  getChatHistory: vi.fn(),
  trackResponse: (...args: any[]) => mockTrackResponse(...args),
}));

vi.mock("@/lib/webhook-signature", () => ({
  verifyMetaSignature: () => ({
    verified: true,
    reason: "ok",
    candidateSecretsConfigured: true,
    triedSecretCount: 1,
    rawBodySha256Short: "hash",
  }),
}));

vi.mock("@/lib/fetch", () => ({
  META_GRAPH_API_BASE_URL: "https://graph.facebook.test/v1",
  formatSafeMetaError: () => "safe_error",
  getSafeMetaError: () => ({ status: 400, code: 3, message: "capability" }),
  sendDm: vi.fn(),
  sendCommentReply: (...args: any[]) => mockSendCommentReply(...args),
  sendMediaComment: (...args: any[]) => mockSendMediaComment(...args),
}));

vi.mock("@/lib/instagram-dm", () => ({
  getInstagramRecipientProfile: followTracking.profile,
  sendInstagramCommentPrivateReply: (...args: any[]) => mockSendInstagramCommentPrivateReply(...args),
  formatPrivateReplyError: () => "dm_failed",
}));

vi.mock("@/lib/send-token", () => ({
  resolveIntegrationSendToken: () => ({ ok: true, token: "safe-token" }),
  tokenResolutionDiagnostics: () => ({}),
}));

vi.mock("@/lib/openai", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
}));

const ai = vi.hoisted(()=>({decision:vi.fn(),reserve:vi.fn()}));
vi.mock("@/lib/ai-reply",()=>({getAiWorkspaceRuntimeConfig:async()=>({aiCommentsEnabled:false}),generateAiCommentDecision:(...args:any[])=>ai.decision(...args),generateAiDmReply:vi.fn()}));
vi.mock("@/actions/usage/queries", () => ({
  reserveAiReplyQuota:(...args:any[])=>ai.reserve(...args),completeAiReplyReservation:vi.fn(),releaseAiReplyReservation:vi.fn(),
  canSendStaticReply: (...args: any[]) => mockCanSendStaticReply(...args),
}));

vi.mock("@/lib/app-review-mode", () => ({
  isAppReviewMode: () => mockIsAppReviewMode(),
}));

vi.mock("@/lib/instagram-postback-subscription", () => ({
  ensureInstagramPostbackSubscription: vi.fn().mockResolvedValue(true),
  ensureInstagramButtonCallbacks: vi.fn().mockResolvedValue(true),
}));

import { deferAutomationDelivery } from "@/lib/automation-delivery";
import { resumeAutomationDelivery } from "@/lib/meta-webhook-handler";
import { POST } from "@/app/api/webhooks/meta/route";
import { client } from "@/lib/prisma";

function automation(sendPrivateDm: boolean, overrides: Record<string, any> = {}) {
  const commentReply = Object.prototype.hasOwnProperty.call(overrides, "commentReply")
    ? overrides.commentReply
    : "Check your DMs";
  return {
    id: overrides.id ?? `automation-${sendPrivateDm ? "dm-on" : "dm-off"}`,
    userId: "user-1",
    name: "Campaign",
    active: true,
    matchingMode: "CONTAINS",
    triggerMode: overrides.triggerMode ?? "SPECIFIC_KEYWORD",
    sendPrivateDm,
    keywords: overrides.keywords ?? [{ word: "ai" }],
    posts: [{ postid: "ANY" }],
    listener: {
      listener: "MESSAGE",
      prompt: "Here is the link",
      commentReply,
      commentReply2: overrides.commentReply2 ?? null,
      commentReply3: overrides.commentReply3 ?? null,
      ctaLink: null,
      ctaButtonTitle: null,
    },
    User: {
      subscription: { plan: "FREE" },
      integrations: [
        {
          id: "integration-1",
          token: "token",
          instagramId: "ig-1",
          webhookAccountId: "ig-1",
          pageId: "page-1",
          instagramUsername: "maglobalmarketing",
        },
      ],
    },
  };
}

function commentRequest(overrides: Record<string, any> = {}) {
  return new Request("https://ap3k.test/api/webhooks/meta", {
    method: "POST",
    headers: { "x-hub-signature-256": "sha256=test" },
    body: JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: "ig-1",
          changes: [
            {
              field: "comments",
              value: {
                id: overrides.commentId ?? "comment-1",
                media: { id: "media-1" },
                from: {
                  id: overrides.commenterId ?? "commenter-1",
                  username: overrides.commenterUsername ?? "tester",
                },
                text: overrides.text ?? "ai",
              },
            },
          ],
        },
      ],
    }),
  }) as any;
}

beforeEach(() => {
    mockPublicSlot.mockResolvedValue({ok:true,id:"slot"});
    ai.decision.mockResolvedValue({action:"REPLY",category:"SAFE",reply:"Hi @tester! Check your DMs 😊"});
    ai.reserve.mockResolvedValue({ok:true,reservationId:"quota"});
  vi.clearAllMocks();mockClaimComment.mockResolvedValue(true);
  mockCreateWebhookEvent.mockResolvedValue({ id: "webhook-event-1" });
  mockUpdateWebhookEvent.mockResolvedValue({});
  mockMergeWebhookEventPayload.mockResolvedValue({});
  mockCreateAutomationEvent.mockResolvedValue({});
  mockCreateMessageLog.mockResolvedValue({});
  mockIsDuplicate.mockResolvedValue(false);
  mockUpsertLead.mockResolvedValue({});
  mockTrackResponse.mockResolvedValue({});
  mockHasProcessedCommentWebhook.mockResolvedValue(false);
  mockHasAp3kGeneratedCommentId.mockResolvedValue(false);
  mockHasRecentAp3kReplyTextMatch.mockResolvedValue(false);
  mockCountRecentPublicReplies.mockResolvedValue(0);
  mockHasRecentHandledCommenter.mockResolvedValue(false);
  mockCountLoopGuardEvents.mockResolvedValue(0);
  mockCountRecentSelfCommentSkips.mockResolvedValue(0);
  mockPauseAutomationForLoopGuard.mockResolvedValue({});
  mockIsAppReviewMode.mockReturnValue(false);
  mockCanSendStaticReply.mockResolvedValue({
    ok: true,
    usage: {
      plan: "FREE",
      planLabel: "Free",
      periodLabel: "May 2026",
      enforcementStart: new Date("2026-05-01T00:00:00Z"),
      staticReplies: { used: 0, limit: 50, blocked: false },
    },
  });
  mockSendCommentReply.mockResolvedValue({ status: 200, data: { id: "reply-comment-1" } });
  mockSendMediaComment.mockResolvedValue({ status: 200, data: { id: "reply-comment-1" } });
  mockSendInstagramCommentPrivateReply.mockResolvedValue({
    ok: true,
    endpoint: "ig_messages_private_reply",
    ctaMode: "none",
  });
});

describe("comment webhook private DM toggle", () => {
  it("observes follow status before sending the initial follow request",async()=>{
    const campaign:any=automation(true);campaign.followGateRequired=true;campaign.User.subscription.plan="PRO";
    followTracking.profile.mockResolvedValue({followsBusiness:false});
    mockFindAutomationForCommentWithReason.mockResolvedValue({automation:campaign,automations:[campaign],diagnostics:{matchingIntegrationFound:true,matchedAutomationIds:[campaign.id]}});
    await POST(commentRequest());
    expect(followTracking.observe).toHaveBeenCalledWith({integrationId:"integration-1",automationId:campaign.id,recipientIgId:"commenter-1",followsBusiness:false});
    expect(followTracking.observe.mock.invocationCallOrder[0]).toBeLessThan(mockSendInstagramCommentPrivateReply.mock.invocationCallOrder[0]);
  });
  it("uses automation AI even when the workspace master switch is false", async () => {
    const campaign:any = automation(true); campaign.listener.aiReplyEnabled=true; campaign.User.subscription.plan="PRO";
    mockFindAutomationForCommentWithReason.mockResolvedValue({automation:campaign,automations:[campaign],diagnostics:{matchingIntegrationFound:true,matchedAutomationIds:[campaign.id]}});
    await POST(commentRequest());
    expect(ai.decision).toHaveBeenCalledWith(expect.objectContaining({deliveryContext:{sendDm:true,openingDm:true,username:"tester"}}));
    expect(mockSendCommentReply).toHaveBeenCalledWith("comment-1","Hi @tester! Check your DMs 😊","safe-token");
    expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledOnce();
  });
  it("keeps the DM working when the public reply cap is reached",async()=>{
    const campaign=automation(true);
    mockFindAutomationForCommentWithReason.mockResolvedValue({automation:campaign,automations:[campaign],diagnostics:{matchingIntegrationFound:true,matchedAutomationIds:[campaign.id]}});
    mockPublicSlot.mockResolvedValue({ok:false,reason:"public_reply_weekly_limit"});
    await POST(commentRequest());
    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledOnce();
    expect(mockCreateMessageLog).toHaveBeenCalledWith(expect.objectContaining({status:"SKIPPED",errorMessage:"public_reply_weekly_limit"}));
  });
  it("uses a saved DM variation with the original link settings",async()=>{
    const campaign:any=automation(true); campaign.listener.openingDmEnabled=false; campaign.listener.messageVariations=["Alternative one","Alternative two"];
    mockFindAutomationForCommentWithReason.mockResolvedValue({automation:campaign,automations:[campaign],diagnostics:{matchingIntegrationFound:true,matchedAutomationIds:[campaign.id]}});
    await POST(commentRequest());
    const input=mockSendInstagramCommentPrivateReply.mock.calls[0][0];
    expect(["Here is the link","Alternative one","Alternative two"]).toContain(input.message);
    expect(input.commentId).toBe("comment-1");
  });
  it("does not call the private DM endpoint when sendPrivateDm is false and logs DM_SKIPPED", async () => {
    const campaign = automation(false);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest());

    expect(mockCreateWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "COMMENT_WEBHOOK_RECEIVED",
        igAccountId: "ig-1",
        mediaId: "media-1",
        commentId: "comment-1",
      })
    );
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "DM_FAILED" })
    );
    expect(mockCreateMessageLog).not.toHaveBeenCalledWith(
      expect.objectContaining({ messageType: "DM", status: "FAILED" })
    );
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        automationId: campaign.id,
        eventType: "DM_SKIPPED",
        keyword: "ai",
        meta: expect.objectContaining({ reason: "external_dm_tool_enabled" }),
      })
    );
    expect(mockCreateMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({
        automationId: campaign.id,
        messageType: "DM",
        status: "SKIPPED",
        errorMessage: "external_dm_tool_enabled",
      })
    );
  });

  it("keeps the existing private DM attempt when sendPrivateDm is true", async () => {
    const campaign = automation(true);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest());

    expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledOnce();
    expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledWith(expect.objectContaining({
      automationId: campaign.id,
      message: "Hey there! I’m so happy you’re here, thanks so much for your interest 😊\n\nClick below and I’ll send you the link in just a sec ✨",
      responseFormat: "TEXT",
      preferQuickReplyForPostback: false,
      postbackButton: {
        title: "Send me the link",
        payload: `AP3K_OPENING_CONTINUE:${campaign.id}:comment-1`,
      },
    }));
    expect(mockCreateMessageLog).toHaveBeenCalledWith(expect.objectContaining({
      automationId: campaign.id,
      messageType: "DM",
      status: "SENT",
      errorMessage: "opening_dm_sent",
    }));
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        automationId: campaign.id,
        eventType: "DM_SENT",
        keyword: "ai",
      })
    );
  });

  it("logs automation match failure and sends no action when no campaign matches", async () => {
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: null,
      automations: [],
      failureReason: "no_active_automation_for_media",
      diagnostics: {
        matchingIntegrationFound: true,
        matchedIntegrationId: "integration-1",
        matchedIntegrationOwnerUserId: "user-1",
        activeAutomationCount: 0,
      },
    });

    await POST(commentRequest());

    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "AUTOMATION_MATCH_FAILED",
        status: "IGNORED",
        errorMessage: "PUBLIC_REPLY_SKIPPED_MEDIA_MISMATCH",
        payload: expect.objectContaining({
          integrationId: "integration-1",
          ownerUserId: "user-1",
          reason: "PUBLIC_REPLY_SKIPPED_MEDIA_MISMATCH",
          wouldHaveMatchedCampaign: false,
        }),
      })
    );
  });

  it("records keyword mismatch as a public reply skip reason", async () => {
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: null,
      automations: [],
      failureReason: "keyword_mismatch",
      diagnostics: {
        matchingIntegrationFound: true,
        matchedIntegrationId: "integration-1",
        matchedIntegrationOwnerUserId: "user-1",
      },
    });

    await POST(commentRequest({ text: "hello" }));

    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "AUTOMATION_MATCH_FAILED",
        status: "IGNORED",
        errorMessage: "PUBLIC_REPLY_SKIPPED_KEYWORD_MISMATCH",
        payload: expect.objectContaining({
          reason: "PUBLIC_REPLY_SKIPPED_KEYWORD_MISMATCH",
          wouldHaveMatchedCampaign: true,
          whyNoPublicReply: "PUBLIC_REPLY_SKIPPED_KEYWORD_MISMATCH",
        }),
      })
    );
  });

  it("records media mismatch as a public reply skip reason", async () => {
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: null,
      automations: [],
      failureReason: "no_active_automation_for_media",
      diagnostics: {
        matchingIntegrationFound: true,
        matchedIntegrationId: "integration-1",
        matchedIntegrationOwnerUserId: "user-1",
      },
    });

    await POST(commentRequest({ text: "ai" }));

    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockCreateWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage: "PUBLIC_REPLY_SKIPPED_MEDIA_MISMATCH",
        payload: expect.objectContaining({
          reason: "PUBLIC_REPLY_SKIPPED_MEDIA_MISMATCH",
          whyNoPublicReply: "PUBLIC_REPLY_SKIPPED_MEDIA_MISMATCH",
        }),
      })
    );
  });

  it("logs ambiguous integration match and sends no reply", async () => {
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: null,
      automations: [],
      failureReason: "ambiguous",
      diagnostics: {
        matchingIntegrationFound: true,
        ambiguous: true,
        matchedAutomationIds: ["automation-a", "automation-b"],
      },
    });

    await POST(commentRequest());

    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "AMBIGUOUS_INTEGRATION_MATCH",
        status: "IGNORED",
        errorMessage: "ambiguous",
      })
    );
  });

  it("allows a normal Any Comment campaign comment to send one public reply", async () => {
    const campaign = automation(false, { triggerMode: "ANY_COMMENT", keywords: [] });
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ text: "hello" }));

    expect(mockSendCommentReply).toHaveBeenCalledOnce();
    expect(mockUpsertLead).toHaveBeenCalledOnce();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        automationId: campaign.id,
        eventType: "PUBLIC_REPLY_SENT",
        commentId: "reply-comment-1",
        meta: expect.objectContaining({
          sourceCommentId: "comment-1",
          publicReplyTextHash: expect.any(String),
        }),
      })
    );
  });

  it("does not call public reply endpoints when public reply is disabled", async () => {
    const campaign = automation(true, { commentReply: null });
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest());

    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendMediaComment).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledOnce();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        automationId: campaign.id,
        eventType: "COMMENT_SKIPPED",
        meta: expect.objectContaining({ reason: "public_reply_disabled" }),
      })
    );
  });

  it("with both outbound actions off sends nothing and logs clear skips", async () => {
    const campaign = automation(false, { commentReply: null });
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest());

    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendMediaComment).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "COMMENT_SKIPPED",
        meta: expect.objectContaining({ reason: "public_reply_disabled" }),
      })
    );
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "DM_SKIPPED",
        meta: expect.objectContaining({ reason: "external_dm_tool_enabled" }),
      })
    );
  });

  it("with public reply on and DM off sends exactly one public reply and logs DM skipped", async () => {
    const campaign = automation(false);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest());

    expect(mockSendCommentReply).toHaveBeenCalledOnce();
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "DM_FAILED" })
    );
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "PUBLIC_REPLY_SENT" })
    );
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "DM_SKIPPED" })
    );
  });

  it("sends public replies for different users repeating the same keyword", async () => {
    const campaign = automation(false);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ commentId: "comment-1", commenterId: "user-1", commenterUsername: "one", text: "ai" }));
    await POST(commentRequest({ commentId: "comment-2", commenterId: "user-2", commenterUsername: "two", text: "ai" }));
    await POST(commentRequest({ commentId: "comment-3", commenterId: "user-3", commenterUsername: "three", text: "ai" }));

    expect(mockSendCommentReply).toHaveBeenCalledTimes(3);
    expect(mockCreateAutomationEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "LOOP_GUARD_TRIGGERED" })
    );
  });

  it("sends public replies for the same external user using two unique comment ids", async () => {
    const campaign = automation(false);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ commentId: "comment-a", commenterId: "same-user", text: "ai" }));
    await POST(commentRequest({ commentId: "comment-b", commenterId: "same-user", text: "ai" }));

    expect(mockSendCommentReply).toHaveBeenCalledTimes(2);
    expect(mockCreateAutomationEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "COMMENT_SKIPPED",
        meta: expect.objectContaining({ reason: "commenter_recently_handled" }),
      })
    );
  });

  it("logs public reply failed when Meta returns success without an id", async () => {
    const campaign = automation(false);
    mockSendCommentReply.mockResolvedValue({ status: 200, data: {} });
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest());

    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PUBLIC_REPLY_FAILED",
        meta: expect.objectContaining({ error: "meta_public_reply_missing_id" }),
      })
    );
    expect(mockCreateMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({
        messageType: "COMMENT_REPLY",
        status: "FAILED",
        errorMessage: "meta_public_reply_missing_id",
      })
    );
  });

  it("skips comments from the connected IG business account id before lead or sends", async () => {
    const campaign = automation(true);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ commenterId: "ig-1" }));

    expect(mockUpsertLead).not.toHaveBeenCalled();
    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        automationId: campaign.id,
        eventType: "SELF_COMMENT_SKIPPED",
        meta: expect.objectContaining({ reason: "PUBLIC_REPLY_SKIPPED_SELF_COMMENT" }),
      })
    );
  });

  it("skips comments from the connected IG username before lead or sends", async () => {
    const campaign = automation(true);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ commenterUsername: "maglobalmarketing" }));

    expect(mockUpsertLead).not.toHaveBeenCalled();
    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "SELF_COMMENT_SKIPPED" })
    );
  });

  it("skips AP3K-generated public reply comment ids", async () => {
    const campaign = automation(true);
    mockHasAp3kGeneratedCommentId.mockResolvedValue(true);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ commentId: "reply-comment-1" }));

    expect(mockUpsertLead).not.toHaveBeenCalled();
    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "COMMENT_SKIPPED",
        meta: expect.objectContaining({ reason: "PUBLIC_REPLY_SKIPPED_AP3K_GENERATED_REPLY" }),
      })
    );
  });

  it("does not skip an external user only because their text matches a recent AP3K reply", async () => {
    const campaign = automation(true, { keywords: [{ word: "Check your DMs" }] });
    mockHasRecentAp3kReplyTextMatch.mockResolvedValue(true);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ text: "Check your DMs" }));

    expect(mockUpsertLead).toHaveBeenCalledOnce();
    expect(mockSendCommentReply).toHaveBeenCalledOnce();
    expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledOnce();
    expect(mockCreateAutomationEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "COMMENT_SKIPPED" })
    );
  });

  it("ignores duplicate comment ids before lead, public reply, or private DM", async () => {
    const campaign = automation(true);
    mockHasProcessedCommentWebhook.mockResolvedValue(true);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest());

    expect(mockUpsertLead).not.toHaveBeenCalled();
    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "DUPLICATE_SKIPPED",
        meta: expect.objectContaining({ reason: "PUBLIC_REPLY_SKIPPED_DUPLICATE_COMMENT" }),
      })
    );
  });

  it("allows the same external user to comment the keyword twice with different comment ids", async () => {
    const campaign = automation(true);
    mockHasRecentHandledCommenter.mockResolvedValue(true);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest());

    expect(mockUpsertLead).toHaveBeenCalledOnce();
    expect(mockSendCommentReply).toHaveBeenCalledOnce();
    expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledOnce();
  });

  it("does not loop-guard skip valid external comments only because public reply volume is high", async () => {
    const campaign = automation(true, { triggerMode: "ANY_COMMENT", keywords: [] });
    mockCountRecentPublicReplies.mockImplementation((input: any) =>
      input.mediaId ? Promise.resolve(5) : Promise.resolve(50)
    );
    mockCountLoopGuardEvents.mockResolvedValue(5);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ text: "new comment" }));

    expect(mockSendCommentReply).toHaveBeenCalledOnce();
    expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledOnce();
    expect(mockPauseAutomationForLoopGuard).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PUBLIC_REPLY_SENT",
        meta: expect.objectContaining({
          reason: "PUBLIC_REPLY_SENT",
          publicReplyVolumeExceeded: true,
        }),
      })
    );
  });

  it("skips public reply and private DM when the static reply limit is reached", async () => {
    const campaign = automation(true);
    mockCanSendStaticReply.mockResolvedValue({
      ok: false,
      reason: "static_reply_limit_reached",
      usage: {
        plan: "FREE",
        planLabel: "Free",
        periodLabel: "May 2026",
        enforcementStart: new Date("2026-05-23T00:00:00Z"),
        staticReplies: { used: 50, limit: 50, blocked: true },
      },
    });
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest());

    expect(mockUpsertLead).not.toHaveBeenCalled();
    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "COMMENT_SKIPPED",
        meta: expect.objectContaining({ reason: "static_reply_limit_reached" }),
      })
    );
    expect(mockCreateMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({
        messageType: "COMMENT_REPLY",
        status: "SKIPPED",
        errorMessage: "static_reply_limit_reached",
      })
    );
    expect(mockCreateMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({
        messageType: "DM",
        status: "SKIPPED",
        errorMessage: "static_reply_limit_reached",
      })
    );
  });
});

describe("loop guard threshold behavior", () => {
  it("does not pause campaign for a single self-comment skip", async () => {
    const campaign = automation(true, { triggerMode: "ANY_COMMENT", keywords: [] });
    mockCountRecentSelfCommentSkips.mockResolvedValue(1);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    // Comment from the connected account's own Instagram ID
    await POST(commentRequest({ commenterId: "ig-1", text: "self comment" }));

    expect(mockPauseAutomationForLoopGuard).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SELF_COMMENT_SKIPPED",
        meta: expect.objectContaining({ reason: "PUBLIC_REPLY_SKIPPED_SELF_COMMENT" }),
      })
    );
  });

  it("does not pause campaign for a duplicate webhook skip", async () => {
    const campaign = automation(true);
    mockHasProcessedCommentWebhook.mockResolvedValue(true);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest());

    expect(mockPauseAutomationForLoopGuard).not.toHaveBeenCalled();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "DUPLICATE_SKIPPED" })
    );
  });

  it("pauses an ANY_COMMENT campaign after 3+ self-comment skips within 10 minutes", async () => {
    const campaign = automation(true, { triggerMode: "ANY_COMMENT", keywords: [] });
    mockCountRecentSelfCommentSkips.mockResolvedValue(3);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ commenterId: "ig-1", text: "self comment" }));

    expect(mockPauseAutomationForLoopGuard).toHaveBeenCalledWith(campaign.id);
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "LOOP_GUARD_PAUSED_CAMPAIGN",
        meta: expect.objectContaining({ reason: "repeated_self_comment_skips" }),
      })
    );
  });

  it("existing loop guard events do not block future valid external comments", async () => {
    const campaign = automation(true, { triggerMode: "ANY_COMMENT", keywords: [] });
    mockCountRecentPublicReplies.mockImplementation((input: any) =>
      input.mediaId ? Promise.resolve(5) : Promise.resolve(50)
    );
    mockCountLoopGuardEvents.mockResolvedValue(4);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ text: "new comment" }));

    expect(mockSendCommentReply).toHaveBeenCalledOnce();
    expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledOnce();
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "PUBLIC_REPLY_SENT" })
    );
    expect(mockCreateAutomationEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "LOOP_GUARD_TRIGGERED" })
    );
    expect(mockPauseAutomationForLoopGuard).not.toHaveBeenCalled();
  });

  it("does not pause a keyword campaign for self-comment or no-match activity", async () => {
    // SPECIFIC_KEYWORD campaign — even with many self-comment skips the campaign must not pause
    const campaign = automation(true, { triggerMode: "SPECIFIC_KEYWORD", keywords: [{ word: "ai" }] });
    mockCountRecentSelfCommentSkips.mockResolvedValue(10);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ commenterId: "ig-1", text: "ai" }));

    expect(mockPauseAutomationForLoopGuard).not.toHaveBeenCalled();
    // Audit event still recorded
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "SELF_COMMENT_SKIPPED" })
    );
  });

  it("still records SELF_COMMENT_SKIPPED and DUPLICATE_SKIPPED audit events below threshold", async () => {
    const campaign = automation(true, { triggerMode: "ANY_COMMENT", keywords: [] });
    mockCountRecentSelfCommentSkips.mockResolvedValue(2);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ commenterId: "ig-1", text: "testing" }));

    // Audit event written
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "SELF_COMMENT_SKIPPED" })
    );
    // But no pause
    expect(mockPauseAutomationForLoopGuard).not.toHaveBeenCalled();
  });

  it("in App Review Mode, does not auto-pause for self-comment skips even when threshold is met", async () => {
    mockIsAppReviewMode.mockReturnValue(true);
    const campaign = automation(true, { triggerMode: "ANY_COMMENT", keywords: [] });
    // Well above the self-comment threshold
    mockCountRecentSelfCommentSkips.mockResolvedValue(10);
    mockFindAutomationForCommentWithReason.mockResolvedValue({
      automation: campaign,
      automations: [campaign],
      diagnostics: { matchingIntegrationFound: true, matchedAutomationIds: [campaign.id] },
    });

    await POST(commentRequest({ commenterId: "ig-1", text: "testing" }));

    // Audit event still written
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "SELF_COMMENT_SKIPPED" })
    );
    // No auto-pause in review mode
    expect(mockPauseAutomationForLoopGuard).not.toHaveBeenCalled();
  });
});

it("leaves a pending shared comment claim for its worker without sending twice",async()=>{
 mockFindAutomationForCommentWithReason.mockResolvedValue({automation:automation(true,{commentReply:"Here you go"}),failureReason:null});
 mockClaimComment.mockResolvedValue(false);
 await POST(commentRequest());
 expect(mockSendCommentReply).not.toHaveBeenCalled();expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
 expect(mockUpdateWebhookEvent).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({status:"PROCESSING",errorMessage:"comment_delivery_already_claimed"}));
});

describe("independent comment delivery steps",()=>{
 function configure(){const campaign={...automation(true),stepDelays:{PUBLIC_REPLY:300,OPENING:5,MESSAGE:60}};mockFindAutomationForCommentWithReason.mockResolvedValue({automation:campaign,automations:[campaign],diagnostics:{matchingIntegrationFound:true,matchedAutomationIds:[campaign.id]}});return campaign;}
 it("queues the public reply and opener with different deadlines",async()=>{
  configure();await POST(commentRequest());
  expect(deferAutomationDelivery).toHaveBeenCalledWith(expect.objectContaining({eventKey:"comment:comment-1:public",seconds:300,entry:expect.objectContaining({ap3kDeliveryStep:"PUBLIC_REPLY"})}));
  expect(deferAutomationDelivery).toHaveBeenCalledWith(expect.objectContaining({eventKey:"comment:comment-1:dm",seconds:5,entry:expect.objectContaining({ap3kDeliveryStep:"PRIVATE_DM"})}));
  expect(mockSendCommentReply).not.toHaveBeenCalled();expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
 });
 it("resumes each step once without resending the other or suppressing the public reply after the DM",async()=>{
  const campaign=configure();const body=await commentRequest().json();const entry=body.entry[0];
  await resumeAutomationDelivery(campaign.id,{...entry,ap3kDeliveryStep:"PRIVATE_DM"},"instagram");
  expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledOnce();expect(mockSendCommentReply).not.toHaveBeenCalled();
  mockIsDuplicate.mockResolvedValue(true);mockHasProcessedCommentWebhook.mockResolvedValue(true);
  await resumeAutomationDelivery(campaign.id,{...entry,ap3kDeliveryStep:"PUBLIC_REPLY"},"instagram");
  expect(mockSendCommentReply).toHaveBeenCalledOnce();expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledOnce();
  expect(mockTrackResponse.mock.calls.filter(call=>call[1]==="COMMENT")).toHaveLength(1);
  expect(mockCreateAutomationEvent.mock.calls.filter(call=>call[0].eventType==="COMMENT_RECEIVED")).toHaveLength(1);
 });
 it("uses a native quick reply for the selected opener format",async()=>{
  const campaign=automation(true);Object.assign(campaign.listener,{openingDmFormat:"QUICK_REPLY"});
  mockFindAutomationForCommentWithReason.mockResolvedValue({automation:campaign,automations:[campaign],diagnostics:{matchingIntegrationFound:true}});
  await POST(commentRequest());expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledWith(expect.objectContaining({preferQuickReplyForPostback:true,postbackButton:expect.objectContaining({payload:`AP3K_OPENING_CONTINUE:${campaign.id}:comment-1`})}));
 });
});

const captureMock=vi.hoisted(()=>({begin:vi.fn(),finish:vi.fn()}));
vi.mock('@/lib/automation-engagement',async importOriginal=>({...await importOriginal<any>(),beginEmailRequest:captureMock.begin,finishEngagementJob:captureMock.finish}));
describe('collect contact details as the first private reply',()=>{
 it.each([
  {email:null,phone:null,seconds:15},
  {email:'known@example.com',phone:null,seconds:30},
  {email:'known@example.com',phone:'+19496537130',seconds:60},
 ])('delays the next uncaptured step by $seconds seconds',async ({email,phone,seconds})=>{
  const lookup=vi.spyOn(client.lead,'findUnique').mockResolvedValue({email,phone} as any);
  try {
   const campaign:any=automation(true);campaign.User.subscription.plan='PRO';campaign.listener.openingDmEnabled=false;campaign.listener.emailCaptureEnabled=true;campaign.listener.phoneCaptureEnabled=true;campaign.stepDelays={EMAIL:15,PHONE:30,MESSAGE:60};
   mockFindAutomationForCommentWithReason.mockResolvedValue({automation:campaign,automations:[campaign],diagnostics:{matchingIntegrationFound:true,matchedAutomationIds:[campaign.id]}});
   await POST(commentRequest());
   expect(deferAutomationDelivery).toHaveBeenCalledWith(expect.objectContaining({eventKey:'comment:comment-1:dm',seconds}));
   expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();
  } finally { lookup.mockRestore(); }
 });
 it.each(['EMAIL','PHONE'])('sends only the %s ask and keeps the final payload for after a valid reply',async kind=>{
  const campaign:any=automation(true);campaign.User.subscription.plan='PRO';campaign.listener.openingDmEnabled=false;campaign.listener.emailCaptureEnabled=kind==='EMAIL';campaign.listener.phoneCaptureEnabled=kind==='PHONE';campaign.listener.emailCapturePrompt='Your email, {{username}}?';campaign.listener.phoneCapturePrompt='Your phone, {{username}}?';campaign.listener.ctaLink='https://example.com/private';
  mockFindAutomationForCommentWithReason.mockResolvedValue({automation:campaign,automations:[campaign],diagnostics:{matchingIntegrationFound:true,matchedAutomationIds:[campaign.id]}});
  captureMock.begin.mockResolvedValue({kind:'request',jobId:'capture-job'});
  await POST(commentRequest());expect(captureMock.begin).toHaveBeenCalledWith(campaign.id,'commenter-1','comment-1',expect.any(Date),kind);
  expect(mockSendInstagramCommentPrivateReply).toHaveBeenCalledWith(expect.objectContaining({message:kind==='EMAIL'?'Your email, @tester?':'Your phone, @tester?',responseFormat:'TEXT',linkButtons:[],ctaUrl:undefined,postbackButton:undefined}));
  expect(captureMock.finish).toHaveBeenCalledWith('capture-job','WAITING');
  expect(mockCreateMessageLog).toHaveBeenCalledWith(expect.objectContaining({errorMessage:'email_request_dm_sent'}));
 });
 it('blocks capture after a downgrade before requesting or sending contact details',async()=>{
  const campaign:any=automation(true);campaign.listener.emailCaptureEnabled=true;campaign.listener.openingDmEnabled=false;
  mockFindAutomationForCommentWithReason.mockResolvedValue({automation:campaign,automations:[campaign],diagnostics:{matchingIntegrationFound:true,matchedAutomationIds:[campaign.id]}});
  await POST(commentRequest());expect(mockSendInstagramCommentPrivateReply).not.toHaveBeenCalled();expect(captureMock.begin).not.toHaveBeenCalled();
 });
});
