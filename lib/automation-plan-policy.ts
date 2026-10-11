import { getPlanLimits, isUnlimited, type ProductPlan } from "@/lib/plan-limits";

export const PLAN_PAUSE_PREFIX = "Paused after a plan change: ";
export const PLAN_PAUSE_MESSAGES = {
  account: `${PLAN_PAUSE_PREFIX}this Instagram account is outside your plan's account allowance. Upgrade before reactivating.`,
  features: `${PLAN_PAUSE_PREFIX}this automation uses paid features. Upgrade or remove those features before reactivating.`,
  limit: `${PLAN_PAUSE_PREFIX}your active automation allowance was exceeded. Pause another automation, then activate this one, or upgrade.`,
} as const;

export type PlanAutomation = {
  id: string;
  integration?: { planLocked?: boolean } | null;
  followGateRequired?: boolean;
  triggerMode?: string;
  storyConfig?: unknown;
  listener?: {
    listener?: string;
    aiReplyEnabled?: boolean;
    aiDmReplyEnabled?: boolean;
    emailCaptureEnabled?: boolean;
    phoneCaptureEnabled?: boolean;
    followUpEnabled?: boolean;
    flowDefinition?: unknown;
  } | null;
};

export function usesPaidAutomationFeatures(automation: PlanAutomation) {
  const listener = automation.listener;
  const story = automation.storyConfig as { scope?: string } | null;
  return Boolean(
    automation.followGateRequired || automation.triggerMode === "INTENT_MATCH" ||
    story?.scope === "NEXT" || listener?.listener === "SMARTAI" ||
    listener?.aiReplyEnabled || listener?.aiDmReplyEnabled ||
    listener?.emailCaptureEnabled || listener?.phoneCaptureEnabled ||
    listener?.followUpEnabled || listener?.flowDefinition
  );
}

/** Rows must be ordered by createdAt, id; never select based on webhook timing. */
export function automationsToPause(rows: PlanAutomation[], plan: ProductPlan) {
  const limit = getPlanLimits(plan).activeCampaigns;
  let kept = 0;
  return rows.flatMap(row => {
    const reason = row.integration?.planLocked ? "account"
      : plan === "FREE" && usesPaidAutomationFeatures(row) ? "features"
      : !isUnlimited(limit) && kept >= limit ? "limit" : null;
    if (!reason) { kept++; return []; }
    return [{ id: row.id, reason: reason as keyof typeof PLAN_PAUSE_MESSAGES }];
  });
}

export function planPauseMessage(automation: { active?: boolean; reviewReason?: string | null }) {
  return !automation.active && automation.reviewReason?.startsWith(PLAN_PAUSE_PREFIX)
    ? automation.reviewReason : null;
}
