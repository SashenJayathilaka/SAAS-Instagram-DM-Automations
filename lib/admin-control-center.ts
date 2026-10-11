export type AdminIssueInput = {
  lastPostRaw?: unknown;
  signatureFailures24h: number;
  dmCapabilityMissing: boolean;
  tokenMissingFailures24h: number;
  dmFailed24h: number;
  activeCampaigns: number;
  loopGuardTriggered24h?: number;
  selfCommentsSkipped24h?: number;
  duplicateCommentsSkipped24h?: number;
};

export type AdminActionItem = {
  id: string;
  label: string;
  targetLabel?: string;
  confirmation?: string;
  reasonRequired?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

export type AdminConfirmState = {
  reason?: string;
  confirmation?: string;
  expectedConfirmation?: string;
  reasonRequired?: boolean;
};

const SENSITIVE_KEY_PATTERN =
  /(token|secret|authorization|client_secret|access_token|page_access_token|stripe_secret|webhook_secret)/i;

export function sanitizeAdminPayload(value: unknown): unknown {
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeAdminPayload(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeAdminPayload(item),
    ])
  );
}

export function adminEnvironmentLabel() {
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return "Production";
  }
  if (process.env.VERCEL_ENV === "preview") return "Preview";
  return "Development";
}

export function stripeCustomerDashboardUrl(customerId?: string | null) {
  if (!customerId) return null;
  return `https://dashboard.stripe.com/customers/${encodeURIComponent(customerId)}`;
}

export function formatAdminDate(value?: Date | string | null) {
  if (!value) return "Never";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString();
}

export function classifyDeliveryError(error?: string | null) {
  const text = error ?? "";
  if (text.includes("self_comment_author")) {
    return {
      label: "Ignored self-comment",
      detail: "Comment came from the connected Instagram account.",
      tone: "amber" as const,
    };
  }
  if (text.includes("duplicate_comment_webhook")) {
    return {
      label: "Ignored duplicate webhook",
      detail: "Comment ID was already processed.",
      tone: "amber" as const,
    };
  }
  if (text.includes("automation_rate_limit_loop_guard")) {
    return {
      label: "Loop guard skipped",
      detail: "Reply volume crossed the emergency loop threshold.",
      tone: "red" as const,
    };
  }
  if (text.includes("static_reply_limit_reached")) {
    return {
      label: "Skipped — monthly reply limit reached",
      detail: "Plan limit blocked public reply/private DM before any Meta API call.",
      tone: "amber" as const,
    };
  }
  if (
    text.includes("dm_access_disabled") ||
    text.toLowerCase().includes("disabled access to instagram direct") ||
    text.includes("2534041")
  ) {
    return {
      label: "Instagram message access disabled",
      detail: "Enable message access for connected tools in the Instagram account's Message controls, then test with a new comment.",
      tone: "red" as const,
    };
  }
  if (text.includes("dm_capability_missing") || text.includes("code=3")) {
    return {
      label: "Meta capability missing",
      detail: "Requires instagram_manage_messages approval.",
      tone: "red" as const,
    };
  }
  if (text.includes("token_missing")) {
    return {
      label: "Reconnect account",
      detail: "Page token missing or unavailable.",
      tone: "amber" as const,
    };
  }
  if (text.includes("external_dm_tool_enabled")) {
    return {
      label: "Skipped — external DM tool enabled",
      detail: "Campaign is configured to let another tool handle private DMs.",
      tone: "amber" as const,
    };
  }
  if (text.includes("missing_required_dm_fields")) {
    return {
      label: "DM webhook received",
      detail: "Instagram DM webhook received, but it is not a comment event. Comment automations require a comment webhook containing comment ID, media ID, and text.",
      tone: "amber" as const,
    };
  }
  if (!text) {
    return { label: "No error", detail: "No delivery error recorded.", tone: "green" as const };
  }
  return { label: "Meta/API error", detail: text, tone: "amber" as const };
}

export function summarizeAdminError(error?: string | null) {
  if (!error) return "None";
  const classified = classifyDeliveryError(error);
  if (error.includes("subscribed_fields")) return "Webhook field mismatch";
  if (error.includes("code=190") || error.toLowerCase().includes("token")) return "Token expired or invalid";
  if (
    error.includes("dm_access_disabled") ||
    error.toLowerCase().includes("disabled access to instagram direct") ||
    error.includes("2534041")
  ) return "Instagram message access disabled";
  if (error.includes("dm_capability_missing") || error.includes("code=3")) return "DM capability pending";
  if (error.length > 160) return classified.label;
  return classified.label === "Meta/API error" ? error : classified.label;
}

