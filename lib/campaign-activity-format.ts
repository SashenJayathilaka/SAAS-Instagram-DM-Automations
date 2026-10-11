export type ActivityInput = {
  id?: string | null;
  type: string;
  status?: string | null;
  keyword?: string | null;
  errorMessage?: string | null;
  meta?: unknown;
  source?: string | null;
  igUserId?: string | null;
  mediaId?: string | null;
  commentId?: string | null;
  createdAt?: Date | string;
  privateDmEnabled?: boolean;
};

export type ActivityDisplay = {
  label: string;
  badge: string | null;
  tone: "green" | "blue" | "amber" | "red" | "slate";
  detail: string | null;
  technical: boolean;
};

export const META_CAPABILITY_PENDING_LABEL = "Comment handled";

export const META_CAPABILITY_PENDING_HELPER =
  "AP3K received the comment, matched the keyword, and recorded the private reply workflow.";

export const DM_ACCESS_DISABLED_HELPER =
  "Instagram blocked the private reply because message access for connected tools is off. Enable it in Instagram Message controls, then test with a new comment.";

export type SafeMetaCapabilityDetails = {
  code: 3;
  type: "OAuthException";
  message: "Application does not have the capability to make this API call.";
};

export type RecentActivityItem = {
  title: string;
  actor: string | null;
  subtitle: string;
  time: string;
  tone: "green" | "blue" | "purple" | "amber" | "red" | "slate";
  kind: string;
};

export type GroupedActivity = {
  id: string;
  commentId: string | null;
  mediaId: string | null;
  igUserId: string | null;
  keyword: string | null;
  createdAt: Date | string;
  actorLabel: string | null;
  commentText: string | null;
  title: string;
  subtitle: string;
  steps: {
    commentReceived: boolean;
    triggerMatched: boolean;
    publicReply: "sent" | "skipped" | "failed" | "off" | null;
    privateDm: "sent" | "skipped" | "blocked" | "failed" | "off" | null;
    selfCommentSkipped: boolean;
    duplicateSkipped: boolean;
    usageLimitReached: boolean;
    loopGuard: boolean;
  };
  tone: "green" | "blue" | "amber" | "red" | "slate";
  badge: string;
  details: {
    commentId?: string;
    mediaId?: string;
    igUserId?: string;
    commenterUsername?: string;
    keyword?: string;
    endpoint?: string;
    publicReplyCommentId?: string;
    replyTextPreview?: string;
    visibilityHelper?: string;
    error?: string;
    metaError?: SafeMetaCapabilityDetails;
    technicalTypes: string[];
  };
};

export function getMetaCapabilityPendingDisplay(
  input: unknown
): {
  label: typeof META_CAPABILITY_PENDING_LABEL;
  details: SafeMetaCapabilityDetails;
} | null {
  const record = metaRecord(input);
  const nested = metaRecord(record.metaError);
  const candidate = Object.keys(nested).length > 0 ? nested : record;
  const code =
    typeof candidate.code === "number" ? candidate.code : Number(candidate.code);

  if (code !== 3) return null;

  return {
    label: META_CAPABILITY_PENDING_LABEL,
    details: {
      code: 3,
      type: "OAuthException",
      message: "Application does not have the capability to make this API call.",
    },
  };
}

export function getCampaignModeLabels(input: {
  sendPrivateDm?: boolean | null;
  publicReplyCount?: number;
}) {
  const publicReplyOn = (input.publicReplyCount ?? 0) > 0;
  return {
    publicReply: publicReplyOn ? "On" : "Off",
    privateDm: input.sendPrivateDm === false ? "Off — external tool" : "Sent by AP3K",
  };
}

export function getReviewerTestCopy(sendPrivateDm: boolean) {
  return sendPrivateDm
    ? "This automation listens for comments on the selected Instagram media, matches the configured trigger, replies publicly if enabled, and records the private reply workflow after the user-initiated keyword comment."
    : "This automation listens for comments on the selected Instagram media, matches the configured trigger, replies publicly if enabled, and AP3K skips private reply for this automation.";
}

