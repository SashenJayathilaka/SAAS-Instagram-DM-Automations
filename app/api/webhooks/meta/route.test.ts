vi.mock("@/lib/automation-delivery",()=>({claimImmediateStory:vi.fn().mockResolvedValue(true),claimImmediateComment:vi.fn().mockResolvedValue(true),claimDmRecipient:vi.fn().mockResolvedValue(true),deferAutomationDelivery:vi.fn()}));
import { resumeAutomationDelivery } from "@/lib/meta-webhook-handler";
import {claimImmediateStory,deferAutomationDelivery} from "@/lib/automation-delivery";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/automation-flow/runtime", () => ({
  processAutomationFlow: vi.fn().mockResolvedValue(false),
}));

const mockCreateWebhookEvent = vi.fn();
const mockUpdateWebhookEvent = vi.fn();
const mockVerifyMetaSignature = vi.fn();
const mockFindAutomationById = vi.fn();
const mockFindAutomationForDM = vi.fn();
const mockFindAutomationForStory = vi.fn();
const mockFindPendingCommentDmActionForText = vi.fn();
const mockFindIntegrationForWebhookAccount = vi.fn();
const mockIsDuplicate = vi.fn();
const mockHasDeliveredFinalPayload = vi.fn();
const mockCreateMessageLog = vi.fn();
const mockCreateAutomationEvent = vi.fn();
const mockUpsertInboundInboxMessage = vi.fn();
const mockRecordOutboundInboxMessage = vi.fn();
const mockTrackResponse = vi.fn();
const mockGetInstagramRecipientProfile = vi.fn();
const mockSendInstagramDirectResponse = vi.fn();
const mockResolveIntegrationSendToken = vi.fn();
const mockCanSendStaticReply = vi.fn();
const mockReserveAiReplyQuota = vi.fn();
const mockGetAiWorkspaceRuntimeConfig = vi.fn();
const mockGenerateAiDmReply = vi.fn();

const mockBeginEmailRequest = vi.fn();
const mockTakeEmailReply = vi.fn();
const mockFinishEngagementJob = vi.fn();
const mockScheduleFollowUp = vi.fn();
vi.mock("@/lib/automation-engagement", () => ({
  recordEngagementReceipt: vi.fn(),
  cancelPendingFollowUps: vi.fn().mockResolvedValue(undefined),
  beginEmailRequest: (...args: unknown[]) => mockBeginEmailRequest(...args),
  takeEmailReply: (...args: unknown[]) => mockTakeEmailReply(...args),
  finishEngagementJob: (...args: unknown[]) => mockFinishEngagementJob(...args),
  scheduleFollowUp: (...args: unknown[]) => mockScheduleFollowUp(...args),
}));

vi.mock("@/actions/webhook/queries", () => ({
  flowTriggerForEvent: vi.fn().mockReturnValue(undefined),
  isCurrentFlowOpening: vi.fn().mockReturnValue(true),
  findAutomationForCommentWithReason: vi.fn(),
  findAutomationForDM: (...args: unknown[]) => mockFindAutomationForDM(...args),
  findAutomationForStory: (...args:unknown[])=>mockFindAutomationForStory(...args),
  findPendingCommentDmActionForText: (...args: unknown[]) =>
    mockFindPendingCommentDmActionForText(...args),
  findAutomationById: (...args: unknown[]) => mockFindAutomationById(...args),
  findIntegrationForWebhookAccount: (...args: unknown[]) =>
    mockFindIntegrationForWebhookAccount(...args),
  isDuplicate: (...args: unknown[]) => mockIsDuplicate(...args),
  hasDeliveredFinalPayload: (...args: unknown[]) =>
    mockHasDeliveredFinalPayload(...args),
  hasProcessedCommentWebhook: vi.fn(),
  hasAp3kGeneratedCommentId: vi.fn(),
  countRecentPublicReplies: vi.fn(),
  countRecentSelfCommentSkips: vi.fn(),
  pauseAutomationForLoopGuard: vi.fn(),
  createMessageLog: (...args: unknown[]) => mockCreateMessageLog(...args),
  upsertLead: vi.fn(),
  createAutomationEvent: (...args: unknown[]) =>
    mockCreateAutomationEvent(...args),
  createWebhookEvent: (...args: unknown[]) => mockCreateWebhookEvent(...args),
  updateWebhookEvent: (...args: unknown[]) => mockUpdateWebhookEvent(...args),
  mergeWebhookEventPayload: vi.fn(),
  createChatHistory: vi.fn(),
  getChatHistory: vi.fn(),
  trackResponse: (...args: unknown[]) => mockTrackResponse(...args),
  upsertInboundInboxMessage: (...args: unknown[]) =>
    mockUpsertInboundInboxMessage(...args),
  recordOutboundInboxMessage: (...args: unknown[]) =>
    mockRecordOutboundInboxMessage(...args),
}));