export function shortenAdminId(value?: string | null) {
  if (!value) return "";
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function disabledAdminActionReason(action: string) {
  const reasons: Record<string, string> = {
    deleteUserData: "Requires export, retention, and deletion workflow.",
    deleteIntegration: "Integrations are soft-disconnected, not deleted.",
    deleteCampaign: "Campaigns are archived, not hard-deleted.",
    cancelSubscription: "Stripe cancellation is disabled until a refresh/cancel helper is implemented and tested.",
    planOverride: "Plan override is disabled until an internal override model exists.",
    refreshSubscription: "Stripe refresh is disabled until a safe refresh helper exists.",
  };
  return reasons[action] ?? "Action is not available.";
}

export function isAdminConfirmReady(state: AdminConfirmState) {
  const reasonOk = state.reasonRequired === false || Boolean(state.reason?.trim());
  const confirmationOk = !state.expectedConfirmation || state.confirmation?.trim() === state.expectedConfirmation;
  return reasonOk && confirmationOk;
}

export function adminActionMenuConfig(scope: "user" | "integration" | "campaign" | "subscription", state: Record<string, unknown> = {}): AdminActionItem[] {
  if (scope === "user") {
    const suspended = state.status === "SUSPENDED";
    return [
      suspended
        ? { id: "unsuspend", label: "Unsuspend user", confirmation: "UNSUSPEND" }
        : { id: "suspend", label: "Suspend user", confirmation: "SUSPEND" },
      { id: "delete-data", label: "Delete data unavailable", disabled: true, disabledReason: disabledAdminActionReason("deleteUserData") },
    ];
  }
  if (scope === "integration") {
    return [
      { id: "reconnect", label: "Mark reconnect required", confirmation: "RECONNECT" },
      { id: "resubscribe", label: "Resubscribe webhooks" },
      { id: "disconnect", label: "Disconnect integration", confirmation: "DISCONNECT", disabled: state.status === "DISCONNECTED", disabledReason: "Already disconnected." },
      { id: "delete", label: "Delete unavailable", disabled: true, disabledReason: disabledAdminActionReason("deleteIntegration") },
    ];
  }
  if (scope === "campaign") {
    const active = Boolean(state.active);
    const archived = Boolean(state.archivedAt);
    return [
      { id: active ? "pause" : "activate", label: active ? "Pause campaign" : "Activate campaign", confirmation: active ? "PAUSE" : "ACTIVATE", disabled: archived, disabledReason: "Campaign is archived." },
      { id: "duplicate", label: "Duplicate campaign", confirmation: "DUPLICATE", disabled: archived, disabledReason: "Campaign is archived." },
      { id: "archive", label: "Archive campaign", confirmation: "ARCHIVE", disabled: archived, disabledReason: "Already archived." },
      { id: "delete", label: "Delete unavailable", disabled: true, disabledReason: disabledAdminActionReason("deleteCampaign") },
    ];
  }
  return [
    { id: "refresh", label: "Refresh subscription unavailable", disabled: true, disabledReason: disabledAdminActionReason("refreshSubscription") },
    { id: "cancel", label: "Cancel unavailable", disabled: true, disabledReason: disabledAdminActionReason("cancelSubscription") },
    { id: "override", label: "Plan override unavailable", disabled: true, disabledReason: disabledAdminActionReason("planOverride") },
  ];
}

export function adminTableColumns(section: "integrations" | "campaigns" | "subscriptions" | "messages") {
  const columns = {
    integrations: ["Page / IG account", "Status", "Token", "Webhook", "Last event", "Last error summary", "Actions"],
    campaigns: ["Owner", "Campaign", "Status", "Trigger", "Post scope", "Replies", "Private DM", "Activity", "Created", "Actions"],
    subscriptions: ["User", "Plan", "Usage", "Campaigns", "Accounts", "Stripe", "Status", "Updated", "Actions"],
    messages: ["Time", "Owner / Campaign", "Type / Status", "Actor / Comment", "Summary", "Actions"],
  } satisfies Record<string, string[]>;
  return columns[section];
}

export function adminDangerZoneStatus() {
  return {
    auditLog: "Enabled",
    typedConfirmations: "Enabled",
    softDestructiveActions: "Enabled",
    hardDeletes: "Disabled",
    subscriptionCancel: "Disabled",
  } as const;
}

export function getTopAdminIssue(input: AdminIssueInput) {
  if (!input.lastPostRaw) {
    return {
      label: "No real webhook delivered yet",
      detail:
        "Meta has not delivered a recent POST. In Development mode, connected account and commenter must be accepted app testers/admins/developers.",
      tone: "red" as const,
    };
  }
  if ((input.loopGuardTriggered24h ?? 0) > 0) {
    return {
      label: "Loop guard triggered",
      detail: `${input.loopGuardTriggered24h} loop guard event(s) in the last 24h. Pause Any Comment campaigns until review.`,
      tone: "red" as const,
    };
  }
  if ((input.selfCommentsSkipped24h ?? 0) > 0 || (input.duplicateCommentsSkipped24h ?? 0) > 0) {
    return {
      label: "Comment loop protection active",
      detail: `${input.selfCommentsSkipped24h ?? 0} self-comment and ${input.duplicateCommentsSkipped24h ?? 0} duplicate webhook event(s) skipped in the last 24h.`,
      tone: "amber" as const,
    };
  }
  if (input.signatureFailures24h > 0) {
    return {
      label: "Webhook signature failures",
      detail: `${input.signatureFailures24h} signature failure(s) in the last 24h.`,
      tone: "red" as const,
    };
  }
  if (input.dmCapabilityMissing) {
    return {
      label: "Private DM blocked by Meta",
      detail: "Meta is returning code=3. Public replies can still work while instagram_manage_messages is pending.",
      tone: "red" as const,
    };
  }
  if (input.tokenMissingFailures24h > 0) {
    return {
      label: "Reconnect required",
      detail: `${input.tokenMissingFailures24h} token_missing failure(s) in the last 24h.`,
      tone: "amber" as const,
    };
  }
  if (input.dmFailed24h > 5) {
    return {
      label: "Elevated DM failures",
      detail: `${input.dmFailed24h} private DM failure(s) in the last 24h.`,
      tone: "amber" as const,
    };
  }
  if (input.activeCampaigns === 0) {
    return {
      label: "No active campaigns",
      detail: "Users have not activated any campaign yet.",
      tone: "amber" as const,
    };
  }
  return {
    label: "No active issue",
    detail: "Core delivery signals are healthy based on recent records.",
    tone: "green" as const,
  };
}