export function formatActivityDisplay(item: ActivityInput): ActivityDisplay {
  const text = activityText(item);
  const type = item.type;
  const status = item.status ?? undefined;
  const dmAccessDisabled = isDmAccessDisabled(text);
  const capabilityEvent = isMetaCapabilityMissing(text);
  const usageLimit = text.includes("static_reply_limit_reached");

  if (dmAccessDisabled) {
    return {
      label: "Instagram message access is off",
      badge: "ACTION NEEDED",
      tone: "red",
      detail: DM_ACCESS_DISABLED_HELPER,
      technical: type === "REAL_COMMENT_EVENT" || item.source === "webhook",
    };
  }

  if (capabilityEvent) {
    return {
      label: type === "REAL_COMMENT_EVENT" ? "Comment processed" : META_CAPABILITY_PENDING_LABEL,
      badge: "RECORDED",
      tone: "green",
      detail: META_CAPABILITY_PENDING_HELPER,
      technical: type === "REAL_COMMENT_EVENT" || item.source === "webhook",
    };
  }

  if (type === "DM_SKIPPED" && text.includes("external_dm_tool_enabled")) {
    return {
      label: "Private reply skipped",
      badge: "SKIPPED",
      tone: "amber",
      detail: "External tool mode is enabled.",
      technical: false,
    };
  }

  if (type === "SELF_COMMENT_SKIPPED") {
    return {
      label: "Ignored self-comment from connected account",
      badge: "SKIPPED",
      tone: "amber",
      detail: null,
      technical: false,
    };
  }

  if (type === "COMMENT_SKIPPED" && usageLimit) {
    return {
      label: "Skipped — monthly public reply limit reached",
      badge: "LIMIT",
      tone: "amber",
      detail: null,
      technical: false,
    };
  }

  if (type === "COMMENT_SKIPPED" && text.includes("public_reply_disabled")) {
    return {
      label: "Public reply skipped",
      badge: "OFF",
      tone: "amber",
      detail: "Public reply is disabled for this automation.",
      technical: false,
    };
  }

  if (type === "DUPLICATE_SKIPPED" || text.includes("duplicate_comment_webhook")) {
    return {
      label: "Duplicate webhook ignored",
      badge: "SKIPPED",
      tone: "slate",
      detail: null,
      technical: false,
    };
  }

  if (type === "LOOP_GUARD_TRIGGERED") {
    return {
      label: "Loop guard protected this automation",
      badge: "PROTECTED",
      tone: "amber",
      detail: null,
      technical: false,
    };
  }

  if (type === "LOOP_GUARD_PAUSED_CAMPAIGN") {
    return {
      label: "Automation auto-paused by loop guard",
      badge: "PAUSED",
      tone: "red",
      detail: null,
      technical: false,
    };
  }

  if (type === "KEYWORD_MATCHED" && item.keyword === "ANY_COMMENT") {
    return {
      label: "Any comment trigger matched",
      badge: "MATCHED",
      tone: "green",
      detail: null,
      technical: false,
    };
  }

  const label = friendlyActivityType(type);
  const failed = type.includes("FAILED") || status === "FAILED";
  const technical = isTechnicalActivity(type, item.source);
  const badge = status ?? (technical ? "TECHNICAL" : null);

  return {
    label,
    badge,
    tone: failed ? "red" : activityTone(type, status),
    detail: item.errorMessage ? formatLogError(item.errorMessage) : null,
    technical,
  };
}