vi.mock("@/lib/webhook-signature", () => ({
  verifyMetaSignature: (...args: unknown[]) => mockVerifyMetaSignature(...args),
}));

vi.mock("@/lib/fetch", () => ({
  formatSafeMetaError: () => "safe_error",
  getSafeMetaError: () => ({ status: 400 }),
  sendDm: vi.fn(),
  sendCommentReply: vi.fn(),
  sendMediaComment: vi.fn(),
}));

vi.mock("@/lib/instagram-dm", () => ({
  sendInstagramCommentPrivateReply: vi.fn(),
  sendInstagramDirectResponse: (...args: unknown[]) =>
    mockSendInstagramDirectResponse(...args),
  sendInstagramSenderAction: vi.fn(),
  getInstagramRecipientProfile: (...args: unknown[]) =>
    mockGetInstagramRecipientProfile(...args),
  formatPrivateReplyError: () => "dm_failed",
}));

vi.mock("@/lib/send-token", () => ({
  resolveIntegrationSendToken: (...args: unknown[]) =>
    mockResolveIntegrationSendToken(...args),
  tokenResolutionDiagnostics: () => ({}),
}));

vi.mock("@/actions/usage/queries", () => ({
  canSendStaticReply: (...args: unknown[]) => mockCanSendStaticReply(...args),
  reserveAiReplyQuota: (...args: unknown[]) => mockReserveAiReplyQuota(...args),
  completeAiReplyReservation: vi.fn(),
  releaseAiReplyReservation: vi.fn(),
}));

vi.mock("@/lib/ai-reply", () => ({
  getAiWorkspaceRuntimeConfig: (...args: unknown[]) =>
    mockGetAiWorkspaceRuntimeConfig(...args),
  generateAiDmReply: (...args: unknown[]) => mockGenerateAiDmReply(...args),
  generateAiCommentDecision: vi.fn(),
}));

vi.mock("@/lib/app-review-mode", () => ({
  isAppReviewMode: () => false,
}));

vi.mock("@/lib/openai", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
}));

vi.mock("@/lib/instagram-postback-subscription", () => ({
  ensureInstagramPostbackSubscription: vi.fn().mockResolvedValue(true),
  ensureInstagramButtonCallbacks: vi.fn().mockResolvedValue(true),
}));

import { GET, POST } from "./route";

function signatureResult(verified: boolean) {
  return {
    verified,
    reason: verified ? "verified" : "signature_mismatch",
    triedSecretCount: 1,
    candidateSecretsConfigured: {
      META_APP_SECRET: true,
      INSTAGRAM_APP_SECRET: false,
      INSTAGRAM_CLIENT_SECRET: false,
    },
    rawBodySha256Short: "abcdef123456",
  };
}

