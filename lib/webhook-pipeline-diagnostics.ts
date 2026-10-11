type DiagnosticEvent = {
  id?: string;
  eventType?: string;
  status?: string;
  errorMessage?: string | null;
  payload?: unknown;
  createdAt?: Date | string;
  automationId?: string | null;
  commentId?: string | null;
  mediaId?: string | null;
};

type MessageLogLike = {
  messageType?: string;
  status?: string;
  errorMessage?: string | null;
  createdAt?: Date | string;
  commentId?: string | null;
};

type AutomationEventLike = {
  eventType?: string;
  keyword?: string | null;
  meta?: unknown;
  createdAt?: Date | string;
  commentId?: string | null;
};

export function shouldShowDevelopmentModeDeliveryBanner(lastPostRaw: unknown) {
  return !lastPostRaw;
}

export function developmentModeDeliveryMessage() {
  return "Meta did not deliver the real webhook. In Development mode, the connected account and commenter must be accepted app testers/admins/developers.";
}

export function buildWebhookPipelineDiagnostics({
  lastPostRaw,
  lastSignatureFailed,
  lastRealComment,
  automationEvents = [],
  messageLogs = [],
}: {
  lastPostRaw?: DiagnosticEvent | null;
  lastSignatureFailed?: DiagnosticEvent | null;
  lastRealComment?: DiagnosticEvent | null;
  automationEvents?: AutomationEventLike[];
  messageLogs?: MessageLogLike[];
}) {
  const payload = asRecord(lastRealComment?.payload);
  const mediaMatching = asRecord(payload?.mediaMatching);
  const triggerMatching = asRecord(payload?.triggerMatching);
  const triggerDecisions = Array.isArray(triggerMatching?.triggerDecisions)
    ? triggerMatching.triggerDecisions.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : [];
  const matchedAutomationIds = Array.isArray(mediaMatching?.matchedAutomationIds)
    ? mediaMatching.matchedAutomationIds.map(String)
    : [];
  const matchedTrigger = triggerDecisions.find((decision) => Boolean(decision.matchedKeyword));
  const publicReplyLog = messageLogs.find((log) => log.messageType === "COMMENT_REPLY");
  const dmLog = messageLogs.find((log) => log.messageType === "DM");
  const publicReplyEvent = automationEvents.find((event) =>
    event.eventType === "PUBLIC_REPLY_SENT" || event.eventType === "PUBLIC_REPLY_FAILED"
  );
  const dmEvent = automationEvents.find((event) =>
    event.eventType === "DM_SENT" || event.eventType === "DM_FAILED" || event.eventType === "DM_SKIPPED"
  );
  const keywordEvent = automationEvents.find((event) => event.eventType === "KEYWORD_MATCHED");

  const rawArrived = Boolean(lastPostRaw);
  const signaturePassed = Boolean(lastRealComment) ? true : lastSignatureFailed ? false : undefined;
  const realCommentClassified = lastRealComment?.eventType === "REAL_COMMENT_EVENT" || lastRealComment?.eventType === "INTERNAL_SELF_TEST";
  const integrationMatched = mediaMatching?.matchingIntegrationFound === true;
  const mediaMatched = matchedAutomationIds.length > 0;
  const triggerMatched = Boolean(matchedTrigger || keywordEvent);
  const publicReplyAttempted = Boolean(publicReplyLog || publicReplyEvent);
  const dmAttempted = Boolean(dmLog || dmEvent);

  const simulationResult = String(payload?.simulationResult || "");

  const finalReason =
    simulationResult ||
    dmLog?.errorMessage ||
    dmEvent?.eventType ||
    publicReplyLog?.errorMessage ||
    publicReplyEvent?.eventType ||
    lastRealComment?.errorMessage ||
    (triggerMatched ? "trigger_matched" : undefined) ||
    (mediaMatched ? "media_matched_no_trigger" : undefined) ||
    (integrationMatched ? "integration_matched_no_media" : undefined) ||
    (rawArrived ? "webhook_arrived_not_classified" : "meta_did_not_deliver_real_webhook");

  return {
    rawArrived,
    signaturePassed,
    realCommentClassified,
    integrationMatched,
    mediaMatched,
    triggerMatched,
    publicReplyAttempted,
    dmAttempted,
    finalReason,
    rawCreatedAt: lastPostRaw?.createdAt,
    realCommentCreatedAt: lastRealComment?.createdAt,
    mediaMatching,
    triggerMatching,
    matchedAutomationIds,
    matchedKeyword: String(matchedTrigger?.matchedKeyword ?? keywordEvent?.keyword ?? ""),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