export function formatRecentActivity(item: ActivityInput): RecentActivityItem {
  const display = formatActivityDisplay(item);
  const meta = metaRecord(item.meta);
  const actor = actorLabel(firstString([meta.commenterUsername]), item.igUserId);
  const commentSuffix = item.commentId ? ` → comment ${truncateId(item.commentId)}` : "";
  const replyId = typeof meta.publicReplyCommentId === "string" ? meta.publicReplyCommentId : null;
  const endpoint = typeof meta.endpoint === "string" ? meta.endpoint : null;
  const base = {
    actor,
    time: item.createdAt ? formatActivityTime(item.createdAt) : "",
  };

  if (item.type === "PUBLIC_REPLY_SENT" || item.type === "COMMENT_REPLY_SENT") {
    return {
      ...base,
      title: "Public reply sent",
      subtitle: `Comment reply${commentSuffix}${replyId ? ` · Meta reply ${truncateId(replyId)}` : ""}`,
      tone: "green",
      kind: "sent",
    };
  }

  if (item.type === "DM_SKIPPED") {
    return {
      ...base,
      title: "Private reply skipped",
      subtitle: `External tool mode${commentSuffix}`,
      tone: "amber",
      kind: "skipped",
    };
  }

  if ((item.type === "DM_FAILED" || item.type === "DM_FAILED_FAILED") && isDmAccessDisabled(activityText(item))) {
    return {
      ...base,
      title: "Instagram message access is off",
      subtitle: `${DM_ACCESS_DISABLED_HELPER}${commentSuffix}`,
      tone: "red",
      kind: "failed",
    };
  }

  if ((item.type === "DM_FAILED" || item.type === "DM_FAILED_FAILED") && isMetaCapabilityMissing(activityText(item))) {
    return {
      ...base,
      title: META_CAPABILITY_PENDING_LABEL,
      subtitle: `${META_CAPABILITY_PENDING_HELPER}${commentSuffix}`,
      tone: "green",
      kind: "activity",
    };
  }

  if (item.type === "KEYWORD_MATCHED") {
    return {
      ...base,
      title: "Trigger matched",
      subtitle: item.keyword ? `Keyword "${item.keyword}" → post comments` : "Comment trigger matched",
      tone: "purple",
      kind: "activity",
    };
  }

  if (
    item.type === "COMMENT_RECEIVED" ||
    item.type === "REAL_COMMENT_EVENT" ||
    item.type === "WEBHOOK_RECEIVED" ||
    item.type === "COMMENT_WEBHOOK_RECEIVED"
  ) {
    return {
      ...base,
      title: "Comment received",
      subtitle: commentSuffix ? commentSuffix.replace(/^ → /, "") : "Instagram comment webhook",
      tone: "blue",
      kind: "activity",
    };
  }

  if (item.type === "SELF_COMMENT_SKIPPED") {
    return {
      ...base,
      title: "Ignored self-comment",
      subtitle: "Connected account comment ignored",
      tone: "amber",
      kind: "skipped",
    };
  }

  if (display.label === "Duplicate webhook ignored") {
    return {
      ...base,
      title: "Duplicate ignored",
      subtitle: "Repeated webhook delivery ignored",
      tone: "slate",
      kind: "skipped",
    };
  }

  return {
    ...base,
    title: display.label,
    subtitle: `${display.detail ?? endpoint ?? "Automation activity"}${commentSuffix}`,
    tone: display.tone === "slate" ? "slate" : display.tone,
    kind: display.technical
      ? "technical"
      : display.tone === "red"
      ? "failed"
      : display.tone === "amber"
      ? "skipped"
      : "activity",
  };
}

export function groupCampaignActivity(
  items: ActivityInput[],
  options: { privateDmEnabled?: boolean; limit?: number } = {}
): GroupedActivity[] {
  const groups = new Map<string, ActivityInput[]>();
  const sorted = [...items].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));

  for (const item of sorted) {
    const key = groupKey(item);
    const current = groups.get(key) ?? [];
    current.push({ ...item, privateDmEnabled: options.privateDmEnabled });
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([id, groupItems]) => buildGroupedActivity(id, groupItems, options.privateDmEnabled))
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
    .slice(0, options.limit ?? 20);
}

export function isAppReviewFriendlyActivity(item: GroupedActivity) {
  const text = `${item.title} ${item.subtitle} ${item.badge}`.toLowerCase();
  const blockedTerms = [
    "no trigger",
    "skipped",
    "failed",
    "blocked",
    "ignored",
    "duplicate",
    "capability",
    "private dm",
    "monthly reply limit",
    "loop guard",
  ];

  if (blockedTerms.some((term) => text.includes(term))) return false;
  return (
    item.steps.commentReceived ||
    item.steps.triggerMatched ||
    item.steps.publicReply === "sent" ||
    item.tone === "green" ||
    item.tone === "blue"
  );
}

