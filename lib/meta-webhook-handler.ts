import { stepDelay, normalizeStepDelays, type AutomationStep } from "@/lib/automation-step-delays";
import { readStoryConfig } from "@/lib/story-automation";
import { deliveryCandidates, eligibleCommentTimestamp } from "@/lib/automation-backtrack";
import { claimDmRecipient, claimImmediateComment, claimImmediateStory } from "@/lib/automation-delivery";
import { deferAutomationDelivery } from "@/lib/automation-delivery";
import { handleConversationStarter } from "@/lib/conversation-starters-runtime";
import {
  flowTriggerForEvent,
  isCurrentFlowOpening,
} from "@/actions/webhook/queries";
import {
  isSharedPostAttachment,
  readFlowTriggers,
} from "@/lib/automation-flow/triggers";
import { readFlow } from "@/lib/automation-flow/definition";
import {
  recordAutomationHit,
  observeAutomationFollow,
} from "@/lib/automation-tracking";
import {
  readCommentReplies,
  selectMessageVariation,
  personalizeUsername,
} from "@/lib/automation-copy";
import {
  reservePublicReplySlot,
  finishPublicReplySlot,
} from "@/lib/public-reply-limit";
import { processAutomationFlow } from "@/lib/automation-flow/runtime";
import { readAiConversation } from "@/lib/ai-conversation";
import {
  prepareAiConversationTurn,
  finishAiConversationTurn,
} from "@/lib/ai-conversation-runtime";
import {
  recordEngagementReceipt,
  beginEmailRequest,
  cancelPendingFollowUps,
  finishEngagementJob,
  scheduleFollowUp,
  takeEmailReply,
} from "@/lib/automation-engagement";
import {
  emailRequestMessage,
  messagingWindowOpen,
  parseEmailReply,
} from "@/lib/automation-engagement-settings";
import type { Integrations } from "@prisma/client";
import { client } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createHash } from "crypto";
import {
  findAutomationForCommentWithReason,
  findAutomationForDM,
  findAutomationForStory,
  findAutomationById,
  findPendingCommentDmActionForText,
  findIntegrationForWebhookAccount,
  isDuplicate,
  hasDeliveredFinalPayload,
  hasProcessedCommentWebhook,
  hasAp3kGeneratedCommentId,
  countRecentPublicReplies,
  countRecentSelfCommentSkips,
  pauseAutomationForLoopGuard,
  createMessageLog,
  upsertLead,
  createAutomationEvent,
  createWebhookEvent,
  updateWebhookEvent,
  mergeWebhookEventPayload,
  trackResponse,
  upsertInboundInboxMessage,
  recordOutboundInboxMessage,
} from "@/actions/webhook/queries";
import { isAppReviewMode } from "@/lib/app-review-mode";
import { verifyMetaSignature } from "@/lib/webhook-signature";
import { normalizeMatchText, resolveCommentTriggerMatch } from "@/lib/matching";
import {
  formatSafeMetaError,
  getSafeMetaError,
  sendCommentReply,
  sendMediaComment,
  deleteInstagramComment,
} from "@/lib/fetch";
import {
  sendInstagramCommentPrivateReply,
  sendInstagramDirectResponse,
  getInstagramRecipientProfile,
  formatPrivateReplyError,
} from "@/lib/instagram-dm";
import {
  followRequestActionPayload,
  openingDmActionPayload,
  parseCommentDmActionPayload,
  resolveFollowRequestButtonText,
  resolveFollowRequestDmText,
  resolveOpeningDmButtonText,
  resolveOpeningDmText,
  type CommentDmAction,
} from "@/lib/comment-dm-flow";
import { resolveTemplate } from "@/lib/template";
import {
  resolveIntegrationSendToken,
  tokenResolutionDiagnostics,
} from "@/lib/send-token";
import {
  canSendStaticReply,
  completeAiReplyReservation,
  releaseAiReplyReservation,
  reserveAiReplyQuota,
} from "@/actions/usage/queries";
import {
  generateAiCommentDecision,
  generateAiDmReply,
  getAiWorkspaceRuntimeConfig,
} from "@/lib/ai-reply";
import {
  parseMessagingItem,
  classifyStoryInteraction,
  INBOUND_MESSAGE_NO_AUTOMATION,
  INBOUND_MESSAGE_ECHO_SKIPPED,
  INBOUND_SYSTEM_EVENT_SKIPPED,
} from "@/lib/instagram-message-event";
import { readLegacyQuickReplies, readLinkButtons } from "@/lib/link-buttons";
import { ensureInstagramButtonCallbacks } from "@/lib/instagram-postback-subscription";
import {
  cleanupWebhookRateLimitBuckets,
  consumeWebhookAccountRateLimit,
} from "@/lib/webhook-rate-limit";

export const maxDuration = 60;

const WEBHOOK_ROUTE_VERSION = "2026-05-tenant-diagnostics-v2";

const WEBHOOK_RATE_LIMIT_WINDOW_MS = 60_000;
const WEBHOOK_RATE_LIMIT_MAX = 120;
const WEBHOOK_RATE_LIMIT_MAX_BUCKETS = 5_000;
const WEBHOOK_MAX_BODY_BYTES = 1024 * 1024;
const SEND_RETRY_ATTEMPTS = 2;
const LOOP_GUARD_MEDIA_WINDOW_MS = 10 * 60 * 1000;
const LOOP_GUARD_AUTOMATION_WINDOW_MS = 60 * 60 * 1000;
const MAX_PUBLIC_REPLIES_PER_AUTOMATION_MEDIA_10M = 5;
const MAX_PUBLIC_REPLIES_PER_AUTOMATION_HOUR = 50;
// ANY_COMMENT campaigns only: pause if self-comment skip rate exceeds this within 10 min.
const SELF_COMMENT_PAUSE_THRESHOLD = 3;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
let nextRateLimitCleanupAt = 0;
const PUBLIC_REPLY_SENT_REASON = "PUBLIC_REPLY_SENT";
const PUBLIC_REPLY_SKIPPED_SELF_COMMENT = "PUBLIC_REPLY_SKIPPED_SELF_COMMENT";
const PUBLIC_REPLY_SKIPPED_DUPLICATE_COMMENT =
  "PUBLIC_REPLY_SKIPPED_DUPLICATE_COMMENT";
const PUBLIC_REPLY_SKIPPED_AP3K_GENERATED_REPLY =
  "PUBLIC_REPLY_SKIPPED_AP3K_GENERATED_REPLY";
const PUBLIC_REPLY_SKIPPED_KEYWORD_MISMATCH =
  "PUBLIC_REPLY_SKIPPED_KEYWORD_MISMATCH";
const PUBLIC_REPLY_SKIPPED_MEDIA_MISMATCH =
  "PUBLIC_REPLY_SKIPPED_MEDIA_MISMATCH";
const PUBLIC_REPLY_FAILED_META_API = "PUBLIC_REPLY_FAILED_META_API";
const PUBLIC_REPLY_FAILED_RATE_LIMIT = "PUBLIC_REPLY_FAILED_RATE_LIMIT";
const PUBLIC_REPLY_FAILED_UNKNOWN = "PUBLIC_REPLY_FAILED_UNKNOWN";

// ---------------------------------------------------------------------------
// GET — Meta webhook verification challenge
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const rateKey = getRateLimitKey(req);
  if (isRateLimited(`GET:${rateKey}`)) {
    console.warn("[webhook] GET verification rate limited", { rateKey });
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  const tokenMatch = token === process.env.META_VERIFY_TOKEN;
  console.log("[webhook] GET verify", {
    mode,
    token_match: tokenMatch,
    challenge_exists: Boolean(challenge),
    has_env_token: Boolean(process.env.META_VERIFY_TOKEN),
  });

  if (mode === "subscribe" && tokenMatch && challenge) {
    try {
      await createWebhookEvent({
        eventType: "WEBHOOK_VERIFY_GET",
        eventSource: "META_REAL",
        status: "PROCESSED",
        payload: {
          mode,
          tokenMatch,
          challengeExists: true,
        },
      });
    } catch {
      // Non-critical — never let DB logging break verification
    }
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json(
    { error: "webhook_verification_failed" },
    { status: 403 },
  );
}

// ---------------------------------------------------------------------------
// POST — Process Instagram comment and DM events
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // PHASE 1 — absolute first-line logging
  console.log("AP3K_WEBHOOK_POST_ENTERED", {
    timestamp: new Date().toISOString(),
    method: req.method,
    contentType: req.headers.get("content-type"),
    userAgent: req.headers.get("user-agent"),
    hasSignature: req.headers.has("x-hub-signature-256"),
    routeVersion: WEBHOOK_ROUTE_VERSION,
  });

  try {
    const bodyRead = await readBodyWithLimit(req, WEBHOOK_MAX_BODY_BYTES);
    if (!bodyRead.ok) {
      console.warn("[webhook] request body rejected", {
        reason: bodyRead.reason,
        bytesRead: bodyRead.bytesRead,
        maxBytes: WEBHOOK_MAX_BODY_BYTES,
      });
      return NextResponse.json(
        { received: false, error: bodyRead.reason },
        { status: 413 },
      );
    }

    const rawBody = bodyRead.rawBody;
    const signature = req.headers.get("x-hub-signature-256");

    const signatureResult = verifyMetaSignature(rawBody, signature);
    const requestMeta = getRequestMetadata(
      req,
      signature,
      signatureResult.verified,
    );

    if (!signatureResult.verified) {
      console.warn("[webhook] signature verification failed", {
        routeVersion: WEBHOOK_ROUTE_VERSION,
        reason: signatureResult.reason,
        hasSignature: Boolean(signature),
        triedSecretCount: signatureResult.triedSecretCount,
        rawBodyLength: rawBody.length,
        rawBodySha256Short: signatureResult.rawBodySha256Short,
      });
      return ok();
    }

    const parsedBody = parseJsonSafely(rawBody);
    console.log("[webhook] POST received", {
      ...requestMeta,
      routeVersion: WEBHOOK_ROUTE_VERSION,
      signatureReason: signatureResult.reason,
      payloadObject: parsedBody.ok ? parsedBody.body?.object : undefined,
    });

    if (!parsedBody.ok) {
      await createWebhookEvent({
        eventType: "PAYLOAD_INVALID",
        eventSource: "META_REAL",
        status: "FAILED",
        errorMessage: "invalid_json_payload",
        payload: {
          routeVersion: WEBHOOK_ROUTE_VERSION,
          ...safeWebhookMetadata(
            undefined,
            true,
            undefined,
            undefined,
            requestMeta,
          ),
          parseError: parsedBody.error,
        },
      });
      return ok();
    }

    const body = parsedBody.body;
    const isDryRun =
      body.dryRun === true || body.source === "INTERNAL_SELF_TEST";

    try {
      const firstEntry = Array.isArray(body?.entry) ? body.entry[0] : undefined;
      await createWebhookEvent({
        eventType: isDryRun
          ? "INTERNAL_SELF_TEST"
          : "WEBHOOK_POST_RECEIVED_RAW",
        eventSource: isDryRun ? "SIMULATED_INTERNAL" : "META_REAL",
        status: isDryRun ? "PROCESSED" : "RECEIVED",
        igAccountId: firstEntry?.id,
        payload: {
          routeVersion: WEBHOOK_ROUTE_VERSION,
          signatureVerified: true,
          dryRun: isDryRun,
          rawBodyLength: rawBody.length,
          rawBodyBytes: bodyRead.bytesRead,
          object: body?.object,
          entryId: firstEntry?.id,
          entryCount: Array.isArray(body?.entry) ? body.entry.length : 0,
          changesCount: Array.isArray(firstEntry?.changes)
            ? firstEntry.changes.length
            : 0,
        },
      });
    } catch {
      // Non-critical diagnostics
    }

    // Self-test payloads that are not smoke tests just return early
    if (body.source === "INTERNAL_SELF_TEST" && !body.smokeTest) {
      return ok();
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];
    if (entries.length === 0) {
      await createWebhookEvent({
        eventType: classifyWebhookEnvelope(body),
        eventSource: "META_REAL",
        status: "IGNORED",
        field: "none",
        payload: {
          routeVersion: WEBHOOK_ROUTE_VERSION,
          ...safeWebhookMetadata(
            body,
            signatureResult.verified,
            undefined,
            undefined,
            requestMeta,
          ),
        },
      });
      return ok();
    }

    if (!isDryRun) {
      try {
        const rateLimit = await consumeWebhookAccountRateLimit(
          entries.map((entry: any) => String(entry?.id ?? "")),
        );
        if (!rateLimit.allowed) {
          console.warn("[webhook] account rate limited", {
            accountCount: entries.length,
            highestCount: rateLimit.highestCount,
            limit: rateLimit.limit,
          });
          await createWebhookEvent({
            eventType: "WEBHOOK_ACCOUNT_RATE_LIMITED",
            eventSource: "META_REAL",
            status: "IGNORED",
            igAccountId: entries[0]?.id,
            payload: {
              routeVersion: WEBHOOK_ROUTE_VERSION,
              highestCount: rateLimit.highestCount,
              limit: rateLimit.limit,
            },
          }).catch(() => undefined);
          return ok();
        }
      } catch (error) {
        // Fail open when the limiter store is unavailable. Delivery and usage
        // enforcement remain safer than silently dropping a legitimate event.
        console.error("AP3K_WEBHOOK_RATE_LIMIT_ERROR", {
          message: error instanceof Error ? error.message : String(error),
          routeVersion: WEBHOOK_ROUTE_VERSION,
        });
      }
    }

    // Meta expects a fast acknowledgement. Keep all delivery work alive after
    // the response so configured 3–30 second delays never invite webhook
    // retries or duplicate replies.
    const backgroundProcessing = Promise.all([
      ...entries.map((entry: any) =>
        processEntry(entry, body, signatureResult.verified, requestMeta),
      ),
      cleanupWebhookRateLimitBuckets().catch(() => 0),
    ]).catch(async (error) => {
      console.error("AP3K_WEBHOOK_BACKGROUND_ERROR", {
        message: error instanceof Error ? error.message : String(error),
        routeVersion: WEBHOOK_ROUTE_VERSION,
      });
      await createWebhookEvent({
        eventType: "WEBHOOK_BACKGROUND_ERROR",
        eventSource: "META_REAL",
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
        payload: { routeVersion: WEBHOOK_ROUTE_VERSION },
      }).catch(() => undefined);
    });

    if (process.env.VERCEL === "1") {
      waitUntil(backgroundProcessing);
    } else {
      await backgroundProcessing;
    }

    return ok();
  } catch (error) {
    // PHASE 3 — Add route error capture
    console.error("AP3K_WEBHOOK_ROUTE_ERROR", {
      message: error instanceof Error ? error.message : String(error),
      routeVersion: WEBHOOK_ROUTE_VERSION,
    });
    try {
      await createWebhookEvent({
        eventType: "WEBHOOK_ROUTE_ERROR",
        eventSource: "META_REAL",
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error),
        payload: {
          routeVersion: WEBHOOK_ROUTE_VERSION,
          stack:
            error instanceof Error ? error.stack?.split("\n")[0] : undefined,
        },
      });
    } catch {
      // Non-critical
    }
    // Never return 5xx to Meta — always acknowledge receipt
    return ok();
  }
}

