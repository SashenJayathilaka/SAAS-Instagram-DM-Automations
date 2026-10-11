import { client } from "@/lib/prisma";
import { getMetaTokenHealth } from "@/lib/meta-auth-diagnostics";

export async function getMetaAdminDiagnostics() {
  const integration = await client.integrations.findFirst({
    where: { name: "INSTAGRAM" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      instagramId: true,
      webhookAccountId: true,
      pageId: true,
      pageName: true,
      businessId: true,
      instagramUsername: true,
      igAccountSource: true,
      oauthResolutionDiagnostics: true,
      expiresAt: true,
      webhookSubscriptionLastAttemptedAt: true,
      webhookSubscriptionStatusCode: true,
      webhookSubscriptionSubscribed: true,
      webhookSubscriptionMode: true,
      webhookSubscriptionError: true,
      oauthLastError: true,
      oauthLastErrorAt: true,
      oauthLastErrorSource: true,
      token: true,
      User: { select: { email: true } },
    },
  });

  const tokenHealth = await getMetaTokenHealth({
    pageAccessToken: integration?.token,
    pageId: integration?.pageId,
    instagramBusinessAccountId: integration?.instagramId,
  });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [
    lastRawPost,
    lastSignatureFailed,
    lastRealComment,
    lastInboundDm,
    lastRouteError,
    lastIntegrationMatchFailed,
    lastAutomationMatchFailed,
    simulatedEvents,
    realMetaEvents,
    failedSignatures,
    ignoredPayloads,
    keywordMatched,
    dmSent,
    dmFailed,
  ] = await Promise.all([
    client.webhookEvent.findFirst({
      where: { eventType: "WEBHOOK_POST_RECEIVED_RAW", eventSource: "META_REAL" },
      orderBy: { createdAt: "desc" },
    }),
    client.webhookEvent.findFirst({
      where: { eventType: "SIGNATURE_FAILED", eventSource: "META_REAL" },
      orderBy: { createdAt: "desc" },
    }),
    client.webhookEvent.findFirst({
      where: { eventType: "REAL_COMMENT_EVENT", eventSource: "META_REAL" },
      orderBy: { createdAt: "desc" },
    }),
    client.webhookEvent.findFirst({
      where: { eventType: "REAL_MESSAGE_EVENT", eventSource: "META_REAL" },
      orderBy: { createdAt: "desc" },
    }),
    client.webhookEvent.findFirst({
      where: { eventType: "WEBHOOK_ROUTE_ERROR" },
      orderBy: { createdAt: "desc" },
    }),
    client.webhookEvent.findFirst({
      where: { eventType: "INTEGRATION_MATCH_FAILED" },
      orderBy: { createdAt: "desc" },
    }),
    client.webhookEvent.findFirst({
      where: { eventType: "AUTOMATION_MATCH_FAILED" },
      orderBy: { createdAt: "desc" },
    }),
    client.webhookEvent.count({
      where: { eventSource: "SIMULATED_INTERNAL", createdAt: { gte: since } },
    }),
    client.webhookEvent.count({
      where: { eventSource: "META_REAL", createdAt: { gte: since } },
    }),
    client.webhookEvent.count({
      where: { eventType: "SIGNATURE_FAILED", createdAt: { gte: since } },
    }),
    client.webhookEvent.count({
      where: { status: "IGNORED", createdAt: { gte: since } },
    }),
    client.automationEvent.count({
      where: { eventType: "KEYWORD_MATCHED", createdAt: { gte: since } },
    }),
    client.messageLog.count({
      where: { messageType: "DM", status: "SENT", createdAt: { gte: since } },
    }),
    client.messageLog.count({
      where: { messageType: "DM", status: "FAILED", createdAt: { gte: since } },
    }),
  ]);

  const lastCommentPayload = lastRealComment?.payload as any;
  const lastDmPayload = lastInboundDm?.payload as any;

  const currentWebhookState = !lastRawPost
    ? "No recent webhook delivery"
    : lastSignatureFailed && (!lastRawPost || lastSignatureFailed.createdAt > lastRawPost.createdAt)
      ? "Signature invalid"
      : lastRouteError && (!lastRawPost || lastRouteError.createdAt > lastRawPost.createdAt)
        ? "Parser failing"
        : lastRealComment
          ? "Comment webhooks active"
          : lastInboundDm
            ? "Only messaging webhooks received. No comment webhook detected recently."
            : "No recent webhook delivery";

  const baseResult = {
    lastRawPost,
    lastSignatureFailed,
    lastRealComment,
    lastInboundDm,
    lastRouteError,
    lastIntegrationMatchFailed,
    lastAutomationMatchFailed,
    lastRealWebhookAt: lastRealComment?.createdAt ?? lastInboundDm?.createdAt ?? null,
    lastFailureReason: lastRouteError?.errorMessage ?? lastSignatureFailed?.errorMessage ?? null,
    currentWebhookState,
    lastCommentWebhookDetails: lastRealComment ? {
      at: lastRealComment.createdAt,
      hasMediaId: Boolean(lastCommentPayload?.mediaId),
      hasCommentId: Boolean(lastCommentPayload?.commentId),
      hasText: Boolean(lastCommentPayload?.hasCommentText),
    } : null,
    lastMessagingWebhookAt: lastInboundDm?.createdAt ?? null,
    last24h: {
      simulatedEvents,
      realMetaEvents,
      failedSignatures,
      ignoredPayloads,
      keywordMatched,
      dmSent,
      dmFailed,
    },
  };

  if (!integration?.pageId || !integration.token) {
    const oauthState =
      integration?.oauthLastError ??
      (integration?.token ? "page_resolution_failed" : "page_token_missing");

    return {
      connected: false,
      integration: integration
        ? {
            id: integration.id,
            instagramId: integration.instagramId,
            webhookAccountId: integration.webhookAccountId,
            pageId: integration.pageId,
            pageName: integration.pageName,
            businessId: integration.businessId,
            instagramUsername: integration.instagramUsername,
            igAccountSource: integration.igAccountSource,
            oauthResolutionDiagnostics: integration.oauthResolutionDiagnostics,
            oauthLastError: integration.oauthLastError,
            oauthLastErrorAt: integration.oauthLastErrorAt,
            oauthLastErrorSource: integration.oauthLastErrorSource,
            userEmail: integration.User?.email,
          }
        : null,
      oauthState,
      subscriptionMode: integration?.webhookSubscriptionMode ?? "UNKNOWN",
      subscribedAppsActive: false,
      commentsSubscribed: false,
      messagesSubscribed: false,
      tokenValid: false,
      tokenScopes: [] as string[],
      tokenScopesStatus: "missing_page_token",
      tokenHealth,
      appMode: "unknown",
      appModeNote: "App mode and tester roles must be verified in Meta Developer Dashboard; Meta does not expose them through this page token health check.",
      subscribedAppsStatus: tokenHealth.subscribedAppsStatus ?? "unknown",
      tokenStatus: tokenHealth.graphValidationResult,
      ...baseResult,
    };
  }

  const subscriptionMode = integration.webhookSubscriptionMode ?? "UNKNOWN";

  return {
    connected: true,
    oauthState: integration.oauthLastError
      ? integration.oauthLastError
      : !integration.token
        ? "page_token_missing"
        : !integration.pageId
          ? "page_resolution_failed"
          : !integration.instagramId
            ? "ig_business_not_linked"
            : integration.webhookSubscriptionSubscribed === false &&
                subscriptionMode !== "META_DASHBOARD_MANAGED"
              ? "webhook_subscription_failed"
              : "oauth_success",
    subscriptionMode,
    integration: {
      id: integration.id,
      instagramId: integration.instagramId,
      webhookAccountId: integration.webhookAccountId,
      pageId: integration.pageId,
      pageName: integration.pageName,
      businessId: integration.businessId,
      instagramUsername: integration.instagramUsername,
      igAccountSource: integration.igAccountSource,
      oauthResolutionDiagnostics: integration.oauthResolutionDiagnostics,
      expiresAt: integration.expiresAt,
      webhookSubscriptionLastAttemptedAt: integration.webhookSubscriptionLastAttemptedAt,
      webhookSubscriptionStatusCode: integration.webhookSubscriptionStatusCode,
      webhookSubscriptionSubscribed: integration.webhookSubscriptionSubscribed,
      webhookSubscriptionMode: integration.webhookSubscriptionMode,
      webhookSubscriptionError: integration.webhookSubscriptionError,
      oauthLastError: integration.oauthLastError,
      oauthLastErrorAt: integration.oauthLastErrorAt,
      oauthLastErrorSource: integration.oauthLastErrorSource,
      userEmail: integration.User?.email,
      account: tokenHealth.linkedInstagramBusinessAccount,
    },
    subscribedAppsActive: tokenHealth.subscribedAppsActive,
    commentsSubscribed: tokenHealth.commentsSubscribed,
    messagesSubscribed: tokenHealth.messagesSubscribed,
    tokenValid: tokenHealth.tokenValid,
    tokenScopes: tokenHealth.tokenScopes,
    tokenScopesStatus: tokenHealth.requiredScopesPresent
      ? "available"
      : `missing ${tokenHealth.missingScopes.join(", ")}`,
    tokenHealth,
    appMode: "unknown",
    appModeNote: "App mode and tester roles must be verified in Meta Developer Dashboard; Meta does not expose them through this page token health check.",
    subscribedAppsStatus: tokenHealth.subscribedAppsStatus ?? "unknown",
    tokenStatus: tokenHealth.graphValidationResult,
    ...baseResult,
  };
}