describe("Meta webhook route security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTakeEmailReply.mockResolvedValue(null);
    mockBeginEmailRequest.mockResolvedValue({ kind: "complete" });
    process.env.META_VERIFY_TOKEN = "verify-token";
    mockCreateWebhookEvent.mockResolvedValue({ id: "webhook-event-1" });
    mockUpdateWebhookEvent.mockResolvedValue({});
    mockVerifyMetaSignature.mockReturnValue(signatureResult(false));
    mockFindAutomationById.mockResolvedValue(null);
    mockFindAutomationForDM.mockResolvedValue(null);
    mockFindAutomationForStory.mockResolvedValue(null);
    mockFindPendingCommentDmActionForText.mockResolvedValue(null);
    mockFindIntegrationForWebhookAccount.mockResolvedValue(null);
    mockIsDuplicate.mockResolvedValue(false);
    mockHasDeliveredFinalPayload.mockResolvedValue(false);
    mockCreateMessageLog.mockResolvedValue({});
    mockCreateAutomationEvent.mockResolvedValue({});
    mockUpsertInboundInboxMessage.mockResolvedValue({});
    mockRecordOutboundInboxMessage.mockResolvedValue({});
    mockTrackResponse.mockResolvedValue({});
    mockGetInstagramRecipientProfile.mockResolvedValue(null);
    mockSendInstagramDirectResponse.mockResolvedValue({
      ok: true,
      messageIds: ["mid.outbound"],
    });
    mockResolveIntegrationSendToken.mockReturnValue({
      ok: false,
      reason: "token_missing",
    });
    mockCanSendStaticReply.mockResolvedValue({ ok: true });
    mockGetAiWorkspaceRuntimeConfig.mockResolvedValue({
      aiRepliesEnabled: true,
    });
    mockGenerateAiDmReply.mockResolvedValue({ ok: true, reply: "AI reply" });
  });

  it("does not persist failed GET verification attempts", async () => {
    const response = await GET(
      new NextRequest(
        "https://ap3k.test/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc",
      ),
    );

    expect(response.status).toBe(403);
    expect(mockCreateWebhookEvent).not.toHaveBeenCalled();
  });

  it("still acknowledges valid GET verification challenges", async () => {
    const response = await GET(
      new NextRequest(
        "https://ap3k.test/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=challenge-value",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("challenge-value");
    expect(mockCreateWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "WEBHOOK_VERIFY_GET",
        status: "PROCESSED",
      }),
    );
  });

  it("verifies the raw body before parsing or writing webhook diagnostics", async () => {
    const rawBody = '{"object":"instagram","entry":[]}';
    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=bad" },
        body: rawBody,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockVerifyMetaSignature).toHaveBeenCalledWith(rawBody, "sha256=bad");
    expect(mockCreateWebhookEvent).not.toHaveBeenCalled();
  });

  it("persists invalid JSON only after a valid Meta signature", async () => {
    mockVerifyMetaSignature.mockReturnValue(signatureResult(true));

    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=good" },
        body: "{not-json",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockCreateWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PAYLOAD_INVALID",
        status: "FAILED",
        errorMessage: "invalid_json_payload",
      }),
    );
  });

  it("rejects oversized webhook bodies before signature verification", async () => {
    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: {
          "content-length": String(1024 * 1024 + 1),
          "x-hub-signature-256": "sha256=bad",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(413);
    expect(mockVerifyMetaSignature).not.toHaveBeenCalled();
    expect(mockCreateWebhookEvent).not.toHaveBeenCalled();
  });

  it("records delivery receipts without treating them as inbound DMs", async () => {
    mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
    const body = JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              sender: { id: "recipient-1" },
              recipient: { id: "ig-business-1" },
              timestamp: Date.now(),
              delivery: { mids: ["mid.outbound"] },
            },
          ],
        },
      ],
    });

    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=good" },
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUpdateWebhookEvent).toHaveBeenCalledWith(
      "webhook-event-1",
      expect.objectContaining({
        status: "IGNORED",
        errorMessage: "inbound_system_event_skipped",
      }),
    );
    expect(mockFindIntegrationForWebhookAccount).not.toHaveBeenCalled();
    expect(mockUpsertInboundInboxMessage).not.toHaveBeenCalled();
    expect(mockSendInstagramDirectResponse).not.toHaveBeenCalled();
  });

  it("uses the automation-owned integration when releasing the final DM", async () => {
    mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
    const integration = {
      userId: "user-1",
      token: "token-1",
      instagramId: "ig-business-1",
      pageId: "ig-business-1",
      instagramUsername: "ap3k",
      status: "CONNECTED",
      reconnectRequired: false,
    };
    mockFindIntegrationForWebhookAccount.mockResolvedValue({
      ...integration,
      userId: "stale-user",
      token: "stale-token",
    });
    mockFindAutomationById.mockResolvedValue({
      id: "automation-1",
      userId: "user-1",
      source: "COMMENT",
      active: true,
      followGateRequired: false,
      listener: {
        prompt: "Here is the final link",
        responseFormat: "LINK",
        quickReplies: [],
        ctaButtonTitle: "Get the Link",
        ctaLink: "https://example.com/guide",
        mediaUrl: null,
        mediaType: null,
      },
      User: { integrations: [integration] },
    });
    mockResolveIntegrationSendToken.mockReturnValue({
      ok: true,
      token: "token-1",
    });

    const body = JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              sender: { id: "recipient-1" },
              recipient: { id: "ig-business-1" },
              timestamp: Date.now(),
              postback: {
                title: "Send me the link",
                payload: "AP3K_OPENING_CONTINUE:automation-1",
              },
            },
          ],
        },
      ],
    });
    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=good" },
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockHasDeliveredFinalPayload).toHaveBeenCalledWith(
      "automation-1",
      "recipient-1",
    );
    expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "recipient-1",
        automationId: "automation-1",
        message: "Here is the final link",
        ctaTitle: "Get the Link",
        ctaUrl: "https://example.com/guide",
        postbackButton: undefined,
      }),
    );
    expect(mockCreateMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SENT",
        errorMessage: "final_dm_payload_sent",
      }),
    );
  });

  it.each(["text", "quick_reply"])(
    "releases the final DM from an opening %s callback",
    async (kind) => {
      mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
      const integration = {
        userId: "user-1",
        token: "token-1",
        instagramId: "ig-business-1",
        pageId: "ig-business-1",
        instagramUsername: "ap3k",
        status: "CONNECTED",
        reconnectRequired: false,
      };
      mockFindIntegrationForWebhookAccount.mockResolvedValue(integration);
      const automation = {
        id: "automation-1",
        userId: "user-1",
        source: "COMMENT",
        active: true,
        followGateRequired: false,
        listener: {
          prompt: "Here is the final link",
          responseFormat: "LINK",
          quickReplies: [],
          ctaButtonTitle: "Get the Link",
          ctaLink: "https://example.com/guide",
          mediaUrl: null,
          mediaType: null,
        },
        User: { integrations: [integration] },
      };
      mockFindAutomationById.mockResolvedValue(automation);
      mockFindPendingCommentDmActionForText.mockResolvedValue({
        automation,
        action: { type: "OPENING_CONTINUE", automationId: "automation-1" },
      });
      mockResolveIntegrationSendToken.mockReturnValue({
        ok: true,
        token: "token-1",
      });

      const body = JSON.stringify({
        object: "instagram",
        entry: [
          {
            id: "ig-business-1",
            messaging: [
              {
                sender: { id: "recipient-1" },
                recipient: { id: "ig-business-1" },
                timestamp: Date.now(),
                message: {
                  mid: "mid.inbound",
                  text: "Send me the link",
                  ...(kind === "quick_reply"
                    ? {
                        quick_reply: {
                          payload: "AP3K_OPENING_CONTINUE:automation-1",
                        },
                      }
                    : {}),
                },
              },
            ],
          },
        ],
      });
      const response = await POST(
        new NextRequest("https://ap3k.test/api/webhooks/meta", {
          method: "POST",
          headers: { "x-hub-signature-256": "sha256=good" },
          body,
        }),
      );

      expect(response.status).toBe(200);
      expect(mockHasDeliveredFinalPayload).toHaveBeenCalledWith(
        "automation-1",
        "recipient-1",
      );
      expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: "recipient-1",
          automationId: "automation-1",
          message: "Here is the final link",
          ctaTitle: "Get the Link",
          ctaUrl: "https://example.com/guide",
          postbackButton: undefined,
        }),
      );
      expect(mockCreateMessageLog).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "SENT",
          errorMessage: "final_dm_payload_sent",
        }),
      );
    },
  );

  it("persists inbound Instagram image attachments for the inbox", async () => {
    mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
    mockFindIntegrationForWebhookAccount.mockResolvedValue({
      userId: "user-1",
      token: "token-1",
      instagramId: "ig-business-1",
      pageId: "ig-business-1",
      instagramUsername: "ap3k",
      status: "CONNECTED",
      reconnectRequired: false,
    });
    mockResolveIntegrationSendToken.mockReturnValue({
      ok: true,
      token: "token-1",
    });
    mockGetInstagramRecipientProfile.mockResolvedValue({
      username: "prospect",
      name: "Prospect",
      profilePictureUrl: "https://scontent.fbcdn.net/avatar.jpg",
    });

    const body = JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              sender: { id: "recipient-1" },
              recipient: { id: "ig-business-1" },
              timestamp: Date.now(),
              message: {
                mid: "mid.image",
                attachments: [
                  {
                    type: "image",
                    payload: {
                      url: "https://scontent.cdninstagram.com/inbound.jpg",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=good" },
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUpsertInboundInboxMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        senderIgId: "recipient-1",
        content: "Sent an image",
        messageType: "IMAGE",
        mediaUrl: "https://scontent.cdninstagram.com/inbound.jpg",
      }),
    );
  });

  it("uses the saved DM fallback when AI quota reservation fails", async () => {
    mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
    const integration = {
      userId: "user-1",
      token: "token-1",
      instagramId: "ig-business-1",
      pageId: "ig-business-1",
      instagramUsername: "ap3k",
      status: "CONNECTED",
      reconnectRequired: false,
    };
    const automation = {
      id: "automation-1",
      userId: "user-1",
      active: true,
      followGateRequired: false,
      typingIndicator: false,
      deliveryDelaySeconds: 0,
      listener: {
        prompt: "Saved fallback reply",
        responseFormat: "TEXT",
        quickReplies: [],
        ctaButtonTitle: null,
        ctaLink: null,
        mediaUrl: null,
        mediaType: null,
        aiDmReplyEnabled: true,
      },
      User: { integrations: [integration] },
    };
    mockFindIntegrationForWebhookAccount.mockResolvedValue(integration);
    mockFindAutomationForDM.mockResolvedValue({
      automation,
      matchedKeyword: "any message",
    });
    mockResolveIntegrationSendToken.mockReturnValue({
      ok: true,
      token: "token-1",
    });
    mockReserveAiReplyQuota.mockRejectedValue(
      new Error("quota database unavailable"),
    );

    const body = JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              sender: { id: "recipient-1" },
              recipient: { id: "ig-business-1" },
              timestamp: Date.now(),
              message: { mid: "mid.inbound", text: "What do you sell?" },
            },
          ],
        },
      ],
    });
    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=good" },
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "recipient-1",
        automationId: "automation-1",
        message: "Saved fallback reply",
      }),
    );
    expect(mockUpdateWebhookEvent).toHaveBeenCalledWith(
      "webhook-event-1",
      expect.objectContaining({
        status: "PROCESSED",
      }),
    );
  });

  it("sends an approved AI-selected URL as a native Instagram button", async () => {
    mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
    const integration = {
      userId: "user-1",
      token: "token-1",
      instagramId: "ig-business-1",
      pageId: "ig-business-1",
      instagramUsername: "useap3k",
      status: "CONNECTED",
      reconnectRequired: false,
    };
    const automation = {
      id: "automation-1",
      userId: "user-1",
      active: true,
      followGateRequired: false,
      typingIndicator: false,
      deliveryDelaySeconds: 0,
      listener: {
        prompt: "Saved fallback reply",
        responseFormat: "TEXT",
        quickReplies: [],
        ctaButtonTitle: null,
        ctaLink: null,
        mediaUrl: null,
        mediaType: null,
        aiDmReplyEnabled: true,
      },
      User: { integrations: [integration] },
    };
    mockFindIntegrationForWebhookAccount.mockResolvedValue(integration);
    mockFindAutomationForDM.mockResolvedValue({
      automation,
      matchedKeyword: "any message",
    });
    mockResolveIntegrationSendToken.mockReturnValue({
      ok: true,
      token: "token-1",
    });
    mockReserveAiReplyQuota.mockResolvedValue({
      ok: true,
      reservationId: "reservation-1",
    });
    mockGetAiWorkspaceRuntimeConfig.mockResolvedValue({
      aiRepliesEnabled: false,
      knowledge: [],
    });
    mockGenerateAiDmReply.mockResolvedValue({
      ok: true,
      reply: "Create your free AP3K account here.",
      linkButton: { label: "GET STARTED", url: "https://ap3k.com/sign-up" },
    });

    const body = JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              sender: { id: "recipient-1" },
              recipient: { id: "ig-business-1" },
              timestamp: Date.now(),
              message: { mid: "mid.ai-link", text: "How do I start?" },
            },
          ],
        },
      ],
    });
    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=good" },
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "recipient-1",
        message: "Create your free AP3K account here.",
        responseFormat: "LINK",
        linkButtons: [
          { label: "GET STARTED", url: "https://ap3k.com/sign-up" },
        ],
      }),
    );
    expect(mockCreateAutomationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ responseFormat: "AI_LINK" }),
      }),
    );
  });

  it("rechecks a follow-button postback instead of treating the gate prompt as a duplicate", async () => {
    mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
    const integration = {
      userId: "user-1",
      token: "token-1",
      instagramId: "ig-business-1",
      pageId: "ig-business-1",
      instagramUsername: "ap3k",
      status: "CONNECTED",
      reconnectRequired: false,
    };
    const automation = {
      id: "automation-1",
      userId: "user-1",
      active: true,
      followGateRequired: true,
      typingIndicator: false,
      deliveryDelaySeconds: 0,
      listener: {
        prompt: "Here is your protected payload",
        responseFormat: "TEXT",
        quickReplies: [],
        ctaButtonTitle: null,
        ctaLink: null,
        mediaUrl: null,
        mediaType: null,
      },
      User: { integrations: [integration] },
    };
    mockFindIntegrationForWebhookAccount.mockResolvedValue(integration);
    mockFindAutomationById.mockResolvedValue(automation);
    mockGetInstagramRecipientProfile.mockResolvedValue({
      username: "prospect",
      name: "Prospect",
      profilePictureUrl: undefined,
      followsBusiness: false,
    });
    mockResolveIntegrationSendToken.mockReturnValue({
      ok: true,
      token: "token-1",
    });

    const body = JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              sender: { id: "recipient-1" },
              recipient: { id: "ig-business-1" },
              timestamp: Date.now(),
              postback: {
                title: "I followed ✅",
                payload: "AP3K_FOLLOW_CHECK:automation-1",
              },
            },
          ],
        },
      ],
    });
    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=good" },
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockIsDuplicate).not.toHaveBeenCalled();
    expect(mockHasDeliveredFinalPayload).toHaveBeenCalledWith(
      "automation-1",
      "recipient-1",
    );
    expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "recipient-1",
        automationId: "automation-1",
        preferQuickReplyForPostback: false,
        followGatePrompt: {
          username: "ap3k",
          state: "NOT_FOLLOWING",
          message: undefined,
          verificationButtonTitle: "Following",
          verificationPayload: "AP3K_FOLLOW_CHECK:automation-1",
        },
        postbackButton: undefined,
      }),
    );
    expect(mockCreateMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SENT",
        errorMessage: "follow_request_dm_sent",
      }),
    );
  });

  it("releases the protected payload after Instagram verifies the follow", async () => {
    mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
    const integration = {
      userId: "user-1",
      token: "token-1",
      instagramId: "ig-business-1",
      pageId: "ig-business-1",
      instagramUsername: "ap3k",
      status: "CONNECTED",
      reconnectRequired: false,
    };
    mockFindIntegrationForWebhookAccount.mockResolvedValue(integration);
    mockFindAutomationById.mockResolvedValue({
      id: "automation-1",
      userId: "user-1",
      active: true,
      followGateRequired: true,
      typingIndicator: false,
      deliveryDelaySeconds: 0,
      listener: {
        prompt: "Here is your protected payload",
        responseFormat: "TEXT",
        quickReplies: [],
        ctaButtonTitle: null,
        ctaLink: null,
        mediaUrl: null,
        mediaType: null,
      },
      User: { integrations: [integration] },
    });
    mockGetInstagramRecipientProfile.mockResolvedValue({
      username: "prospect",
      name: "Prospect",
      profilePictureUrl: undefined,
      followsBusiness: true,
    });
    mockResolveIntegrationSendToken.mockReturnValue({
      ok: true,
      token: "token-1",
    });

    const body = JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              sender: { id: "recipient-1" },
              recipient: { id: "ig-business-1" },
              timestamp: Date.now(),
              postback: {
                title: "I followed ✅",
                payload: "AP3K_FOLLOW_CHECK:automation-1",
              },
            },
          ],
        },
      ],
    });
    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=good" },
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockHasDeliveredFinalPayload).toHaveBeenCalledWith(
      "automation-1",
      "recipient-1",
    );
    expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "recipient-1",
        automationId: "automation-1",
        message: "Here is your protected payload",
        postbackButton: undefined,
      }),
    );
    expect(mockCreateMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SENT",
        errorMessage: "final_dm_payload_sent",
      }),
    );
  });

  it("does not release the protected payload twice", async () => {
    mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
    mockHasDeliveredFinalPayload.mockResolvedValue(true);
    const integration = {
      userId: "user-1",
      token: "token-1",
      instagramId: "ig-business-1",
      pageId: "ig-business-1",
      instagramUsername: "ap3k",
      status: "CONNECTED",
      reconnectRequired: false,
    };
    mockFindIntegrationForWebhookAccount.mockResolvedValue(integration);
    mockFindAutomationById.mockResolvedValue({
      id: "automation-1",
      userId: "user-1",
      active: true,
      followGateRequired: true,
      listener: { prompt: "Here is your protected payload" },
      User: { integrations: [integration] },
    });

    const body = JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              sender: { id: "recipient-1" },
              recipient: { id: "ig-business-1" },
              timestamp: Date.now(),
              postback: {
                title: "I followed ✅",
                payload: "AP3K_FOLLOW_CHECK:automation-1",
              },
            },
          ],
        },
      ],
    });
    const response = await POST(
      new NextRequest("https://ap3k.test/api/webhooks/meta", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=good" },
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockSendInstagramDirectResponse).not.toHaveBeenCalled();
    expect(mockUpdateWebhookEvent).toHaveBeenCalledWith(
      "webhook-event-1",
      expect.objectContaining({
        status: "PROCESSED",
        errorMessage: "duplicate_skipped",
      }),
    );
  });
  it.each(["request", "waiting", "email", "reminder"])(
    "handles the %s engagement stage without leaking the product link",
    async (stage) => {
      mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
      const integration = {
        id: "i1",
        userId: "user-1",
        token: "test",
        instagramId: "ig-business-1",
        status: "CONNECTED",
        reconnectRequired: false,
        planLocked: false,
      };
      const automation = {
        id: "automation-1",
        integrationId: "i1",
        userId: "user-1",
        source: "COMMENT",
        active: true,
        followGateRequired: false,
        listener: {
          prompt: "Your product",
          responseFormat: "PRODUCT_CARD",
          ctaLink: "https://example.com/product",
          ctaButtonTitle: "Shop",
          mediaUrl: "https://ap3k.com/image.jpg",
          emailCaptureEnabled: stage !== "reminder",
          emailCapturePrompt: "Reply with your email",
          followUpEnabled: stage === "reminder",
          followUpDelayMinutes: 30,
        },
        User: { integrations: [integration], subscription: { plan: "PRO" } },
      };
      mockFindIntegrationForWebhookAccount.mockResolvedValue(integration);
      mockFindAutomationById.mockResolvedValue(automation);
      mockResolveIntegrationSendToken.mockReturnValue({
        ok: true,
        token: "test",
      });
      mockBeginEmailRequest.mockResolvedValue(
        stage === "email"
          ? { kind: "complete" }
          : stage === "waiting"
            ? { kind: "waiting" }
            : { kind: "request", jobId: "email-job" },
      );
      if (stage === "email")
        mockTakeEmailReply.mockResolvedValue({
          kind: "continue",
          automationId: "automation-1",
          flowId: "comment-1",
          jobId: "email-job",
        });
      const response = await POST(
        new NextRequest("https://ap3k.test/api/webhooks/meta", {
          method: "POST",
          headers: { "x-hub-signature-256": "sha256=good" },
          body: JSON.stringify({
            object: "instagram",
            entry: [
              {
                id: "ig-business-1",
                messaging: [
                  {
                    sender: { id: "recipient-1" },
                    recipient: { id: "ig-business-1" },
                    timestamp: Date.now(),
                    ...(stage === "email"
                      ? {
                          message: {
                            mid: "email-reply",
                            text: "person@example.com",
                          },
                        }
                      : {
                          postback: {
                            payload:
                              "AP3K_OPENING_CONTINUE:automation-1:comment-1",
                            title: "Continue",
                          },
                        }),
                  },
                ],
              },
            ],
          }),
        }),
      );
      expect(response.status).toBe(200);
      if (stage === "waiting") {
        expect(mockSendInstagramDirectResponse).not.toHaveBeenCalled();
        return;
      }
      if (stage === "request") {
        expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            responseFormat: "TEXT",
            ctaUrl: undefined,
            mediaUrl: undefined,
            linkButtons: [],
            message: "Reply with your email",
          }),
        );
        expect(mockFinishEngagementJob).toHaveBeenCalledWith(
          "email-job",
          "WAITING",
        );
        expect(mockScheduleFollowUp).not.toHaveBeenCalled();
      } else {
        expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(
          expect.objectContaining({
            responseFormat: "PRODUCT_CARD",
            ctaUrl: "https://example.com/product",
          }),
        );
        if (stage === "email")
          expect(mockFinishEngagementJob).toHaveBeenCalledWith(
            "email-job",
            "COMPLETED",
          );
        else
          expect(mockScheduleFollowUp).toHaveBeenCalledWith(
            "automation-1",
            "recipient-1",
            "comment-1",
            expect.any(Date),
            30,
            expect.objectContaining({ messageId: "mid.outbound" }),
          );
      }
    },
  );
  describe("new Story editor delivery contracts",()=>{
    function setupStory(extra:any={}) {
      mockVerifyMetaSignature.mockReturnValue(signatureResult(true));
      const integration={id:"integration-1",userId:"user-1",instagramId:"ig-business-1",webhookAccountId:"ig-business-1",instagramUsername:"brand",token:"test-token",status:"CONNECTED",reconnectRequired:false,planLocked:false};
      const automation={id:"story-automation",userId:"user-1",integrationId:integration.id,source:"STORY",active:true,storyConfig:{version:1,scope:"ALL",stories:[],cards:[],intentPrompt:""},oneDmPerUser:false,deliveryDelaySeconds:0,followGateRequired:false,listener:{prompt:"Your guide",responseFormat:"TEXT",quickReplies:[],openingDmEnabled:false},User:{integrations:[integration],subscription:{plan:"PRO"}},...extra};
      mockFindIntegrationForWebhookAccount.mockResolvedValue(integration);
      mockFindAutomationForStory.mockResolvedValue(automation);
      mockResolveIntegrationSendToken.mockReturnValue({ok:true,token:"test-token"});
      vi.mocked(claimImmediateStory).mockResolvedValue(true);
      return automation;
    }
    async function reply(options:any={}) {
      const body=JSON.stringify({object:"instagram",entry:[{id:"ig-business-1",messaging:[{sender:{id:"recipient-1"},recipient:{id:"ig-business-1"},timestamp:options.at??Date.now(),message:{mid:"story-mid",text:options.text??"guide",reply_to:{story:{id:"selected-story",url:"https://cdn.test/story.jpg"}},...options.message}}]}]});
      return POST(new NextRequest("https://ap3k.test/api/webhooks/meta",{method:"POST",headers:{"x-hub-signature-256":"sha256=good"},body}));
    }
    it("forwards the selected story ID and original timestamp to matching",async()=>{setupStory();const at=Date.now();await reply({at});expect(mockFindAutomationForStory).toHaveBeenCalledWith("REPLY","ig-business-1","guide","selected-story",at);expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(expect.objectContaining({message:"Your guide",recipientId:"recipient-1"}));});
    it("does not leak nonmatching story replies into a generic DM catch-all",async()=>{setupStory();mockFindAutomationForStory.mockResolvedValue(null);await reply();expect(mockFindAutomationForDM).not.toHaveBeenCalled();expect(mockSendInstagramDirectResponse).not.toHaveBeenCalled();});
    it("schedules a real delay instead of sending immediately",async()=>{setupStory({deliveryDelaySeconds:300});await reply();expect(deferAutomationDelivery).toHaveBeenCalledWith(expect.objectContaining({automationId:"story-automation",eventKey:"story:story-mid",seconds:300,recipientIgId:"recipient-1"}));expect(mockSendInstagramDirectResponse).not.toHaveBeenCalled();});
    it("blocks a repeated webhook even when one-DM-per-user is off",async()=>{setupStory();vi.mocked(claimImmediateStory).mockResolvedValue(false);await reply();expect(mockSendInstagramDirectResponse).not.toHaveBeenCalled();});
    it("sends the opener with a real continue callback before the final message",async()=>{setupStory({listener:{prompt:"Your guide",responseFormat:"TEXT",quickReplies:[],openingDmEnabled:true,openingDmText:"Ready?",openingDmButtonText:"Continue"}});await reply();expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(expect.objectContaining({message:"Ready?",responseFormat:"TEXT",postbackButton:{title:"Continue",payload:"AP3K_OPENING_CONTINUE:story-automation:story-mid"}}));expect(mockScheduleFollowUp).not.toHaveBeenCalled();});
    it.each(["OPENING","MESSAGE","EMAIL","PHONE","FOLLOW"])("delays and resumes only the configured %s step",async(step)=>{
      const listener={prompt:"Your guide",responseFormat:"TEXT",quickReplies:[],openingDmEnabled:step==="OPENING",openingDmText:"Ready?",openingDmButtonText:"Continue",emailCaptureEnabled:step==="EMAIL",emailCapturePrompt:"Email?",phoneCaptureEnabled:step==="PHONE",phoneCapturePrompt:"Phone?"};
      const automation=setupStory({stepDelays:{[step]:30,PUBLIC_REPLY:300},listener,followGateRequired:step==="FOLLOW"});
      mockBeginEmailRequest.mockResolvedValue({kind:"request",jobId:"capture"});
      await reply();expect(mockSendInstagramDirectResponse).not.toHaveBeenCalled();
      const scheduled=vi.mocked(deferAutomationDelivery).mock.calls.at(-1)?.[0];
      expect(scheduled).toMatchObject({seconds:30,entry:{ap3kConfiguredMessage:{delayedStep:step}}});
      mockFindAutomationById.mockResolvedValue(automation);
      await resumeAutomationDelivery(automation.id,scheduled!.entry,"instagram");
      expect(mockSendInstagramDirectResponse).toHaveBeenCalledOnce();
      expect(deferAutomationDelivery).toHaveBeenCalledOnce();
      if(step==="EMAIL"||step==="PHONE")expect(mockBeginEmailRequest).toHaveBeenCalledOnce();
    });
    it("sends the opener quick reply with the same continuation payload",async()=>{
      setupStory({listener:{prompt:"Your guide",responseFormat:"TEXT",quickReplies:[],openingDmEnabled:true,openingDmFormat:"QUICK_REPLY",openingDmText:"Ready?",openingDmButtonText:"Continue"}});
      await reply();expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(expect.objectContaining({preferQuickReplyForPostback:true,postbackButton:{title:"Continue",payload:"AP3K_OPENING_CONTINUE:story-automation:story-mid"}}));
    });
    it("does not send beyond the original 24-hour conversation window",async()=>{setupStory();await reply({at:Date.now()-86400001});expect(mockSendInstagramDirectResponse).not.toHaveBeenCalled();});
    it("passes native carousel cards to delivery, not just a text preview",async()=>{const cards=[{title:"Offer",subtitle:"Today",image:"https://cdn.test/card.jpg",links:[{label:"Shop",url:"https://shop.test/"}]}];setupStory({storyConfig:{version:1,scope:"ALL",cards,stories:[],intentPrompt:""},listener:{prompt:"Offer",responseFormat:"CAROUSEL",quickReplies:[]}});await reply();expect(mockSendInstagramDirectResponse).toHaveBeenCalledWith(expect.objectContaining({responseFormat:"CAROUSEL",carouselCards:cards}));});
  });

});