async function processEntry(
  entry: any,
  envelope: any,
  signatureValid: boolean,
  requestMeta: ReturnType<typeof getRequestMetadata>,
  resumedAutomationId?: string,
) {
  const pageId: string = entry.id;
  const changes = Array.isArray(entry.changes) ? entry.changes : [];
  const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];

  const field =
    changes[0]?.field ?? (messaging.length ? "messaging" : "unknown");
  console.log(`[webhook] POST field=${field} pageId=${pageId}`);

  if (changes.length === 0 && messaging.length === 0) {
    await createWebhookEvent({
      eventType: "PAYLOAD_INVALID",
      eventSource: "META_REAL",
      field,
      igAccountId: pageId,
      status: "IGNORED",
      errorMessage: "entry_without_changes_or_messaging",
      payload: safeWebhookMetadata(
        envelope,
        signatureValid,
        entry,
        undefined,
        requestMeta,
      ),
    });
    return;
  }

  for (const changeItem of changes) {
    // -----------------------------------------------------------------------
    // COMMENT EVENT
    // -----------------------------------------------------------------------
    if (changeItem.field === "comments") {
      const change = changeItem.value;
      // Instagram webhook shapes vary by object type and API version — use all known paths
      const mediaId: string | undefined =
        change.media?.id ??
        change.media_id ??
        change.media?.media_id ??
        undefined;
      const commentId: string | undefined =
        change.id ?? change.comment_id ?? change.comment?.id ?? undefined;
      const commenterId: string | undefined =
        change.from?.id ?? change.user?.id ?? change.sender?.id ?? undefined;
      const commenterUsername: string | undefined =
        change.from?.username ??
        change.username ??
        change.user?.username ??
        undefined;
      const commentText: string =
        change.text ?? change.comment_text ?? change.message ?? "";
      const valueIgAccountId: string | undefined =
        change.instagram_id ??
        change.ig_id ??
        change.account_id ??
        change.media?.owner?.id ??
        change.media?.owner_id ??
        undefined;

      await createWebhookEvent({
        eventType: "COMMENT_WEBHOOK_RECEIVED",
        eventSource: "META_REAL",
        field: changeItem.field,
        igAccountId: pageId,
        igUserId: commenterId,
        mediaId,
        commentId,
        status: "RECEIVED",
        payload: {
          entryId: entry?.id,
          igAccountId: pageId,
          valueIgAccountId,
          mediaId,
          commentId,
          commenterId,
          commenterUsername,
          hasCommentText: Boolean(commentText),
          object: envelope?.object,
          changesCount: changes.length,
        },
      });

      const webhookEvent = await createWebhookEvent({
        eventType: classifyCommentWebhook(envelope, entry, changeItem),
        eventSource: "META_REAL",
        field: changeItem.field,
        igAccountId: pageId,
        igUserId: commenterId,
        mediaId,
        commentId,
        payload: {
          ...safeWebhookMetadata(
            envelope,
            signatureValid,
            entry,
            changeItem,
            requestMeta,
          ),
          hasMediaId: Boolean(mediaId),
          hasCommentId: Boolean(commentId),
          hasCommenterId: Boolean(commenterId),
          hasCommentText: Boolean(commentText),
          commenterUsername,
          appearsSynthetic: isSyntheticWebhook(envelope, entry, changeItem),
        },
      });

      if (!mediaId || !commentId || !commenterId || !commentText) {
        const missing = [
          !mediaId && "media_id",
          !commentId && "comment_id",
          !commenterId && "commenter_id",
          !commentText && "comment_text",
        ]
          .filter(Boolean)
          .join(",");
        console.warn(
          "[webhook] Instagram comment parse failed — missing fields",
          {
            field: changeItem.field,
            missing,
            valueKeys: change ? Object.keys(change) : [],
          },
        );
        await updateWebhookEvent(webhookEvent.id, {
          eventType: "COMMENT_PARSE_FAILED",
          status: "IGNORED",
          errorMessage: `missing_required_comment_fields:${missing}`,
          processedAt: new Date(),
        });
        continue;
      }

      const commentDiagnostics = {
        object: envelope?.object,
        field: changeItem.field,
        entryId: entry?.id,
        mediaId,
        commentId,
        commenterId,
        rawCommentText: commentText,
        normalizedCommentText: normalizeMatchText(commentText),
        commenterUsername,
      };

      // 1. Find active automations for this post, then select by trigger.
      const match = await findAutomationForCommentWithReason(mediaId, pageId, {
        object: envelope?.object,
        igAccountId: valueIgAccountId,
        commentText,
      });
      const candidateAutomations = deliveryCandidates(match.automations?.length
        ? match.automations
        : match.automation
          ? [match.automation]
          : [], resumedAutomationId);
      const triggerDecisions = candidateAutomations.map((candidate) => {
        const flowTrigger = flowTriggerForEvent(candidate, {
          source: "COMMENT",
          text: commentText,
          mediaId,
        });
        const matchedKeyword =
          flowTrigger !== undefined
            ? flowTrigger
              ? flowTrigger.anyMessage
                ? "any comment"
                : flowTrigger.keyword
              : null
            : resolveCommentTriggerMatch({
                text: commentText,
                keywords: candidate.keywords,
                mode: candidate.matchingMode,
                triggerMode: candidate.triggerMode,
              });
        return { automation: candidate, matchedKeyword };
      });
      const selectedDecision = triggerDecisions.find((decision) =>
        Boolean(decision.matchedKeyword),
      );
      let automation =
        selectedDecision?.automation ?? candidateAutomations[0] ?? null;
      const delayedCommentStep = resumedAutomationId ? entry.ap3kDeliveryStep : undefined;
      if (automation && delayedCommentStep === "PUBLIC_REPLY") automation = {...automation, sendPrivateDm:false};
      if (automation?.listener && delayedCommentStep === "PRIVATE_DM") automation = {...automation, listener:{...automation.listener, aiReplyEnabled:false, commentReply:null, commentReply2:null, commentReply3:null, commentReplies:[]}};
      const matchedKeyword = selectedDecision?.matchedKeyword ?? null;
      const triggerDiagnostics = {
        ...commentDiagnostics,
        matchedIntegrationId:
          match.diagnostics && typeof match.diagnostics === "object"
            ? (match.diagnostics as any).matchedIntegrationId
            : undefined,
        matchedAutomationIds: candidateAutomations.map(
          (candidate) => candidate.id,
        ),
        triggerDecisions: triggerDecisions.map(
          ({ automation: candidate, matchedKeyword }) => ({
            automationId: candidate.id,
            automationName: candidate.name,
            automationActive: candidate.active,
            triggerMode: candidate.triggerMode,
            matchingMode: candidate.matchingMode,
            storedKeywords: candidate.keywords.map((keyword) => keyword.word),
            normalizedKeywords: candidate.keywords.map((keyword) =>
              normalizeMatchText(keyword.word),
            ),
            storedPostIds: candidate.posts?.map((post) => post.postid) ?? [],
            matchedKeyword,
            noMatchReason: matchedKeyword ? undefined : "no_keyword_match",
          }),
        ),
      };
      await mergeWebhookEventPayload(webhookEvent.id, {
        mediaMatching: match.diagnostics,
        triggerMatching: triggerDiagnostics,
      });
      if (!automation?.listener) {
        const failureReason =
          match.failureReason ?? "no_active_automation_for_media";
        const publicReplySkipReason =
          failureReason === "keyword_mismatch"
            ? PUBLIC_REPLY_SKIPPED_KEYWORD_MISMATCH
            : failureReason === "no_active_automation_for_media"
              ? PUBLIC_REPLY_SKIPPED_MEDIA_MISMATCH
              : failureReason;
        const wouldHaveMatchedCampaign = failureReason === "keyword_mismatch";
        const matchedIntegrationId =
          match.diagnostics && typeof match.diagnostics === "object"
            ? (match.diagnostics as any).matchedIntegrationId
            : undefined;
        const matchedOwnerUserId =
          match.diagnostics && typeof match.diagnostics === "object"
            ? (match.diagnostics as any).matchedIntegrationOwnerUserId
            : undefined;
        await createWebhookEvent({
          eventType:
            match.failureReason === "no_matching_integration"
              ? "INTEGRATION_MATCH_FAILED"
              : match.failureReason === "ambiguous"
                ? "AMBIGUOUS_INTEGRATION_MATCH"
                : "AUTOMATION_MATCH_FAILED",
          eventSource: "META_REAL",
          field: changeItem.field,
          igAccountId: pageId,
          igUserId: commenterId,
          mediaId,
          commentId,
          status: "IGNORED",
          errorMessage: publicReplySkipReason,
          payload: {
            entryId: entry?.id,
            igAccountId: pageId,
            mediaId,
            commentId,
            commenterId,
            commenterUsername,
            commentTextPresent: Boolean(commentText),
            commentText: commentText.slice(0, 180),
            integrationId: matchedIntegrationId,
            ownerUserId: matchedOwnerUserId,
            reason: publicReplySkipReason,
            matchFailureReason: failureReason,
            wouldHaveMatchedCampaign,
            whyNoPublicReply: publicReplySkipReason,
            diagnostics: match.diagnostics,
          },
        });
        console.log("[webhook] automation match failed", {
          mediaId,
          pageId,
          failureReason,
        });
        await updateWebhookEvent(webhookEvent.id, {
          status: "IGNORED",
          errorMessage: publicReplySkipReason,
          processedAt: new Date(),
        });
        continue;
      }

      const matchedIntegrationId =
        match.diagnostics && typeof match.diagnostics === "object"
          ? (match.diagnostics as any).matchedIntegrationId
          : undefined;
      const integrationRaw = selectIntegrationForWebhook(
        automation.User?.integrations,
        pageId,
        automation.integrationId ?? matchedIntegrationId,
      );
      const selfComment = getSelfCommentReason({
        commenterId,
        commenterUsername,
        igAccountId: pageId,
        integration: integrationRaw,
        diagnostics: match.diagnostics,
      });
      if (selfComment) {
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "IGNORED",
          errorMessage: PUBLIC_REPLY_SKIPPED_SELF_COMMENT,
          processedAt: new Date(),
        });
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "SELF_COMMENT_SKIPPED",
          igUserId: commenterId,
          mediaId,
          commentId,
          meta: {
            reason: PUBLIC_REPLY_SKIPPED_SELF_COMMENT,
            legacyReason: "self_comment_author",
            wouldHaveMatchedCampaign: Boolean(matchedKeyword),
            whyNoPublicReply: PUBLIC_REPLY_SKIPPED_SELF_COMMENT,
            matchedBy: selfComment,
            commenterId,
            commenterUsername,
            igAccountId: pageId,
            integrationId: integrationRaw?.id,
            integrationInstagramId: integrationRaw?.instagramId,
            integrationWebhookAccountId: integrationRaw?.webhookAccountId,
            integrationUsername: integrationRaw?.instagramUsername,
            commentId,
            mediaId,
          },
        });

        // Any Comment campaigns can loop if the account owner comments on their own post.
        // Pause only when self-comment skips accumulate past the threshold within 10 min.
        // Skip this in App Review Mode (self-comments are expected during reviewer testing).
        // Keyword campaigns are intentional; never pause them for self-comment activity.
        if (automation.triggerMode === "ANY_COMMENT" && !isAppReviewMode()) {
          const recentSelfCommentSkips = await countRecentSelfCommentSkips(
            automation.id,
            new Date(Date.now() - LOOP_GUARD_MEDIA_WINDOW_MS),
          );
          if (recentSelfCommentSkips >= SELF_COMMENT_PAUSE_THRESHOLD) {
            await pauseAutomationForLoopGuard(automation.id);
            await createAutomationEvent({
              automationId: automation.id,
              eventType: "LOOP_GUARD_PAUSED_CAMPAIGN",
              igUserId: commenterId,
              mediaId,
              commentId,
              meta: {
                reason: "repeated_self_comment_skips",
                message:
                  "Automation paused: repeated self-comment skips detected.",
                recentSelfCommentSkips,
              },
            });
          }
        }

        continue;
      }

      await updateWebhookEvent(webhookEvent.id, {
        automationId: automation.id,
        status: "PROCESSING",
      });

      if (await hasAp3kGeneratedCommentId(automation.id, commentId)) {
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "COMMENT_SKIPPED",
          igUserId: commenterId,
          mediaId,
          commentId,
          meta: {
            reason: PUBLIC_REPLY_SKIPPED_AP3K_GENERATED_REPLY,
            legacyReason: "ap3k_generated_comment",
            wouldHaveMatchedCampaign: Boolean(matchedKeyword),
            whyNoPublicReply: PUBLIC_REPLY_SKIPPED_AP3K_GENERATED_REPLY,
            commenterId,
            commenterUsername,
            igAccountId: pageId,
            integrationId: integrationRaw?.id,
            integrationInstagramId: integrationRaw?.instagramId,
            commentId,
            mediaId,
          },
        });
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "IGNORED",
          errorMessage: PUBLIC_REPLY_SKIPPED_AP3K_GENERATED_REPLY,
          processedAt: new Date(),
        });
        continue;
      }

      if (resumedAutomationId && resumedAutomationId !== automation.id) continue;
      if (!resumedAutomationId && !envelope.dryRun && envelope.source !== "INTERNAL_SELF_TEST" && normalizeStepDelays(automation.stepDelays)) {
        const publicDelay = stepDelay(automation,"PUBLIC_REPLY");
        let firstDmStep: AutomationStep = automation.listener?.openingDmEnabled !== false ? "OPENING" : "MESSAGE";
        if (firstDmStep === "MESSAGE" && (automation.listener?.emailCaptureEnabled || automation.listener?.phoneCaptureEnabled)) {
          const captured = await client.lead.findUnique({where:{automationId_igUserId:{automationId:automation.id,igUserId:commenterId}},select:{email:true,phone:true}});
          if (automation.listener.emailCaptureEnabled && !captured?.email) firstDmStep = "EMAIL";
          else if (automation.listener.phoneCaptureEnabled && !captured?.phone) firstDmStep = "PHONE";
        }
        const dmDelay = automation.sendPrivateDm === false ? 0 : stepDelay(automation,firstDmStep);
        if (publicDelay || dmDelay) {
          const base = {automationId:automation.id,recipientIgId:commenterId,object:envelope.object};
          await Promise.all([
            deferAutomationDelivery({...base,eventKey:`comment:${commentId}:public`,seconds:publicDelay || 1,entry:{id:entry.id,changes:[changeItem],ap3kDeliveryStep:"PUBLIC_REPLY"}}),
            ...(automation.sendPrivateDm !== false ? [deferAutomationDelivery({...base,eventKey:`comment:${commentId}:dm`,seconds:dmDelay || 1,entry:{id:entry.id,changes:[changeItem],ap3kDeliveryStep:"PRIVATE_DM"}})] : []),
          ]);
          await updateWebhookEvent(webhookEvent.id,{automationId:automation.id,status:"PROCESSING",errorMessage:"steps_scheduled"});
          continue;
        }
      }
      if (!resumedAutomationId && !envelope.dryRun && envelope.source !== "INTERNAL_SELF_TEST" && automation.deliveryDelaySeconds > 0) {
        await deferAutomationDelivery({automationId:automation.id,eventKey:`comment:${commentId}`,recipientIgId:commenterId,seconds:automation.deliveryDelaySeconds,entry:{id:entry.id,changes:[changeItem]},object:envelope.object});
        await updateWebhookEvent(webhookEvent.id,{automationId:automation.id,status:"PROCESSING",errorMessage:"delivery_scheduled"});
        continue;
      }
      if (!resumedAutomationId && !envelope.dryRun && envelope.source !== "INTERNAL_SELF_TEST" && !(await claimImmediateComment(automation.id, commentId))) {
        await updateWebhookEvent(webhookEvent.id,{automationId:automation.id,status:"PROCESSING",errorMessage:"comment_delivery_already_claimed"});
        continue;
      }
      if (
        !delayedCommentStep && await hasProcessedCommentWebhook(
          automation.id,
          commentId,
          webhookEvent.id,
        )
      ) {
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "DUPLICATE_SKIPPED",
          igUserId: commenterId,
          mediaId,
          commentId,
          keyword: matchedKeyword ?? undefined,
          meta: {
            reason: PUBLIC_REPLY_SKIPPED_DUPLICATE_COMMENT,
            legacyReason: "duplicate_comment_webhook",
            wouldHaveMatchedCampaign: Boolean(matchedKeyword),
            whyNoPublicReply: PUBLIC_REPLY_SKIPPED_DUPLICATE_COMMENT,
            commenterId,
            commenterUsername,
            igAccountId: pageId,
            commentId,
            mediaId,
          },
        });
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "IGNORED",
          errorMessage: PUBLIC_REPLY_SKIPPED_DUPLICATE_COMMENT,
          processedAt: new Date(),
        });
        continue;
      }

      await createAutomationEvent({
        automationId: automation.id,
        eventType: "WEBHOOK_RECEIVED",
        igUserId: commenterId,
        mediaId,
        commentId,
        meta: {
          ...commentDiagnostics,
          dryRun: envelope.dryRun,
          automationId: automation.id,
          automationName: automation.name,
          automationActive: automation.active,
          triggerMode: automation.triggerMode,
          matchingMode: automation.matchingMode,
          storedKeywords: automation.keywords.map((keyword) => keyword.word),
          normalizedKeywords: automation.keywords.map((keyword) =>
            normalizeMatchText(keyword.word),
          ),
          storedPostIds: automation.posts?.map((post) => post.postid) ?? [],
          commenterUsername,
          commentText,
        },
      });

      if (!matchedKeyword) {
        console.log(
          `[webhook] automation match: none (automationId=${automation.id} mode=${automation.matchingMode})`,
        );
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "NO_MATCH",
          igUserId: commenterId,
          mediaId,
          commentId,
          keyword: commentText.slice(0, 100),
          meta: {
            ...commentDiagnostics,
            dryRun: envelope.dryRun,
            automationId: automation.id,
            automationName: automation.name,
            automationActive: automation.active,
            triggerMode: automation.triggerMode,
            matchingMode: automation.matchingMode,
            storedKeywords: automation.keywords.map((keyword) => keyword.word),
            normalizedKeywords: automation.keywords.map((keyword) =>
              normalizeMatchText(keyword.word),
            ),
            storedPostIds: automation.posts?.map((post) => post.postid) ?? [],
            noMatchReason: "no_keyword_match",
            reason: PUBLIC_REPLY_SKIPPED_KEYWORD_MISMATCH,
            wouldHaveMatchedCampaign: false,
            whyNoPublicReply: PUBLIC_REPLY_SKIPPED_KEYWORD_MISMATCH,
            commenterUsername,
            commentText,
          },
        });
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "PROCESSED",
          errorMessage: PUBLIC_REPLY_SKIPPED_KEYWORD_MISMATCH,
          processedAt: new Date(),
        });
        continue;
      }

      console.log(
        `[webhook] automation match: ${automation.id} keyword="${matchedKeyword}"`,
      );

      await createAutomationEvent({
        automationId: automation.id,
        eventType: "KEYWORD_MATCHED",
        igUserId: commenterId,
        mediaId,
        commentId,
        keyword: matchedKeyword,
        meta: {
          ...commentDiagnostics,
          dryRun: envelope.dryRun,
          automationId: automation.id,
          automationName: automation.name,
          triggerMode: automation.triggerMode,
          matchingMode: automation.matchingMode,
          commenterUsername,
          commentText,
        },
      });

      // Count the public and private jobs as a single triggering comment.
      if (delayedCommentStep !== "PRIVATE_DM") await createAutomationEvent({
        automationId: automation.id,
        eventType: "COMMENT_RECEIVED",
        igUserId: commenterId,
        mediaId,
        commentId,
        keyword: matchedKeyword,
        meta: {
          commenterUsername,
          commentText,
          dryRun: envelope.dryRun,
        },
      });

      if (envelope.dryRun) {
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "PROCESSED",
          errorMessage: "dry_run_skipped_actions",
          processedAt: new Date(),
        });
        continue;
      }

      await recordAutomationHit({
        automationId: automation.id,
        eventKey: `comment:${commentId}`,
        recipientIgId: commenterId,
        source: "COMMENT",
      });
      if (delayedCommentStep !== "PRIVATE_DM") await trackResponse(automation.id, "COMMENT");

      // 4. Duplicate check — skip if we already DM'd this person for this automation
      if (delayedCommentStep !== "PUBLIC_REPLY" && await isDuplicate(automation.id, commenterId, mediaId, commentId)) {
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "DUPLICATE_SKIPPED",
          igUserId: commenterId,
          mediaId,
          commentId,
          keyword: matchedKeyword,
          meta: {
            reason: PUBLIC_REPLY_SKIPPED_DUPLICATE_COMMENT,
            legacyReason: "duplicate_comment_webhook",
            wouldHaveMatchedCampaign: true,
            whyNoPublicReply: PUBLIC_REPLY_SKIPPED_DUPLICATE_COMMENT,
          },
        });
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "PROCESSED",
          errorMessage: PUBLIC_REPLY_SKIPPED_DUPLICATE_COMMENT,
          processedAt: new Date(),
        });
        continue;
      }

      const listener = automation.listener;
      if (
        listener.flowDefinition &&
        !["PRO", "BUSINESS"].includes(
          automation.User?.subscription?.plan ?? "FREE",
        )
      ) {
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "IGNORED",
          errorMessage: "flow_plan_upgrade_required",
          processedAt: new Date(),
        });
        continue;
      }
      const replyVariants = readCommentReplies(listener);
      const aiReplyEnabled = listener.aiReplyEnabled === true;
      const publicReplyEnabled = aiReplyEnabled || replyVariants.length > 0;
      const privateDmEnabled = automation.sendPrivateDm !== false;

      if (!publicReplyEnabled) {
        await createMessageLog({
          automationId: automation.id,
          recipientIgId: commenterId,
          mediaId,
          commentId,
          messageType: "COMMENT_REPLY",
          status: "SKIPPED",
          errorMessage: "public_reply_disabled",
        });
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "COMMENT_SKIPPED",
          igUserId: commenterId,
          mediaId,
          commentId,
          keyword: matchedKeyword,
          meta: {
            reason: "public_reply_disabled",
            publicReplyEnabled: false,
            wouldHaveMatchedCampaign: true,
            whyNoPublicReply: "public_reply_disabled",
          },
        });
      }

      if (!publicReplyEnabled && !privateDmEnabled) {
        await createMessageLog({
          automationId: automation.id,
          recipientIgId: commenterId,
          mediaId,
          commentId,
          messageType: "DM",
          status: "SKIPPED",
          errorMessage: "external_dm_tool_enabled",
        });
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "DM_SKIPPED",
          igUserId: commenterId,
          mediaId,
          commentId,
          keyword: matchedKeyword,
          meta: {
            reason: "external_dm_tool_enabled",
            sendPrivateDm: false,
          },
        });
        await createWebhookEvent({
          eventType: "ACTION_SKIPPED",
          eventSource: "META_REAL",
          field: changeItem.field,
          automationId: automation.id,
          igAccountId: pageId,
          igUserId: commenterId,
          mediaId,
          commentId,
          status: "PROCESSED",
          errorMessage: "private_dm_disabled",
          payload: {
            publicReplyEnabled,
            privateDmEnabled: false,
            action: "private_dm",
            reason: "private_dm_disabled",
          },
        });
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "PROCESSED",
          errorMessage: "outbound_skipped_by_campaign_settings",
          processedAt: new Date(),
        });
        continue;
      }

      if (automation.userId && (publicReplyEnabled || privateDmEnabled)) {
        const usageAllowed = await canSendStaticReply(automation.userId);
        if (!usageAllowed.ok) {
          await createAutomationEvent({
            automationId: automation.id,
            eventType: "COMMENT_SKIPPED",
            igUserId: commenterId,
            mediaId,
            commentId,
            keyword: matchedKeyword,
            meta: {
              reason: "static_reply_limit_reached",
              wouldHaveMatchedCampaign: true,
              whyNoPublicReply: "static_reply_limit_reached",
              plan: usageAllowed.usage.plan,
              used: usageAllowed.usage.staticReplies.used,
              limit: usageAllowed.usage.staticReplies.limit,
              periodLabel: usageAllowed.usage.periodLabel,
              enforcementStart:
                usageAllowed.usage.enforcementStart.toISOString(),
            },
          });
          await createMessageLog({
            automationId: automation.id,
            recipientIgId: commenterId,
            mediaId,
            commentId,
            messageType: "COMMENT_REPLY",
            status: "SKIPPED",
            errorMessage: "static_reply_limit_reached",
          });
          if (privateDmEnabled) {
            await createMessageLog({
              automationId: automation.id,
              recipientIgId: commenterId,
              mediaId,
              commentId,
              messageType: "DM",
              status: "SKIPPED",
              errorMessage: "static_reply_limit_reached",
            });
          }
          await updateWebhookEvent(webhookEvent.id, {
            automationId: automation.id,
            status: "IGNORED",
            errorMessage: "static_reply_limit_reached",
            processedAt: new Date(),
          });
          continue;
        }
      }

      await upsertLead({
        automationId: automation.id,
        igUserId: commenterId,
        igUsername: commenterUsername,
        commentText,
        mediaId,
      });

      const tokenResolution = resolveIntegrationSendToken(integrationRaw);
      const instagramBusinessAccountId = integrationRaw?.instagramId;
      if (!tokenResolution.ok) {
        const diag = tokenResolutionDiagnostics(integrationRaw);
        console.warn("[webhook] automation token missing", {
          automationId: automation.id,
          reason: tokenResolution.reason,
          ...diag,
        });
        if (publicReplyEnabled) {
          await createMessageLog({
            automationId: automation.id,
            recipientIgId: commenterId,
            mediaId,
            commentId,
            messageType: "COMMENT_REPLY",
            status: "FAILED",
            errorMessage: "token_missing",
          });
        }
        if (privateDmEnabled) {
          await createMessageLog({
            automationId: automation.id,
            recipientIgId: commenterId,
            mediaId,
            commentId,
            messageType: "DM",
            status: "FAILED",
            errorMessage: "token_missing",
          });
        }
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "FAILED",
          errorMessage: "token_missing",
          processedAt: new Date(),
        });
        continue;
      }
      const token = tokenResolution.token;
      if (!instagramBusinessAccountId) {
        if (publicReplyEnabled) {
          await createMessageLog({
            automationId: automation.id,
            recipientIgId: commenterId,
            mediaId,
            commentId,
            messageType: "COMMENT_REPLY",
            status: "FAILED",
            errorMessage: "instagram_business_account_missing",
          });
        }
        if (privateDmEnabled) {
          await createMessageLog({
            automationId: automation.id,
            recipientIgId: commenterId,
            mediaId,
            commentId,
            messageType: "DM",
            status: "FAILED",
            errorMessage: "instagram_business_account_missing",
          });
        }
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "FAILED",
          errorMessage: "instagram_business_account_missing",
          processedAt: new Date(),
        });
        continue;
      }

      if (resumedAutomationId && entry.ap3kBacktrack && !eligibleCommentTimestamp(change.timestamp)) {
        await updateWebhookEvent(webhookEvent.id,{automationId:automation.id,status:"IGNORED",errorMessage:"backtrack_comment_expired",processedAt:new Date()});
        continue;
      }
      const templateVars = {
        username: commenterUsername ?? "",
        first_name: commenterUsername ?? "",
        keyword: matchedKeyword,
        link: listener.ctaLink ?? "",
      };

      // 5. Send public comment reply — pick a random non-empty variation
      // Primary: threaded reply via POST /{commentId}/replies (Advanced Access)
      // Fallback: top-level @mention comment via POST /{mediaId}/comments (Standard Access)
      let chosenReply =
        publicReplyEnabled && !aiReplyEnabled
          ? replyVariants[Math.floor(Math.random() * replyVariants.length)]
          : null;
      let aiReplyCategory: string | null = null;

      if (aiReplyEnabled && automation.userId) {
        try {
          const aiWorkspace = await getAiWorkspaceRuntimeConfig(
            automation.userId,
            automation.integrationId,
          );
          const aiQuota = await reserveAiReplyQuota({
            userId: automation.userId,
            automationId: automation.id,
            channel: "COMMENT",
            igUserId: commenterId,
            mediaId,
            commentId,
            keyword: matchedKeyword,
          });
          if (!aiQuota.ok) {
            await createMessageLog({
              automationId: automation.id,
              recipientIgId: commenterId,
              mediaId,
              commentId,
              messageType: "COMMENT_REPLY",
              status: "SKIPPED",
              errorMessage: aiQuota.reason,
            });
            await createAutomationEvent({
              automationId: automation.id,
              eventType: "COMMENT_SKIPPED",
              igUserId: commenterId,
              mediaId,
              commentId,
              keyword: matchedKeyword,
              meta: {
                reason: aiQuota.reason,
                aiReplyEnabled: true,
                plan: aiQuota.plan,
                used: aiQuota.used,
                limit: aiQuota.limit,
              },
            });
          } else {
            const decision = await generateAiCommentDecision({
              comment: commentText,
              postCaption: automation.posts?.[0]?.caption,
              instructions: listener.aiReplyInstructions,
              tone: listener.aiReplyTone,
              protectionRules: listener.aiProtectionRules,
              workspace: aiWorkspace,
              deliveryContext: {
                sendDm: privateDmEnabled,
                openingDm: listener.openingDmEnabled !== false,
                username: commenterUsername,
              },
            });
            aiReplyCategory = decision.category;

            if (
              "reason" in decision &&
              decision.reason === "ai_provider_unavailable"
            ) {
              await releaseAiReplyReservation(aiQuota.reservationId);
            } else {
              await completeAiReplyReservation(aiQuota.reservationId, {
                action: decision.action,
                category: decision.category,
                tone: listener.aiReplyTone,
                reason: "reason" in decision ? decision.reason : null,
              });
            }

            if (decision.action === "REPLY") {
              chosenReply = decision.reply;
            } else {
              let protectionError: string | undefined;
              if (decision.action === "DELETE") {
                try {
                  await withRetry(() =>
                    deleteInstagramComment(commentId, token),
                  );
                } catch (deleteError) {
                  protectionError = formatSafeMetaError(deleteError);
                }
              }
              await createMessageLog({
                automationId: automation.id,
                recipientIgId: commenterId,
                mediaId,
                commentId,
                messageType: "COMMENT_REPLY",
                status: "SKIPPED",
                errorMessage: protectionError
                  ? "ai_protection_delete_failed"
                  : decision.reason,
              });
              await createAutomationEvent({
                automationId: automation.id,
                eventType: "COMMENT_SKIPPED",
                igUserId: commenterId,
                mediaId,
                commentId,
                keyword: matchedKeyword,
                meta: {
                  reason: protectionError
                    ? "ai_protection_delete_failed"
                    : decision.reason,
                  category: decision.category,
                  protectionAction: decision.action,
                  deleted: decision.action === "DELETE" && !protectionError,
                  ...(protectionError ? { error: protectionError } : {}),
                },
              });
            }
          }
        } catch (aiError) {
          console.error("[webhook] AI comment reply failed", {
            automationId: automation.id,
            commentId,
            error:
              aiError instanceof Error ? aiError.message : "unknown_ai_error",
          });
          await Promise.allSettled([
            createMessageLog({
              automationId: automation.id,
              recipientIgId: commenterId,
              mediaId,
              commentId,
              messageType: "COMMENT_REPLY",
              status: "SKIPPED",
              errorMessage: "ai_reply_unavailable",
            }),
            createAutomationEvent({
              automationId: automation.id,
              eventType: "COMMENT_SKIPPED",
              igUserId: commenterId,
              mediaId,
              commentId,
              keyword: matchedKeyword,
              meta: { reason: "ai_reply_unavailable", aiReplyEnabled: true },
            }),
          ]);
        }
      }

      if (resumedAutomationId && entry.ap3kBacktrack && !eligibleCommentTimestamp(change.timestamp)) {
        await updateWebhookEvent(webhookEvent.id,{automationId:automation.id,status:"IGNORED",errorMessage:"backtrack_comment_expired",processedAt:new Date()});
        continue;
      }
      let publicSlot: Awaited<
        ReturnType<typeof reservePublicReplySlot>
      > | null = null;
      if (chosenReply) {
        try {
          publicSlot = await reservePublicReplySlot({
            automationId: automation.id,
            mediaId: mediaId || "unknown",
            commentId,
            limit: listener.publicReplyLimit,
          });
        } catch {
          publicSlot = { ok: false, reason: "public_reply_limit_unavailable" };
        }
        if (!publicSlot.ok) {
          await createMessageLog({
            automationId: automation.id,
            recipientIgId: commenterId,
            mediaId,
            commentId,
            messageType: "COMMENT_REPLY",
            status: "SKIPPED",
            errorMessage: publicSlot.reason,
          });
          chosenReply = null;
        }
      }
      if (chosenReply) {
        const replyText = resolveTemplate(
          personalizeUsername(chosenReply, commenterUsername),
          templateVars,
        );
        const mediaReplyCount10m = await countRecentPublicReplies({
          automationId: automation.id,
          mediaId,
          since: new Date(Date.now() - LOOP_GUARD_MEDIA_WINDOW_MS),
        });
        const automationReplyCount1h = await countRecentPublicReplies({
          automationId: automation.id,
          since: new Date(Date.now() - LOOP_GUARD_AUTOMATION_WINDOW_MS),
        });
        const publicReplyVolumeExceeded =
          mediaReplyCount10m >= MAX_PUBLIC_REPLIES_PER_AUTOMATION_MEDIA_10M ||
          automationReplyCount1h >= MAX_PUBLIC_REPLIES_PER_AUTOMATION_HOUR;

        let publicReplySent = false;
        let publicReplyEndpoint: "threaded_reply" | "mention_comment" =
          "threaded_reply";
        let publicReplyErrorMessage: string | undefined;
        let publicReplyCommentId: string | undefined;
        let outboundPublicReplyText = replyText;

        try {
          // Primary: Advanced Access — true threaded reply linked to the comment
          const replyResult = await withRetry(() =>
            sendCommentReply(commentId, replyText, token),
          );
          publicReplyCommentId = extractMetaCreatedObjectId(replyResult);
          publicReplySent =
            replyResult.status === 200 && Boolean(publicReplyCommentId);
          if (replyResult.status === 200 && !publicReplyCommentId) {
            publicReplyErrorMessage = "meta_public_reply_missing_id";
          }
        } catch (threadedErr) {
          const threadedError = formatSafeMetaError(threadedErr);
          console.warn(
            "[webhook] threaded comment reply failed — trying Standard Access @mention fallback",
            {
              error: getSafeMetaError(threadedErr),
              hasCommenterUsername: Boolean(commenterUsername),
              hasMediaId: Boolean(mediaId),
            },
          );

          // Fallback: Standard Access — top-level comment with @mention
          if (mediaId) {
            publicReplyEndpoint = "mention_comment";
            const mentionText =
              commenterUsername && !replyText.includes(`@${commenterUsername}`)
                ? `@${commenterUsername} ${replyText}`
                : replyText;
            outboundPublicReplyText = mentionText;
            try {
              const fallback = await withRetry(() =>
                sendMediaComment(mediaId, mentionText, token),
              );
              publicReplyCommentId = extractMetaCreatedObjectId(fallback);
              publicReplySent =
                fallback.status === 200 && Boolean(publicReplyCommentId);
              if (fallback.status === 200 && !publicReplyCommentId) {
                publicReplyErrorMessage = "meta_public_reply_missing_id";
              }
              if (!commenterUsername) {
                publicReplyErrorMessage =
                  "commenter_username_missing_mention_omitted";
              }
            } catch (mentionErr) {
              publicReplyErrorMessage = `threaded=${threadedError} mention=${formatSafeMetaError(mentionErr)}`;
              console.warn(
                "[webhook] Standard Access @mention fallback also failed",
                getSafeMetaError(mentionErr),
              );
            }
          } else {
            publicReplyErrorMessage = threadedError;
          }
        }

        if (publicSlot?.ok)
          await finishPublicReplySlot(publicSlot.id, publicReplySent).catch(
            () => undefined,
          );
        await createMessageLog({
          automationId: automation.id,
          recipientIgId: commenterId,
          mediaId,
          commentId: publicReplyCommentId ?? commentId,
          messageType: "COMMENT_REPLY",
          status: publicReplySent ? "SENT" : "FAILED",
          errorMessage: publicReplySent ? undefined : publicReplyErrorMessage,
        });
        await createAutomationEvent({
          automationId: automation.id,
          eventType: publicReplySent
            ? "PUBLIC_REPLY_SENT"
            : "PUBLIC_REPLY_FAILED",
          igUserId: commenterId,
          mediaId,
          commentId: publicReplySent ? publicReplyCommentId : commentId,
          keyword: matchedKeyword,
          meta: {
            reason: publicReplySent
              ? PUBLIC_REPLY_SENT_REASON
              : classifyPublicReplyFailureReason(publicReplyErrorMessage),
            endpoint: publicReplyEndpoint,
            sourceCommentId: commentId,
            publicReplyCommentId,
            commenterUsername,
            commentText,
            publicReplyVolumeExceeded,
            mediaReplyCount10m,
            automationReplyCount1h,
            replyTextPreview: outboundPublicReplyText.slice(0, 180),
            publicReplyTextHash: hashNormalizedText(
              normalizeMatchText(outboundPublicReplyText),
            ),
            normalizedPublicReplyText: normalizeMatchText(
              outboundPublicReplyText,
            ),
            mentionOmitted:
              publicReplyErrorMessage ===
              "commenter_username_missing_mention_omitted",
            replyMode: aiReplyEnabled ? "AI" : "SAVED",
            ...(aiReplyCategory ? { aiReplyCategory } : {}),
            ...(publicReplyErrorMessage && !publicReplySent
              ? { error: publicReplyErrorMessage }
              : {}),
          },
        });
        await createWebhookEvent({
          eventType: publicReplySent ? "ACTION_SENT" : "ACTION_SKIPPED",
          eventSource: "META_REAL",
          field: changeItem.field,
          automationId: automation.id,
          igAccountId: pageId,
          igUserId: commenterId,
          mediaId,
          commentId,
          status: publicReplySent ? "PROCESSED" : "FAILED",
          errorMessage: publicReplySent ? undefined : publicReplyErrorMessage,
          payload: {
            action: "public_reply",
            publicReplyEnabled,
            privateDmEnabled,
            publicReplyEndpoint,
            publicReplyCommentId,
          },
        });
      }

      if (automation.sendPrivateDm === false) {
        await createMessageLog({
          automationId: automation.id,
          recipientIgId: commenterId,
          mediaId,
          commentId,
          messageType: "DM",
          status: "SKIPPED",
          errorMessage: "external_dm_tool_enabled",
        });
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "DM_SKIPPED",
          igUserId: commenterId,
          mediaId,
          commentId,
          keyword: matchedKeyword,
          meta: {
            reason: "external_dm_tool_enabled",
            sendPrivateDm: false,
          },
        });
        await createWebhookEvent({
          eventType: "ACTION_SKIPPED",
          eventSource: "META_REAL",
          field: changeItem.field,
          automationId: automation.id,
          igAccountId: pageId,
          igUserId: commenterId,
          mediaId,
          commentId,
          status: "PROCESSED",
          errorMessage: "private_dm_disabled",
          payload: {
            publicReplyEnabled,
            privateDmEnabled: false,
            action: "private_dm",
            reason: "private_dm_disabled",
          },
        });
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "PROCESSED",
          errorMessage: "dm_skipped_external_tool",
          processedAt: new Date(),
        });
        continue;
      }

      if (automation.userId) {
        const dmUsageAllowed = await canSendStaticReply(automation.userId);
        if (!dmUsageAllowed.ok) {
          await createMessageLog({
            automationId: automation.id,
            recipientIgId: commenterId,
            mediaId,
            commentId,
            messageType: "DM",
            status: "SKIPPED",
            errorMessage: "static_reply_limit_reached",
          });
          await createAutomationEvent({
            automationId: automation.id,
            eventType: "DM_SKIPPED",
            igUserId: commenterId,
            mediaId,
            commentId,
            keyword: matchedKeyword,
            meta: {
              reason: "static_reply_limit_reached",
              plan: dmUsageAllowed.usage.plan,
              used: dmUsageAllowed.usage.staticReplies.used,
              limit: dmUsageAllowed.usage.staticReplies.limit,
              periodLabel: dmUsageAllowed.usage.periodLabel,
            },
          });
          await updateWebhookEvent(webhookEvent.id, {
            automationId: automation.id,
            status: "PROCESSED",
            errorMessage: "dm_skipped_static_reply_limit_reached",
            processedAt: new Date(),
          });
          continue;
        }
      }

      // 6. Send either the optional opening DM or the final configured payload
      // immediately. Existing automations retain the opening step by default.
      const openingDmEnabled = listener.openingDmEnabled !== false;
      let dmMessageText = resolveTemplate(
        personalizeUsername(
          openingDmEnabled
            ? resolveOpeningDmText(listener.openingDmText)
            : selectMessageVariation(
                listener.prompt,
                listener.messageVariations,
                commentId,
              ),
          commenterUsername,
        ),
        templateVars,
      );
      const captureFirst = !openingDmEnabled && (listener.emailCaptureEnabled || listener.phoneCaptureEnabled);
      if ((listener.emailCaptureEnabled || listener.phoneCaptureEnabled) && !["PRO","BUSINESS"].includes(automation.User?.subscription?.plan ?? "FREE")) {
        await updateWebhookEvent(webhookEvent.id,{automationId:automation.id,status:"IGNORED",errorMessage:"capture_requires_paid_plan",processedAt:new Date()});
        continue;
      }
      if (automation.oneDmPerUser && !(await claimDmRecipient(automation.id, commenterId))) {
        await updateWebhookEvent(webhookEvent.id,{automationId:automation.id,status:"PROCESSED",errorMessage:"one_dm_per_user"});
        continue;
      }
      let firstCaptureJob: string | undefined;
      if (captureFirst) {
        for (const kind of ["EMAIL","PHONE"] as const) {
          if (!(kind === "EMAIL" ? listener.emailCaptureEnabled : listener.phoneCaptureEnabled)) continue;
          const step = await beginEmailRequest(automation.id,commenterId,commentId,new Date(),kind);
          if (step.kind === "waiting") { firstCaptureJob = "waiting"; break; }
          if (step.kind === "request") {
            firstCaptureJob = step.jobId;
            dmMessageText=personalizeUsername(kind === "EMAIL" ? listener.emailCapturePrompt || "Enter your email" : listener.phoneCapturePrompt || "Enter your phone number",commenterUsername);
            break;
          }
        }
        if (firstCaptureJob === "waiting") continue;
      }
      const intermediateDm = openingDmEnabled || Boolean(firstCaptureJob);
      const directLinkButtons = intermediateDm
        ? []
        : readLinkButtons(
            listener.quickReplies,
            listener.ctaButtonTitle,
            listener.ctaLink,
          );
      const fullWidthCallbacksReady = openingDmEnabled
        ? await ensureInstagramButtonCallbacks(integrationRaw?.id, token)
        : false;
      // Establish the baseline before the first follow request; a button press is never proof of a follow.
      if (
        integrationRaw &&
        (automation.followGateRequired ||
          readFlow(listener.flowDefinition)?.nodes.some(
            (n) => n.kind === "condition" && n.field === "_followsBusiness",
          ))
      ) {
        const baseline = await getInstagramRecipientProfile({
          token,
          recipientId: commenterId,
        });
        await observeAutomationFollow({
          integrationId: integrationRaw.id,
          automationId: automation.id,
          recipientIgId: commenterId,
          followsBusiness: baseline?.followsBusiness,
        });
      }
      if (resumedAutomationId && entry.ap3kBacktrack && !eligibleCommentTimestamp(change.timestamp)) {
        await updateWebhookEvent(webhookEvent.id,{automationId:automation.id,status:"IGNORED",errorMessage:"backtrack_comment_expired",processedAt:new Date()});
        continue;
      }
      const dmResult = await sendInstagramCommentPrivateReply({
        // Use the full-width postback only after both subscription layers are
        // confirmed. Otherwise retain the native quick-reply fallback.
        preferQuickReplyForPostback:
          openingDmEnabled && (listener.openingDmFormat === "QUICK_REPLY" || !fullWidthCallbacksReady),
        token,
        igBusinessAccountId: instagramBusinessAccountId,
        commentId,
        commenterId,
        message: dmMessageText,
        automationId: automation.id,
        responseFormat: intermediateDm ? "TEXT" : listener.responseFormat,
        quickReplies: intermediateDm
          ? []
          : readLegacyQuickReplies(
              Array.isArray(listener.quickReplies) ? listener.quickReplies : [],
            ),
        linkButtons: directLinkButtons,
        ctaTitle: intermediateDm ? undefined : listener.ctaButtonTitle,
        ctaUrl: intermediateDm ? undefined : listener.ctaLink,
        cardSubtitle: intermediateDm ? undefined : listener.cardSubtitle,
        mediaUrl: intermediateDm ? undefined : listener.mediaUrl,
        mediaType: intermediateDm ? undefined : listener.mediaType,
        postbackButton: openingDmEnabled
          ? {
              title: resolveOpeningDmButtonText(listener.openingDmButtonText),
              payload: openingDmActionPayload(automation.id, commentId),
            }
          : undefined,
      });

      if (firstCaptureJob) await finishEngagementJob(firstCaptureJob,dmResult.ok ? "WAITING":"FAILED");
      if (dmResult.ok) {
        console.log(
          `[webhook] DM_SENT recipientId=${commenterId} automationId=${automation.id} endpoint=${dmResult.endpoint} ctaMode=${dmResult.ctaMode}`,
        );
        await createMessageLog({
          automationId: automation.id,
          recipientIgId: commenterId,
          mediaId,
          commentId,
          messageType: "DM",
          status: "SENT",
          errorMessage: openingDmEnabled
            ? "opening_dm_sent"
            : firstCaptureJob ? "email_request_dm_sent" : "final_dm_payload_sent",
        });
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "DM_SENT",
          igUserId: commenterId,
          mediaId,
          commentId,
          keyword: matchedKeyword,
          meta: {
            endpoint: dmResult.endpoint,
            ctaMode: dmResult.ctaMode,
            dmFlowStep: openingDmEnabled ? "OPENING" : firstCaptureJob ? "CAPTURE" : "FINAL",
            ...(listener.flowDefinition
              ? { flowRevision: listener.flowRevision }
              : {}),
          },
        });
        await trackResponse(automation.id, "DM");
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "PROCESSED",
          errorMessage: openingDmEnabled
            ? "opening_dm_sent"
            : firstCaptureJob ? "email_request_dm_sent" : "final_dm_payload_sent",
          processedAt: new Date(),
        });
      } else {
        const errorMessage = formatPrivateReplyError(dmResult);
        console.warn(
          `[webhook] DM_FAILED recipientId=${commenterId} automationId=${automation.id} reason=${dmResult.reason} endpoint=${dmResult.endpoint}`,
        );
        await createMessageLog({
          automationId: automation.id,
          recipientIgId: commenterId,
          mediaId,
          commentId,
          messageType: "DM",
          status: "FAILED",
          errorMessage,
        });
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "DM_FAILED",
          igUserId: commenterId,
          mediaId,
          commentId,
          keyword: matchedKeyword,
          meta: {
            reason: dmResult.reason,
            endpoint: dmResult.endpoint,
            metaError: dmResult.metaError,
            ctaMode: dmResult.ctaMode,
          },
        });
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "FAILED",
          errorMessage: `dm_failed: ${errorMessage}`,
          processedAt: new Date(),
        });
      }
      continue;
    } else {
      console.log("[webhook] unsupported change ignored", {
        field: changeItem.field,
      });
      await createWebhookEvent({
        eventType: "UNHANDLED_WEBHOOK",
        eventSource: "META_REAL",
        field: changeItem.field,
        igAccountId: pageId,
        status: "IGNORED",
        payload: safeWebhookMetadata(
          envelope,
          signatureValid,
          entry,
          changeItem,
          requestMeta,
        ),
      });
      continue;
    }
  }

  for (const messagingItem of messaging) {
    // -----------------------------------------------------------------------
    // INBOUND DM EVENT (entry.messaging — not entry.changes)
    // -----------------------------------------------------------------------
    if (!messagingItem) continue;

    const parsed = parseMessagingItem(messagingItem);
    const senderId = parsed.ok
      ? parsed.data.senderId
      : messagingItem.sender?.id
        ? String(messagingItem.sender.id)
        : undefined;
    const dmText = parsed.ok
      ? (parsed.data.messageText ?? "")
      : (messagingItem.message?.text ?? "");
    console.log(
      "[webhook] messaging item received",
      parsed.ok
        ? {
            hasSenderId: parsed.diagnostics.hasSenderId,
            hasMessageText: parsed.diagnostics.hasMessageText,
            hasQuickReply: parsed.diagnostics.hasQuickReply,
            hasPostback: parsed.diagnostics.hasPostback,
            isEcho: parsed.diagnostics.isEcho,
          }
        : {
            parseFailureReason: parsed.reason,
            ...parsed.diagnostics,
          },
    );
    const storyInteraction = parsed.ok
      ? classifyStoryInteraction(parsed.data)
      : null;
    const actionPayload = parsed.ok
      ? (parsed.data.quickReplyPayload ?? parsed.data.postback?.payload)
      : undefined;
    const inboundAttachment = parsed.ok
      ? parsed.data.attachments.find((attachment) => attachment.url)
      : undefined;
    const inboundMediaUrl =
      inboundAttachment?.url ??
      (parsed.ok ? parsed.data.replyToStory?.url : undefined);
    const inboundMessageType = storyInteraction
      ? `STORY_${storyInteraction}`
      : actionPayload
        ? parsed.ok && parsed.data.postback
          ? "POSTBACK"
          : "QUICK_REPLY"
        : (inboundAttachment?.type?.toUpperCase() ?? "TEXT");
    const attachmentLabel =
      inboundAttachment?.type === "video"
        ? "Sent a video"
        : inboundAttachment?.type === "reel"
          ? "Shared a Reel"
          : inboundAttachment
            ? "Sent an image"
            : "Instagram message";
    const inboundContent =
      dmText ||
      (storyInteraction === "MENTION"
        ? "Mentioned you in a story"
        : storyInteraction === "REACTION"
          ? "Reacted to your story"
          : storyInteraction === "REPLY"
            ? "Replied to your story"
            : parsed.ok && parsed.data.postback?.title
              ? parsed.data.postback.title
              : attachmentLabel);

    // Echo messages are copies of outbound messages sent by the IG account — skip them.
    if (parsed.ok && parsed.data.isEcho) {
      const echoEvent = await createWebhookEvent({
        eventType: "REAL_MESSAGE_EVENT",
        eventSource: "META_REAL",
        field: "messaging",
        igAccountId: pageId,
        igUserId: senderId,
        payload: {
          ...safeWebhookMetadata(
            envelope,
            signatureValid,
            entry,
            undefined,
            requestMeta,
          ),
          ...parsed.diagnostics,
          messageMid: parsed.data.messageMid,
          entryId: entry?.id,
          object: envelope?.object,
        },
      });
      await updateWebhookEvent(echoEvent.id, {
        status: "IGNORED",
        errorMessage: INBOUND_MESSAGE_ECHO_SKIPPED,
        processedAt: new Date(),
      });
      continue;
    }

    // Receipts and standalone reactions share the messaging envelope but are
    // not inbound DMs. Record them without profile calls, inbox rows, or a
    // misleading missing-required-fields warning.
    if (parsed.ok && parsed.data.systemEventType) {
      const receiptIntegration =
        parsed.data.systemEventType === "DELIVERY"
          ? null
          : await findIntegrationForWebhookAccount(pageId);
      if (receiptIntegration && senderId)
        await recordEngagementReceipt(
          receiptIntegration.id,
          senderId,
          messagingItem,
        );
      const systemEvent = await createWebhookEvent({
        eventType: "REAL_MESSAGE_EVENT",
        eventSource: "META_REAL",
        field: "messaging",
        igAccountId: pageId,
        igUserId: senderId,
        payload: {
          ...safeWebhookMetadata(
            envelope,
            signatureValid,
            entry,
            undefined,
            requestMeta,
          ),
          ...parsed.diagnostics,
          systemEventType: parsed.data.systemEventType,
          entryId: entry?.id,
          object: envelope?.object,
        },
      });
      await updateWebhookEvent(systemEvent.id, {
        status: "IGNORED",
        errorMessage: INBOUND_SYSTEM_EVENT_SKIPPED,
        processedAt: new Date(),
      });
      continue;
    }

    {
      // Build rich messaging diagnostics for the event payload
      const messagingPayload = parsed.ok
        ? {
            ...parsed.diagnostics,
            recipientId: parsed.data.recipientId,
            messageMid: parsed.data.messageMid,
            messageTimestamp: parsed.data.messageTimestamp,
            hasPostback: Boolean(parsed.data.postback),
            entryId: entry?.id,
            object: envelope?.object,
          }
        : {
            hasSenderId: Boolean(senderId),
            hasRecipientId: false,
            hasMessageText: Boolean(dmText),
            hasMessageMid: false,
            hasTimestamp: false,
            hasPostback: false,
            isEcho: false,
            parseFailureReason: !parsed.ok ? parsed.reason : undefined,
            entryId: entry?.id,
            object: envelope?.object,
          };

      const webhookEvent = await createWebhookEvent({
        eventType: "REAL_MESSAGE_EVENT",
        eventSource: "META_REAL",
        field: "messaging",
        igAccountId: pageId,
        igUserId: senderId,
        payload: {
          ...safeWebhookMetadata(
            envelope,
            signatureValid,
            entry,
            undefined,
            requestMeta,
          ),
          ...messagingPayload,
        },
      });

      const inboxIntegration = await findIntegrationForWebhookAccount(pageId);
      let senderProfile: Awaited<
        ReturnType<typeof getInstagramRecipientProfile>
      > = null;
      if (senderId && inboxIntegration?.userId) {
        const inboxToken = resolveIntegrationSendToken(inboxIntegration);
        if (inboxToken.ok) {
          senderProfile = await getInstagramRecipientProfile({
            token: inboxToken.token,
            recipientId: senderId,
          });
        }
        await upsertInboundInboxMessage({
          userId: inboxIntegration.userId,
          integrationId: inboxIntegration.id,
          senderIgId: senderId,
          content: inboundContent,
          metaMessageId: parsed.ok ? parsed.data.messageMid : undefined,
          username: senderProfile?.username,
          profilePictureUrl: senderProfile?.profilePictureUrl,
          messageType: inboundMessageType,
          mediaUrl: inboundMediaUrl,
          occurredAt:
            parsed.ok && parsed.data.messageTimestamp
              ? new Date(parsed.data.messageTimestamp)
              : undefined,
        }).catch((error) =>
          console.warn("[inbox] inbound persistence failed", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }

      if (
        !senderId ||
        (!dmText &&
          !storyInteraction &&
          !actionPayload &&
          !inboundMediaUrl &&
          !(parsed.ok && isSharedPostAttachment(parsed.data.attachments)))
      ) {
        console.log("[webhook] inbound DM missing required fields — ignoring", {
          hasSenderId: Boolean(senderId),
          hasMessageText: Boolean(dmText),
          parseReason: !parsed.ok ? parsed.reason : undefined,
        });
        await updateWebhookEvent(webhookEvent.id, {
          status: "IGNORED",
          errorMessage: "missing_required_dm_fields",
          processedAt: new Date(),
        });
        continue;
      }

      const inboundAt =
        parsed.ok && parsed.data.messageTimestamp
          ? new Date(parsed.data.messageTimestamp)
          : null;
      if (inboxIntegration && inboundAt && messagingWindowOpen(inboundAt))
        await cancelPendingFollowUps(inboxIntegration.id, senderId, inboundAt);
      if (
        inboxIntegration &&
        actionPayload &&
        (await handleConversationStarter({
          integrationId: inboxIntegration.id,
          recipientIgId: senderId,
          payload: actionPayload,
          inboundAt,
          eventId: parsed.ok
            ? (parsed.data.messageMid ?? webhookEvent.id)
            : webhookEvent.id,
        }))
      ) {
        await updateWebhookEvent(webhookEvent.id, {
          status: "PROCESSED",
          errorMessage: "conversation_starter_handled",
          processedAt: new Date(),
        });
        continue;
      }
      if (
        inboxIntegration &&
        !storyInteraction &&
        !parseCommentDmActionPayload(actionPayload) &&
        (await processAutomationFlow({
          scheduleWake: waitUntil,
          integrationId: inboxIntegration.id,
          recipientIgId: senderId,
          text: dmText,
          inboundAt,
          eventId: parsed.ok
            ? (parsed.data.messageMid ?? webhookEvent.id)
            : webhookEvent.id,
        }))
      ) {
        await updateWebhookEvent(webhookEvent.id, {
          status: "PROCESSED",
          errorMessage: "custom_flow_reply_handled",
          processedAt: new Date(),
        });
        continue;
      }
      if (inboxIntegration && inboundAt && messagingWindowOpen(inboundAt)) {
        const emailReply =
          !actionPayload && !storyInteraction
            ? await takeEmailReply(
                inboxIntegration.id,
                senderId,
                dmText,
                inboundAt,
                parsed.ok ? parsed.data.messageMid : undefined,
              )
            : null;
        if (parseEmailReply(dmText).kind === "stop")
          await findAutomationForDM(dmText, pageId, senderId);
        if (
          emailReply?.kind === "waiting" ||
          parseEmailReply(dmText).kind === "stop"
        ) {
          await updateWebhookEvent(webhookEvent.id, {
            status: "PROCESSED",
            errorMessage: "engagement_reply_handled",
            processedAt: new Date(),
          });
          continue;
        }
        if (emailReply?.kind === "continue") {
          const emailAutomation = await findAutomationById(
            emailReply.automationId,
            pageId,
          );
          if (emailAutomation?.active && emailAutomation.listener) {
            await processConfiguredMessageAutomation({
              automation: emailAutomation,
              pageId,
              senderId,
              senderProfile,
              webhookEventId: webhookEvent.id,
              messageMid: parsed.ok ? parsed.data.messageMid : undefined,
              matchedKeyword: "email_reply",
              inboundText: dmText,
              inboundAt,
              dmFlowAction: {
                type: "OPENING_CONTINUE",
                automationId: emailReply.automationId,
                flowId: emailReply.flowId,
              },
              emailCompletionId: emailReply.jobId,
            });
          } else await finishEngagementJob(emailReply.jobId, "FAILED");
          continue;
        }
      }

      const payloadAction = parseCommentDmActionPayload(actionPayload);
      const fallbackAction = !payloadAction
        ? await findPendingCommentDmActionForText(
            pageId,
            senderId,
            dmText || (parsed.ok ? (parsed.data.postback?.title ?? "") : ""),
          )
        : null;
      const dmFlowAction = payloadAction ?? fallbackAction?.action ?? null;
      const callbackAutomation =
        fallbackAction?.automation ??
        (dmFlowAction
          ? await findAutomationById(dmFlowAction.automationId, pageId)
          : null);
      const callbackIntegration = callbackAutomation
        ? selectIntegrationForWebhook(
            callbackAutomation.User?.integrations,
            pageId,
          )
        : undefined;
      if (dmFlowAction) {
        console.log("[webhook] comment DM callback resolved", {
          automationId: dmFlowAction.automationId,
          action: dmFlowAction.type,
          source: payloadAction ? "payload" : "pending_text_fallback",
          hasQuickReplyPayload: Boolean(
            parsed.ok && parsed.data.quickReplyPayload,
          ),
          hasPostbackPayload: Boolean(
            parsed.ok && parsed.data.postback?.payload,
          ),
        });
      }
      const storyAutomation = storyInteraction
        ? await findAutomationForStory(storyInteraction, pageId, dmText, parsed.ok ? parsed.data.replyToStory?.id : undefined, parsed.ok ? parsed.data.messageTimestamp : undefined)
        : null;
      const currentFlowOpening =
        dmFlowAction?.type === "OPENING_CONTINUE" && callbackAutomation
          ? await isCurrentFlowOpening(
              callbackAutomation,
              senderId,
              dmFlowAction.flowId,
            )
          : true;
      const callbackIsAllowed = Boolean(
        currentFlowOpening &&
        callbackAutomation?.active &&
        callbackIntegration &&
        callbackIntegration.status !== "DISCONNECTED" &&
        callbackIntegration.reconnectRequired !== true &&
        !callbackIntegration.planLocked &&
        callbackAutomation?.integrationId === callbackIntegration.id &&
        (dmFlowAction?.type !== "OPENING_CONTINUE" ||
          callbackAutomation.source === "COMMENT" ||
          (callbackAutomation.source === "STORY" && callbackAutomation.listener?.openingDmEnabled === true) ||
          readFlowTriggers(callbackAutomation.listener?.flowTriggers)?.some(
            (t) => t.source === "COMMENT",
          )),
      );
      if (dmFlowAction && !callbackIsAllowed) {
        console.warn("[webhook] comment DM callback rejected", {
          automationId: dmFlowAction.automationId,
          action: dmFlowAction.type,
          active: callbackAutomation?.active === true,
          accountMatched: Boolean(callbackIntegration),
          source: callbackAutomation?.source,
        });
        await updateWebhookEvent(webhookEvent.id, {
          status: "IGNORED",
          errorMessage: currentFlowOpening
            ? "automation_callback_unavailable"
            : "flow_opening_revision_changed",
          processedAt: new Date(),
        });
        continue;
      }
      const directAutomation = callbackIsAllowed
        ? callbackAutomation
        : storyAutomation;

      if (directAutomation?.listener) {
        if (resumedAutomationId && resumedAutomationId !== directAutomation.id) continue;
        if (!resumedAutomationId && !dmFlowAction && !envelope.dryRun && envelope.source !== "INTERNAL_SELF_TEST" && directAutomation.deliveryDelaySeconds > 0) {
          await deferAutomationDelivery({automationId:directAutomation.id,eventKey:`story:${parsed.ok ? parsed.data.messageMid : webhookEvent.id}`,recipientIgId:senderId,seconds:directAutomation.deliveryDelaySeconds,entry:{id:entry.id,messaging:[messagingItem]},object:envelope.object});
          await updateWebhookEvent(webhookEvent.id,{automationId:directAutomation.id,status:"PROCESSING",errorMessage:"delivery_scheduled"});
          continue;
        }
        await updateWebhookEvent(webhookEvent.id, {
          automationId: directAutomation.id,
          status: "PROCESSING",
        });
        const callbackRequested = Boolean(dmFlowAction && callbackIsAllowed);
        const duplicate = callbackRequested
          ? dmFlowAction?.flowId
            ? await hasDeliveredFinalPayload(
                directAutomation.id,
                senderId,
                dmFlowAction.flowId,
              )
            : await hasDeliveredFinalPayload(directAutomation.id, senderId)
          : await isDuplicate(
              directAutomation.id,
              senderId,
              undefined,
              parsed.ok ? parsed.data.messageMid : undefined,
            );
        if (duplicate) {
          await updateWebhookEvent(webhookEvent.id, {
            automationId: directAutomation.id,
            status: "PROCESSED",
            errorMessage: "duplicate_skipped",
            processedAt: new Date(),
          });
          continue;
        }
        if (!resumedAutomationId && !envelope.dryRun && envelope.source !== "INTERNAL_SELF_TEST" && readStoryConfig(directAutomation.storyConfig) && parsed.ok && parsed.data.messageMid && !await claimImmediateStory(directAutomation.id,parsed.data.messageMid)) {
          await updateWebhookEvent(webhookEvent.id,{automationId:directAutomation.id,status:"PROCESSED",errorMessage:"duplicate_story_webhook",processedAt:new Date()});
          continue;
        }
        await processConfiguredMessageAutomation({
          automation: directAutomation,
          pageId,
          senderId,
          senderProfile,
          webhookEventId: webhookEvent.id,
          messageMid: parsed.ok ? parsed.data.messageMid : undefined,
          matchedKeyword: storyInteraction
            ? `story_${storyInteraction.toLowerCase()}`
            : (dmFlowAction?.type.toLowerCase() ?? "message"),
          inboundText: dmText || inboundContent,
          inboundAt,
          dmFlowAction: callbackRequested ? dmFlowAction : null,
        });
        continue;
      }

      if (storyInteraction) {
        // A story with a nonmatching keyword must not leak into a catch-all inbox DM rule.
        await updateWebhookEvent(webhookEvent.id,{status:"PROCESSED",errorMessage:"no_matching_story_automation",processedAt:new Date()});
        continue;
      }

      // 1. Try to match an automation by keyword
      const result = await findAutomationForDM(
        dmText,
        pageId,
        senderId,
        parsed.ok && isSharedPostAttachment(parsed.data.attachments),
        parsed.ok ? parsed.data.attachments.find(a=>a.type === "ig_post" && a.mediaId)?.mediaId : undefined,
      );

      if (!result) {
        console.log(
          `[webhook] inbound DM — no keyword automation matched senderId=${senderId}`,
          {
            hint: "Configure a DM automation with keywords or Any incoming DM to respond automatically.",
          },
        );
        await updateWebhookEvent(webhookEvent.id, {
          status: "PROCESSED",
          errorMessage: INBOUND_MESSAGE_NO_AUTOMATION,
          processedAt: new Date(),
        });
        continue;
      }

      const { automation, matchedKeyword } = result;
      if (resumedAutomationId && resumedAutomationId !== automation.id) continue;
      if (!resumedAutomationId && !envelope.dryRun && envelope.source !== "INTERNAL_SELF_TEST" && automation.source === "COMMENT" && automation.deliveryDelaySeconds > 0) {
        await deferAutomationDelivery({automationId:automation.id,eventKey:`share:${parsed.ok ? parsed.data.messageMid : webhookEvent.id}`,recipientIgId:senderId,seconds:automation.deliveryDelaySeconds,entry:{id:entry.id,messaging:[messagingItem]},object:envelope.object});
        await updateWebhookEvent(webhookEvent.id,{automationId:automation.id,status:"PROCESSING",errorMessage:"delivery_scheduled"});
        continue;
      }
      console.log(
        `[webhook] DM match: automationId=${automation.id} keyword="${matchedKeyword}"`,
      );
      await updateWebhookEvent(webhookEvent.id, {
        automationId: automation.id,
        status: "PROCESSING",
      });

      // 2. Duplicate check
      if (
        await isDuplicate(
          automation.id,
          senderId,
          undefined,
          parsed.ok ? parsed.data.messageMid : undefined,
        )
      ) {
        await createAutomationEvent({
          automationId: automation.id,
          eventType: "DUPLICATE_SKIPPED",
          igUserId: senderId,
          keyword: matchedKeyword,
        });
        await updateWebhookEvent(webhookEvent.id, {
          automationId: automation.id,
          status: "PROCESSED",
          errorMessage: "duplicate_skipped",
          processedAt: new Date(),
        });
        continue;
      }

      if (automation.listener) {
        await processConfiguredMessageAutomation({
          automation,
          pageId,
          senderId,
          senderProfile,
          webhookEventId: webhookEvent.id,
          messageMid: parsed.ok ? parsed.data.messageMid : undefined,
          matchedKeyword,
          inboundText: dmText,
          inboundAt,
        });
        continue;
      }

      await updateWebhookEvent(webhookEvent.id, {
        automationId: automation.id,
        status: "FAILED",
        errorMessage: "listener_missing",
        processedAt: new Date(),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function processConfiguredMessageAutomation(params: {
  automation: any;
  pageId: string;
  senderId: string;
  senderProfile: Awaited<ReturnType<typeof getInstagramRecipientProfile>>;
  webhookEventId: string;
  messageMid?: string;
  matchedKeyword: string;
  inboundText: string;
  inboundAt?: Date | null;
  emailCompletionId?: string;
  dmFlowAction?: CommentDmAction | null;
  delayedStep?: AutomationStep;
  pendingCaptureId?: string;
  pendingCaptureKind?: "EMAIL" | "PHONE";
}) {
  const {
    automation,
    pageId,
    senderId,
    webhookEventId,
    messageMid,
    matchedKeyword,
    inboundText,
    dmFlowAction = null,
  } = params;
  const integration = selectIntegrationForWebhook<Integrations>(
    automation.User?.integrations,
    pageId,
    automation.integrationId ?? undefined,
  );
  if (
    !integration ||
    integration.id !== automation.integrationId ||
    integration.planLocked
  )
    return;
  const tokenResolution = resolveIntegrationSendToken(integration);
  const instagramBusinessAccountId = integration?.instagramId;
  if (
    !automation.listener ||
    !automation.userId ||
    !tokenResolution.ok ||
    !instagramBusinessAccountId
  ) {
    await updateWebhookEvent(webhookEventId, {
      automationId: automation.id,
      status: "FAILED",
      errorMessage: !instagramBusinessAccountId
        ? "instagram_business_account_missing"
        : !automation.listener
          ? "listener_missing"
          : "token_missing",
      processedAt: new Date(),
    });
    return;
  }

  if ((automation.listener.emailCaptureEnabled || automation.listener.phoneCaptureEnabled) && !["PRO","BUSINESS"].includes(automation.User?.subscription?.plan ?? "FREE")) {
    await updateWebhookEvent(webhookEventId,{automationId:automation.id,status:"IGNORED",errorMessage:"capture_requires_paid_plan",processedAt:new Date()});
    return;
  }

  if (automation.source === "STORY" && readStoryConfig(automation.storyConfig) && (!params.inboundAt || !messagingWindowOpen(params.inboundAt))) {
    await updateWebhookEvent(webhookEventId,{automationId:automation.id,status:"IGNORED",errorMessage:"messaging_window_closed",processedAt:new Date()});
    return;
  }

  if (!dmFlowAction && !params.emailCompletionId) {
    await recordAutomationHit({
      automationId: automation.id,
      eventKey: `message:${messageMid ?? webhookEventId}`,
      recipientIgId: senderId,
      source: matchedKeyword.startsWith("story_") ? "STORY" : "DM",
    });
  }
  if (
    ["FOLLOWED", "UNFOLLOWED"].includes(
      automation.listener.followUpCondition,
    ) ||
    automation.followGateRequired ||
    readFlow(automation.listener.flowDefinition)?.nodes.some(
      (n) => n.kind === "condition" && n.field === "_followsBusiness",
    )
  ) {
    const followProfile =
      params.senderProfile ??
      (await getInstagramRecipientProfile({
        token: tokenResolution.token,
        recipientId: senderId,
      }));
    params.senderProfile = followProfile;
    await observeAutomationFollow({
      integrationId: integration.id,
      automationId: automation.id,
      recipientIgId: senderId,
      followsBusiness: followProfile?.followsBusiness,
    });
  }

  if (automation.listener.flowDefinition) {
    const graph = readFlow(automation.listener.flowDefinition);
    const entry = graph?.nodes.find((node) => node.id === graph.entry);
    const openingEntry =
      dmFlowAction?.type === "OPENING_CONTINUE" &&
      entry?.kind === "question" &&
      entry.options.length === 1 &&
      entry.text === automation.listener.openingDmText &&
      entry.options[0].label === automation.listener.openingDmButtonText
        ? entry
        : null;
    await processAutomationFlow({
      scheduleWake: waitUntil,
      integrationId: integration.id,
      recipientIgId: senderId,
      text: inboundText,
      inboundAt: params.inboundAt,
      eventId: messageMid ?? webhookEventId,
      automationId: automation.id,
      startEventId: dmFlowAction?.flowId,
      ...(openingEntry
        ? {
            startNodeId: openingEntry.options[0].next,
            initialValues: {
              [openingEntry.field]: openingEntry.options[0].label,
            },
          }
        : {}),
    });
    await updateWebhookEvent(webhookEventId, {
      automationId: automation.id,
      status: "PROCESSED",
      errorMessage: "custom_flow_handled",
      processedAt: new Date(),
    });
    return;
  }

  const usageAllowed = await canSendStaticReply(automation.userId);
  if (!usageAllowed.ok) {
    console.warn("[webhook] configured DM blocked by plan usage", {
      automationId: automation.id,
      callbackAction: dmFlowAction?.type,
      reason: usageAllowed.reason,
    });
    await createAutomationEvent({
      automationId: automation.id,
      eventType: "DM_SKIPPED",
      igUserId: senderId,
      keyword: matchedKeyword,
      meta: { reason: usageAllowed.reason },
    });
    await updateWebhookEvent(webhookEventId, {
      automationId: automation.id,
      status: "IGNORED",
      errorMessage: usageAllowed.reason,
      processedAt: new Date(),
    });
    return;
  }

  const token = tokenResolution.token;
  const profile =
    params.senderProfile ??
    (automation.followGateRequired
      ? await getInstagramRecipientProfile({ token, recipientId: senderId })
      : null);
  const needsOpening = automation.source === "STORY" && automation.listener.openingDmEnabled === true && Boolean(automation.listener.openingDmText) && !dmFlowAction && !params.emailCompletionId;
  const needsFollowRequest = !needsOpening && automation.followGateRequired && profile?.followsBusiness !== true;
  const flowId = dmFlowAction?.flowId ?? messageMid ?? webhookEventId;
  let emailRequestId: string | undefined = params.pendingCaptureId;
  let captureKind: "EMAIL" | "PHONE" = params.pendingCaptureKind || "EMAIL";
  if (emailRequestId && !(captureKind === "EMAIL" ? automation.listener.emailCaptureEnabled : automation.listener.phoneCaptureEnabled)) {
    await finishEngagementJob(emailRequestId, "CANCELLED");
    return;
  }
  if (!needsOpening && !needsFollowRequest && !emailRequestId) {
    // Complete the claimed reply before moving to the next field. Replays cannot
    // consume it again; SKIP also marks only this field complete for this journey.
    if (params.emailCompletionId)
      await finishEngagementJob(params.emailCompletionId, "COMPLETED");
    for (const kind of ["EMAIL", "PHONE"] as const) {
      if (
        !(kind === "EMAIL"
          ? automation.listener.emailCaptureEnabled
          : automation.listener.phoneCaptureEnabled)
      )
        continue;
      if (!params.inboundAt || !messagingWindowOpen(params.inboundAt)) return;
      const step = await beginEmailRequest(
        automation.id,
        senderId,
        flowId,
        params.inboundAt,
        kind,
      );
      if (step.kind === "waiting") return;
      if (step.kind === "request") {
        emailRequestId = step.jobId;
        captureKind = kind;
        break;
      }
    }
  }
  const needsEmailRequest = Boolean(emailRequestId);
  const intermediateStep = needsOpening || needsFollowRequest || needsEmailRequest;
  const currentStep: AutomationStep = needsOpening ? "OPENING" : needsFollowRequest ? "FOLLOW" : needsEmailRequest ? captureKind : "MESSAGE";
  if (params.delayedStep && (params.delayedStep !== currentStep || !params.inboundAt || !messagingWindowOpen(params.inboundAt))) return;
  const pause = stepDelay(automation,currentStep);
  if (!params.delayedStep && pause > 0) {
    if (!params.inboundAt || Date.now()+pause*1000 >= params.inboundAt.getTime()+86400000) return;
    await deferAutomationDelivery({automationId:automation.id,recipientIgId:senderId,eventKey:`step:${flowId}:${currentStep}:${messageMid || dmFlowAction?.type || "initial"}`,seconds:pause,object:"instagram",entry:{ap3kConfiguredMessage:{pageId,senderId,webhookEventId,messageMid,matchedKeyword,inboundText,inboundAt:params.inboundAt.toISOString(),dmFlowAction,emailCompletionId:params.emailCompletionId,pendingCaptureId:emailRequestId,pendingCaptureKind:captureKind,delayedStep:currentStep}}});
    await updateWebhookEvent(webhookEventId,{automationId:automation.id,status:"PROCESSING",errorMessage:"step_scheduled"});
    return;
  }

  const quickReplies = Array.isArray(automation.listener.quickReplies)
    ? automation.listener.quickReplies.filter(
        (item: unknown): item is string => typeof item === "string",
      )
    : [];
  const linkButtons = readLinkButtons(
    automation.listener.quickReplies,
    automation.listener.ctaButtonTitle,
    automation.listener.ctaLink,
  );
  let aiGenerated = false;
  let aiLinkButtons: Array<{ label: string; url: string }> = [];
  let payloadMessage = resolveTemplate(
    personalizeUsername(
      selectMessageVariation(
        automation.listener.prompt,
        automation.listener.messageVariations,
        flowId,
      ),
      profile?.username,
    ),
    {
      username: profile?.username ? `@${profile.username}` : "",
      first_name: profile?.name?.split(/\s+/)[0] ?? "",
      keyword: matchedKeyword,
      link: automation.listener.ctaLink ?? "",
    },
  );
  const conversationConfig = readAiConversation(
    automation.listener.aiConversation,
  );
  let conversationTurn: Awaited<ReturnType<typeof prepareAiConversationTurn>> =
    null;
  if (conversationConfig && !dmFlowAction) {
    conversationTurn = await prepareAiConversationTurn({
      automationId: automation.id,
      userId: automation.userId,
      integrationId: integration.id,
      recipientIgId: senderId,
      message: inboundText,
      inboundAt: params.inboundAt,
      config: conversationConfig,
    });
    if (!conversationTurn) {
      await updateWebhookEvent(webhookEventId, {
        status: "IGNORED",
        errorMessage: "ai_conversation_paused_busy_or_quota",
        processedAt: new Date(),
      });
      return;
    }
    payloadMessage = conversationTurn.reply;
    aiGenerated = true;
    aiLinkButtons = conversationTurn.linkButton
      ? [conversationTurn.linkButton]
      : [];
  }
  if (
    !conversationConfig &&
    automation.listener.aiDmReplyEnabled === true &&
    !dmFlowAction
  ) {
    try {
      const workspace = await getAiWorkspaceRuntimeConfig(
        automation.userId,
        automation.integrationId,
      );
      {
        // Each automation opts into AI; shared workspace switches are not prerequisites.
        const quota = await reserveAiReplyQuota({
          userId: automation.userId,
          automationId: automation.id,
          channel: "DM",
          igUserId: senderId,
          keyword: matchedKeyword,
        });
        if (quota.ok) {
          const generated = await generateAiDmReply({
            message: inboundText,
            workspace,
            automationInstructions: automation.listener.prompt,
          });
          if (generated.ok) {
            payloadMessage = generated.reply;
            aiLinkButtons = generated.linkButton ? [generated.linkButton] : [];
            aiGenerated = true;
            await completeAiReplyReservation(quota.reservationId, {
              channel: "DM",
              outcome: "generated",
            });
          } else {
            await releaseAiReplyReservation(quota.reservationId);
          }
        }
      }
    } catch (aiError) {
      // A provider or quota failure must not swallow the webhook. The saved
      // message remains a safe fallback and the automation can still reply.
      console.error("[webhook] AI DM generation failed; using saved fallback", {
        automationId: automation.id,
        senderId,
        error: aiError instanceof Error ? aiError.message : "unknown_ai_error",
      });
    }
  }
  const resolvedMessage = needsOpening ? personalizeUsername(resolveOpeningDmText(automation.listener.openingDmText),profile?.username) : needsFollowRequest
    ? resolveTemplate(
        resolveFollowRequestDmText(automation.listener.followRequestDmText),
        {
          username: profile?.username ? `@${profile.username}` : "",
          first_name: profile?.name?.split(/\s+/)[0] ?? "",
          keyword: matchedKeyword,
          link: automation.listener.ctaLink ?? "",
        },
      )
    : needsEmailRequest
      ? captureKind === "PHONE"
        ? personalizeUsername((automation.listener.phoneCapturePrompt || "Enter your phone number").trim(),profile?.username)
        : personalizeUsername(emailRequestMessage(
            automation.listener.emailCapturePrompt ||
              "Enter your email",
          ),profile?.username)
      : payloadMessage;
  const followPromptState =
    dmFlowAction?.type === "FOLLOW_CHECK"
      ? typeof profile?.followsBusiness === "boolean"
        ? ("NOT_FOLLOWING" as const)
        : ("UNAVAILABLE" as const)
      : ("INITIAL" as const);
  const followVerificationButtonTitle = resolveFollowRequestButtonText(
    automation.listener.followRequestButtonText,
  );
  const fullWidthCallbacksReady = needsOpening || needsFollowRequest
    ? await ensureInstagramButtonCallbacks(integration?.id, token)
    : false;

  if (automation.oneDmPerUser && !dmFlowAction && !params.emailCompletionId && !(await claimDmRecipient(automation.id, senderId))) {
    await updateWebhookEvent(webhookEventId,{automationId:automation.id,status:"PROCESSED",errorMessage:"one_dm_per_user"});
    return;
  }
  const result = await sendInstagramDirectResponse({
    preferQuickReplyForPostback: (needsOpening && automation.listener.openingDmFormat === "QUICK_REPLY") || ((needsOpening || needsFollowRequest) && !fullWidthCallbacksReady),
    token,
    igBusinessAccountId: instagramBusinessAccountId,
    recipientId: senderId,
    automationId: automation.id,
    message: resolvedMessage,
    responseFormat: intermediateStep
      ? "TEXT"
      : aiGenerated
        ? aiLinkButtons.length
          ? "LINK"
          : "TEXT"
        : automation.listener.responseFormat,
    carouselCards: !intermediateStep && !aiGenerated && automation.listener.responseFormat === "CAROUSEL" ? readStoryConfig(automation.storyConfig)?.cards : undefined,
    quickReplies:
      intermediateStep || aiGenerated
        ? []
        : readLegacyQuickReplies(quickReplies),
    linkButtons: intermediateStep
      ? []
      : aiGenerated
        ? aiLinkButtons
        : linkButtons,
    ctaTitle:
      intermediateStep || aiGenerated
        ? undefined
        : automation.listener.ctaButtonTitle,
    ctaUrl:
      intermediateStep || aiGenerated ? undefined : automation.listener.ctaLink,
    cardSubtitle:
      intermediateStep || aiGenerated
        ? undefined
        : automation.listener.cardSubtitle,
    mediaUrl:
      intermediateStep || aiGenerated
        ? undefined
        : automation.listener.mediaUrl,
    mediaType:
      intermediateStep || aiGenerated
        ? undefined
        : automation.listener.mediaType,
    followGatePrompt: needsFollowRequest
      ? {
          username: integration?.instagramUsername,
          state: followPromptState,
          message:
            followPromptState === "INITIAL" ? resolvedMessage : undefined,
          verificationButtonTitle: followVerificationButtonTitle,
          verificationPayload: followRequestActionPayload(
            automation.id,
            automation.source === "STORY" && readStoryConfig(automation.storyConfig)
              ? flowId
              : dmFlowAction?.flowId,
          ),
        }
      : undefined,
    postbackButton: needsOpening ? {title:resolveOpeningDmButtonText(automation.listener.openingDmButtonText),payload:openingDmActionPayload(automation.id,flowId)} : undefined,
  });

  const sent = result.ok;
  if (conversationTurn)
    await finishAiConversationTurn(conversationTurn, {
      message: inboundText,
      sent,
      automationId: automation.id,
      recipientIgId: senderId,
    }).catch(() =>
      console.error("[ai-conversation] session persistence failed", {
        automationId: automation.id,
      }),
    );
  const sentMarker = needsOpening ? "opening_dm_sent" : needsFollowRequest
    ? "follow_request_dm_sent"
    : needsEmailRequest
      ? "email_request_dm_sent"
      : "final_dm_payload_sent";
  if (emailRequestId)
    await finishEngagementJob(emailRequestId, sent ? "WAITING" : "FAILED");

  const errorMessage = result.ok
    ? undefined
    : [result.metaError.status, result.metaError.code, result.metaError.message]
        .filter(Boolean)
        .join(": ") || "meta_api_error";
  console.log("[webhook] configured DM delivery completed", {
    automationId: automation.id,
    callbackAction: dmFlowAction?.type,
    step: needsOpening ? "OPENING" : needsFollowRequest
      ? "FOLLOW_REQUEST"
      : needsEmailRequest
        ? "EMAIL_REQUEST"
        : "FINAL",
    sent,
    messageIdCount: result.ok ? result.messageIds.length : 0,
    error: errorMessage,
  });
  await createMessageLog({
    automationId: automation.id,
    recipientIgId: senderId,
    commentId: dmFlowAction?.flowId ?? messageMid,
    messageType: "DM",
    status: sent ? "SENT" : "FAILED",
    errorMessage: sent ? sentMarker : errorMessage,
  });
  await createAutomationEvent({
    automationId: automation.id,
    eventType: sent ? "DM_SENT" : "DM_FAILED",
    igUserId: senderId,
    keyword: matchedKeyword,
    meta: {
      responseFormat: needsOpening ? "OPENING" : needsFollowRequest
        ? "FOLLOW_REQUEST"
        : needsEmailRequest
          ? "EMAIL_REQUEST"
          : aiGenerated
            ? aiLinkButtons.length
              ? "AI_LINK"
              : "AI_TEXT"
            : automation.listener.responseFormat,
      dmFlowAction: dmFlowAction?.type,
      followRequired: Boolean(automation.followGateRequired),
      followVerified: automation.followGateRequired
        ? profile?.followsBusiness === true
        : undefined,
      error: errorMessage,
    },
  });

  if (sent) {
    await Promise.all([
      trackResponse(automation.id, "DM"),
      recordOutboundInboxMessage({
        userId: automation.userId,
        integrationId: integration!.id,
        recipientIgId: senderId,
        automationId: automation.id,
        content: resolvedMessage,
        metaMessageId: result.messageIds[0] || undefined,
      }).catch((error) =>
        console.warn("[inbox] outbound persistence failed", {
          message: error instanceof Error ? error.message : String(error),
        }),
      ),
    ]);
  }
  if (
    sent &&
    !intermediateStep &&
    automation.listener.followUpEnabled &&
    params.inboundAt
  ) {
    const receiptsReady =
      !["SEEN", "NOT_SEEN", "REACTED"].includes(
        automation.listener.followUpCondition,
      ) || (await ensureInstagramButtonCallbacks(integration.id, token));
    if (receiptsReady)
      await scheduleFollowUp(
        automation.id,
        senderId,
        flowId,
        params.inboundAt,
        automation.listener.followUpDelayMinutes,
        {
          messageId: result.messageIds[0],
          condition: automation.listener.followUpCondition,
          baselineFollows: params.senderProfile?.followsBusiness,
        },
      );
  }
  await updateWebhookEvent(webhookEventId, {
    automationId: automation.id,
    status: sent ? "PROCESSED" : "FAILED",
    errorMessage: sent ? sentMarker : `dm_failed: ${errorMessage}`,
    processedAt: new Date(),
  });
}

function ok() {
  return NextResponse.json({ received: true }, { status: 200 });
}

async function readBodyWithLimit(
  req: NextRequest,
  maxBytes: number,
): Promise<
  | { ok: true; rawBody: string; bytesRead: number }
  | { ok: false; reason: string; bytesRead: number }
> {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      return { ok: false, reason: "payload_too_large", bytesRead: 0 };
    }
  }

  if (!req.body) return { ok: true, rawBody: "", bytesRead: 0 };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      try {
        await reader.cancel();
      } catch {
        // Nothing else to do once the body is already over the hard limit.
      }
      return { ok: false, reason: "payload_too_large", bytesRead };
    }
    chunks.push(value);
  }

  return {
    ok: true,
    rawBody: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString(
      "utf8",
    ),
    bytesRead,
  };
}

function classifyWebhookEnvelope(body: any) {
  // Meta Test button sends entry.id="0" for both object=page and object=instagram
  if (body?.entry?.[0]?.id === "0") {
    return "META_TEST_EVENT";
  }

  if (body?.object && !Array.isArray(body?.entry)) {
    return "PAYLOAD_INVALID";
  }

  return "PAYLOAD_INVALID";
}

function classifyCommentWebhook(envelope: any, entry: any, changeItem: any) {
  return isSyntheticWebhook(envelope, entry, changeItem)
    ? "META_TEST_EVENT"
    : "REAL_COMMENT_EVENT";
}

function isSyntheticWebhook(_envelope: any, entry: any, changeItem?: any) {
  const value = changeItem?.value;
  // Synthetic IDs used by Meta Test button regardless of object type (page or instagram)
  return (
    entry?.id === "0" ||
    value?.id === "0" ||
    value?.from?.id === "0" ||
    value?.media?.id === "0" ||
    value?.media?.id === "123123123"
  );
}

function safeWebhookMetadata(
  envelope: any,
  signatureValid: boolean,
  entry?: any,
  changeItem?: any,
  requestMeta?: ReturnType<typeof getRequestMetadata>,
) {
  const entries = Array.isArray(envelope?.entry) ? envelope.entry : [];
  const changes = Array.isArray(entry?.changes) ? entry.changes : [];
  const value = changeItem?.value;

  return {
    timestamp: new Date().toISOString(),
    headers: requestMeta,
    object: typeof envelope?.object === "string" ? envelope.object : undefined,
    entryId: entry?.id,
    field: changeItem?.field,
    entryCount: entries.length,
    changesCount: changes.length,
    hasValue: Boolean(value),
    valueKeys: value && typeof value === "object" ? Object.keys(value) : [],
    hasCommentId: Boolean(value?.id),
    hasMediaId: Boolean(value?.media?.id),
    hasFromId: Boolean(value?.from?.id),
    hasText: Boolean(value?.text),
    hasCommentText: Boolean(value?.text),
    commentId: value?.id,
    mediaId: value?.media?.id,
    fromId: value?.from?.id,
    igAccountId: entry?.id,
    appearsSynthetic: entry
      ? isSyntheticWebhook(envelope, entry, changeItem)
      : false,
    signatureValid,
    processingStatus: "RECEIVED",
  };
}

function parseJsonSafely(
  rawBody: string,
): { ok: true; body: any } | { ok: false; error: string } {
  try {
    return { ok: true, body: JSON.parse(rawBody) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown_parse_error",
    };
  }
}

function getRequestMetadata(
  req: NextRequest,
  signature: string | null,
  signatureValid: boolean,
) {
  return {
    timestamp: new Date().toISOString(),
    hasXHubSignature256: Boolean(signature),
    userAgent: req.headers.get("user-agent") ?? undefined,
    signatureValid,
  };
}

function getRateLimitKey(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(key: string) {
  const now = Date.now();
  pruneRateLimitBuckets(now);
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + WEBHOOK_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  existing.count += 1;
  return existing.count > WEBHOOK_RATE_LIMIT_MAX;
}

function pruneRateLimitBuckets(now: number) {
  if (
    now < nextRateLimitCleanupAt &&
    rateLimitBuckets.size <= WEBHOOK_RATE_LIMIT_MAX_BUCKETS
  ) {
    return;
  }

  rateLimitBuckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  });

  while (rateLimitBuckets.size > WEBHOOK_RATE_LIMIT_MAX_BUCKETS) {
    const oldestKey = rateLimitBuckets.keys().next().value;
    if (!oldestKey) break;
    rateLimitBuckets.delete(oldestKey);
  }

  nextRateLimitCleanupAt = now + WEBHOOK_RATE_LIMIT_WINDOW_MS;
}

function selectIntegrationForWebhook<
  T extends {
    id?: string | null;
    pageId?: string | null;
    webhookAccountId?: string | null;
    instagramId?: string | null;
    businessId?: string | null;
    instagramUsername?: string | null;
  },
>(
  integrations: T[] | undefined,
  entryId: string,
  matchedIntegrationId?: string,
): T | undefined {
  const byId = matchedIntegrationId
    ? integrations?.find(
        (integration) => integration.id === matchedIntegrationId,
      )
    : undefined;
  if (matchedIntegrationId)
    return byId &&
      [
        byId.webhookAccountId,
        byId.instagramId,
        byId.businessId,
        byId.pageId,
      ].some((id) => id && String(id).trim() === String(entryId).trim())
      ? byId
      : undefined;

  return integrations?.find((integration) =>
    [
      integration.webhookAccountId,
      integration.instagramId,
      integration.businessId,
      integration.pageId,
    ]
      .filter(Boolean)
      .some((id) => String(id).trim() === String(entryId).trim()),
  );
}

function normalizeAccountUsername(value?: string | null) {
  return value
    ? String(value).trim().replace(/^@+/, "").toLocaleLowerCase()
    : "";
}

function normalizeAccountId(value?: string | null) {
  return value ? String(value).trim() : "";
}

function getSelfCommentReason(input: {
  commenterId?: string;
  commenterUsername?: string;
  igAccountId?: string;
  integration?: {
    instagramId?: string | null;
    webhookAccountId?: string | null;
    pageId?: string | null;
    businessId?: string | null;
    instagramUsername?: string | null;
  };
  diagnostics?: unknown;
}) {
  const commenterId = normalizeAccountId(input.commenterId);
  const commenterUsername = normalizeAccountUsername(input.commenterUsername);
  const igAccountId = normalizeAccountId(input.igAccountId);
  const diagnostics =
    input.diagnostics &&
    typeof input.diagnostics === "object" &&
    !Array.isArray(input.diagnostics)
      ? (input.diagnostics as Record<string, unknown>)
      : {};

  const integrationInstagramId = normalizeAccountId(
    input.integration?.instagramId,
  );
  const integrationWebhookAccountId = normalizeAccountId(
    input.integration?.webhookAccountId,
  );
  const integrationPageId = normalizeAccountId(input.integration?.pageId);
  const integrationBusinessId = normalizeAccountId(
    input.integration?.businessId,
  );
  const diagnosticInstagramId = normalizeAccountId(
    diagnostics.matchedIntegrationInstagramId as string | undefined,
  );
  const diagnosticWebhookId = normalizeAccountId(
    diagnostics.matchedIntegrationWebhookAccountId as string | undefined,
  );

  const ownIds = [
    integrationInstagramId,
    integrationWebhookAccountId,
    integrationPageId,
    integrationBusinessId,
    diagnosticInstagramId,
    diagnosticWebhookId,
    igAccountId,
  ].filter(Boolean);

  if (commenterId && ownIds.includes(commenterId))
    return "commenter_id_matches_connected_account";

  const integrationUsername = normalizeAccountUsername(
    input.integration?.instagramUsername,
  );
  const diagnosticUsername = normalizeAccountUsername(
    diagnostics.matchedIntegrationUsername as string | undefined,
  );
  const ownUsernames = [integrationUsername, diagnosticUsername].filter(
    Boolean,
  );
  if (commenterUsername && ownUsernames.includes(commenterUsername)) {
    return "commenter_username_matches_connected_account";
  }

  return null;
}

function hashNormalizedText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function extractMetaCreatedObjectId(response: unknown) {
  const data =
    response && typeof response === "object" && "data" in response
      ? (response as { data?: unknown }).data
      : undefined;
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  return typeof record.id === "string" && record.id.trim()
    ? record.id.trim()
    : undefined;
}

function classifyPublicReplyFailureReason(errorMessage?: string) {
  if (!errorMessage) return PUBLIC_REPLY_FAILED_UNKNOWN;
  const normalized = errorMessage.toLocaleLowerCase();
  if (
    normalized.includes("rate") ||
    normalized.includes("429") ||
    normalized.includes("too many")
  ) {
    return PUBLIC_REPLY_FAILED_RATE_LIMIT;
  }
  if (
    normalized.includes("meta") ||
    normalized.includes("threaded=") ||
    normalized.includes("mention=") ||
    normalized.includes("safe_error") ||
    normalized.includes("capability")
  ) {
    return PUBLIC_REPLY_FAILED_META_API;
  }
  return PUBLIC_REPLY_FAILED_UNKNOWN;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  attempts = SEND_RETRY_ATTEMPTS,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const status = getSafeMetaError(error).status;
      const shouldRetry =
        status === 429 || (typeof status === "number" && status >= 500);
      if (!shouldRetry || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError;
}

/** Only called with server-persisted entries by the authenticated scheduler. */
export async function resumeAutomationDelivery(automationId:string, entry:unknown, object:string) {
  const configured = (entry as {ap3kConfiguredMessage?:any})?.ap3kConfiguredMessage;
  if (configured) {
    const automation = await findAutomationById(automationId,configured.pageId);
    if (!automation?.active || automation.sendPrivateDm === false) return;
    await processConfiguredMessageAutomation({...configured,automation,senderProfile:null,inboundAt:new Date(configured.inboundAt)});
    return;
  }

  await processEntry(entry,{object},true,{} as ReturnType<typeof getRequestMetadata>,automationId);
}