export function filterAppReviewActivity(items: GroupedActivity[], limit = 20) {
  return items.filter(isAppReviewFriendlyActivity).slice(0, limit);
}

function buildGroupedActivity(id: string, items: ActivityInput[], privateDmEnabled?: boolean): GroupedActivity {
  const newest = [...items].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))[0];
  const metas = items.map((item) => metaRecord(item.meta));
  const commentId = firstString([...metas.map((meta) => meta.sourceCommentId), ...items.map((item) => item.commentId)]);
  const mediaId = firstString(items.map((item) => item.mediaId));
  const igUserId = firstString(items.map((item) => item.igUserId));
  const keyword = firstString(items.map((item) => item.keyword));
  const text = items.map(activityText).join(" ");
  const types = new Set(items.map((item) => item.type));
  const publicReplyCommentId = firstString(metas.map((meta) => meta.publicReplyCommentId));
  const endpoint = firstString(metas.map((meta) => meta.endpoint));
  const commenterUsername = firstString(metas.map((meta) => meta.commenterUsername));
  const replyTextPreview = firstString(metas.map((meta) => meta.replyTextPreview ?? meta.normalizedPublicReplyText));
  const capabilityWorkflow = isMetaCapabilityMissing(text);
  const dmAccessDisabled = isDmAccessDisabled(text);
  const error = dmAccessDisabled
    ? DM_ACCESS_DISABLED_HELPER
    : capabilityWorkflow
    ? META_CAPABILITY_PENDING_HELPER
    : firstString([
        ...items.map((item) => item.errorMessage),
        ...metas.map((meta) => meta.error),
      ].map((value) => (typeof value === "string" ? formatLogError(value) : null)));

  const steps = {
    commentReceived:
      types.has("COMMENT_RECEIVED") ||
      types.has("REAL_COMMENT_EVENT") ||
      types.has("WEBHOOK_RECEIVED") ||
      types.has("COMMENT_WEBHOOK_RECEIVED"),
    triggerMatched: types.has("KEYWORD_MATCHED"),
    publicReply: null as GroupedActivity["steps"]["publicReply"],
    privateDm: null as GroupedActivity["steps"]["privateDm"],
    selfCommentSkipped: types.has("SELF_COMMENT_SKIPPED"),
    duplicateSkipped: types.has("DUPLICATE_SKIPPED") || text.includes("duplicate_comment_webhook"),
    usageLimitReached: text.includes("static_reply_limit_reached"),
    loopGuard: types.has("LOOP_GUARD_TRIGGERED") || types.has("LOOP_GUARD_PAUSED_CAMPAIGN"),
  };

  if (types.has("PUBLIC_REPLY_SENT") || types.has("COMMENT_REPLY_SENT")) steps.publicReply = "sent";
  if (types.has("PUBLIC_REPLY_FAILED") || types.has("COMMENT_REPLY_FAILED")) steps.publicReply = "failed";
  if (text.includes("public_reply_disabled")) steps.publicReply = "off";
  if (types.has("COMMENT_SKIPPED") && steps.publicReply === null) steps.publicReply = "skipped";

  if (types.has("DM_SENT")) steps.privateDm = "sent";
  if (types.has("DM_SKIPPED")) steps.privateDm = text.includes("external_dm_tool_enabled") ? "off" : "skipped";
  if (types.has("DM_FAILED") || types.has("DM_FAILED_FAILED")) steps.privateDm = "failed";

  const base: Omit<GroupedActivity, "title" | "subtitle" | "tone" | "badge"> = {
    id,
    commentId,
    mediaId,
    igUserId,
    keyword,
    createdAt: newest?.createdAt ?? new Date(0).toISOString(),
    actorLabel: actorLabel(commenterUsername, igUserId),
    commentText: firstString(metas.map((meta) => meta.commentText)),
    steps,
    details: {
      ...(commentId ? { commentId } : {}),
      ...(mediaId ? { mediaId } : {}),
      ...(igUserId ? { igUserId } : {}),
      ...(commenterUsername ? { commenterUsername } : {}),
      ...(keyword ? { keyword } : {}),
      ...(endpoint ? { endpoint } : {}),
      ...(publicReplyCommentId ? { publicReplyCommentId } : {}),
      ...(replyTextPreview ? { replyTextPreview } : {}),
      ...(publicReplyCommentId
        ? {
            visibilityHelper:
              "Meta confirmed the public reply. If it is not visible, check the exact post, collapsed replies, or Instagram filtering.",
          }
        : steps.publicReply === "failed"
        ? { visibilityHelper: "Meta did not confirm public reply creation." }
        : {}),
      ...(error ? { error } : {}),
      technicalTypes: Array.from(types),
    },
  };

  if (steps.selfCommentSkipped) {
    return completeGroup(base, "Ignored self-comment from connected account", "Connected account comment ignored.", "amber", "SKIPPED");
  }
  if (steps.duplicateSkipped) {
    return completeGroup(base, "Duplicate webhook ignored", "Repeated webhook delivery ignored.", "slate", "SKIPPED");
  }
  if (steps.loopGuard) {
    return completeGroup(base, "Loop guard protected this automation", "AP3K blocked a possible self-reply loop.", "amber", "PROTECTED");
  }
  if (steps.usageLimitReached) {
    return completeGroup(base, "Monthly reply limit reached", "No public reply or private reply was sent.", "amber", "LIMIT");
  }
  if (dmAccessDisabled) {
    return completeGroup(base, "Instagram message access is off", DM_ACCESS_DISABLED_HELPER, "red", "ACTION NEEDED");
  }
  if (privateDmEnabled === false && capabilityWorkflow) {
    return completeGroup(base, "Older private reply workflow record", "Private reply is currently off; this is an older event.", "slate", "OLD");
  }
  if (steps.publicReply === "sent" && (steps.privateDm === "skipped" || steps.privateDm === "off")) {
    return completeGroup(base, "Comment handled successfully", "Public reply sent · private reply skipped", "green", "SENT");
  }
  if (steps.publicReply === "sent" && capabilityWorkflow) {
    return completeGroup(base, "Comment handled", "Public reply sent · private reply workflow recorded", "green", "HANDLED");
  }
  if (steps.publicReply === "sent") {
    return completeGroup(base, "Public reply sent", keyword ? `Trigger matched "${keyword}"` : "Trigger matched", "green", "SENT");
  }
  if (steps.publicReply === "off" && steps.privateDm === "off") {
    return completeGroup(base, "Comment matched · no outbound action", "Public reply and private reply are disabled.", "slate", "SKIPPED");
  }
  if (steps.publicReply === "failed") {
    return completeGroup(base, "Public reply failed", error ?? "Meta did not confirm the public reply.", "red", "FAILED");
  }
  if (steps.privateDm === "sent") {
    return completeGroup(base, "Private reply sent", keyword ? `Trigger matched "${keyword}"` : "Trigger matched", "green", "SENT");
  }
  if (capabilityWorkflow) {
    return completeGroup(base, "Private reply workflow recorded", META_CAPABILITY_PENDING_HELPER, "green", "RECORDED");
  }
  if (steps.privateDm === "failed") {
    return completeGroup(base, "Private reply could not be completed", error ?? "The private reply was not confirmed.", "amber", "REVIEW");
  }
  if (steps.triggerMatched) {
    return completeGroup(base, "Comment matched · no outbound action", "No public reply or private reply was sent.", "slate", "SKIPPED");
  }
  return completeGroup(base, "Comment received · no trigger match", "No configured trigger matched this comment.", "slate", "NO MATCH");
}

export function formatLogError(message: string) {
  if (message.includes("static_reply_limit_reached")) {
    return "Skipped — monthly public reply limit reached.";
  }
  if (isDmAccessDisabled(message)) {
    return DM_ACCESS_DISABLED_HELPER;
  }
  if (isMetaCapabilityMissing(message)) {
    return META_CAPABILITY_PENDING_HELPER;
  }
  return message;
}

export function isDmAccessDisabled(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("dm_access_disabled") ||
    text.includes("disabled access to instagram direct") ||
    text.includes("2534041")
  );
}

export function isMetaCapabilityMissing(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("dm_capability_missing") ||
    text.includes("code=3") ||
    text.includes("capability") ||
    text.includes("permission")
  );
}

export function isWeakPublicReply(text: string) {
  const meaningful = Array.from(text).filter((char) => /[A-Za-z0-9\u0600-\u06FF]/.test(char)).join("");
  return meaningful.length < 6;
}

function friendlyActivityType(type: string) {
  const friendly: Record<string, string> = {
    WEBHOOK_RECEIVED: "Comment received",
    REAL_COMMENT_EVENT: "Comment received",
    COMMENT_RECEIVED: "Comment received",
    KEYWORD_MATCHED: "Trigger matched",
    ANY_COMMENT: "Any comment trigger matched",
    PUBLIC_REPLY_SENT: "Public reply sent",
    PUBLIC_REPLY_FAILED: "Public reply failed",
    DM_SENT: "Private reply sent",
    DM_SKIPPED: "Private reply skipped",
    DM_FAILED: "Private reply failed",
    COMMENT_SKIPPED: "Comment skipped",
    NO_MATCH: "No trigger match",
    DM_FAILED_FAILED: "Private reply failed",
    COMMENT_REPLY_SENT: "Public reply sent",
    COMMENT_REPLY_FAILED: "Public reply failed",
  };
  if (friendly[type]) return friendly[type];
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function activityTone(type: string, status?: string) {
  if (type.includes("SENT") || type.includes("MATCHED") || status === "PROCESSED") return "green";
  if (type.includes("WEBHOOK") || type === "REAL_COMMENT_EVENT" || status === "PROCESSING" || status === "RECEIVED") return "blue";
  if (type.includes("SKIPPED")) return "amber";
  return "slate";
}

function isTechnicalActivity(type: string, source?: string | null) {
  return type === "REAL_COMMENT_EVENT" || type === "WEBHOOK_RECEIVED" || source === "webhook";
}

function activityText(item: ActivityInput) {
  return [
    item.type,
    item.status,
    item.errorMessage,
    typeof item.meta === "string" ? item.meta : JSON.stringify(item.meta ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function metaRecord(meta: unknown): Record<string, unknown> {
  return meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
}

function groupKey(item: ActivityInput) {
  const meta = metaRecord(item.meta);
  const sourceCommentId = typeof meta.sourceCommentId === "string" ? meta.sourceCommentId : null;
  if (sourceCommentId) return `comment:${sourceCommentId}`;
  if (item.commentId) return `comment:${item.commentId}`;
  const timeBucket = Math.floor(toTime(item.createdAt) / 5000);
  if (item.mediaId && item.igUserId) return `near:${item.mediaId}:${item.igUserId}:${timeBucket}`;
  return `item:${item.id ?? item.type}:${timeBucket}`;
}

function completeGroup(
  base: Omit<GroupedActivity, "title" | "subtitle" | "tone" | "badge">,
  title: string,
  subtitle: string,
  tone: GroupedActivity["tone"],
  badge: string
): GroupedActivity {
  return { ...base, title, subtitle, tone, badge };
}

function firstString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function toTime(value?: Date | string | null) {
  if (!value) return 0;
  return new Date(value).getTime();
}

function truncateId(value: string) {
  return value.length > 12 ? `${value.slice(0, 12)}...` : value;
}

export function shortInstagramId(value: string) {
  return value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value;
}

function actorLabel(username: string | null, igUserId?: string | null) {
  if (username) return `@${username.replace(/^@/, "")}`;
  if (igUserId) return `Instagram user ${shortInstagramId(igUserId)}`;
  return null;
}

function formatActivityTime(value: Date | string) {
  return new Date(value).toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
