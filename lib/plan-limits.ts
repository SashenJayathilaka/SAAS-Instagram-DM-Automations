import type { SUBSCRIPTION_PLAN } from "@prisma/client";

// AGENCY remains as a non-persisted compatibility alias for older code/tests.
// Customer subscriptions are persisted as FREE, PRO, or BUSINESS.
export type ProductPlan = SUBSCRIPTION_PLAN | "AGENCY";
export type PlanLimit = number | "unlimited";

export type PlanLimits = {
  label: "Free" | "Pro" | "Business";
  activeCampaigns: PlanLimit;
  staticRepliesPerMonth: PlanLimit;
  aiRepliesPerMonth: PlanLimit;
  connectedInstagramAccounts: PlanLimit;
  publicReplyFallback: boolean;
  exportLeads: boolean;
  teamAccess: boolean;
};

export type UsageMetric = {
  used: number;
  limit: PlanLimit;
  remaining: number | null;
  percent: number;
  blocked: boolean;
};

export type UsageSummary = {
  plan: ProductPlan;
  planLabel: string;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  enforcementStart: Date;
  staticReplies: UsageMetric;
  aiReplies: UsageMetric;
  activeCampaigns: UsageMetric;
  connectedAccounts: UsageMetric;
};

export const UNLIMITED_LIMIT = 999_999;

const BUSINESS_LIMITS: PlanLimits = {
  label: "Business",
  activeCampaigns: "unlimited",
  staticRepliesPerMonth: 20_000,
  aiRepliesPerMonth: 2_000,
  connectedInstagramAccounts: 6,
  publicReplyFallback: true,
  exportLeads: true,
  teamAccess: false,
};

export const PLAN_LIMITS: Record<ProductPlan, PlanLimits> = {
  FREE: {
    label: "Free",
    activeCampaigns: 5,
    staticRepliesPerMonth: 500,
    aiRepliesPerMonth: 0,
    connectedInstagramAccounts: 1,
    publicReplyFallback: true,
    exportLeads: false,
    teamAccess: false,
  },
  PRO: {
    label: "Pro",
    activeCampaigns: "unlimited",
    staticRepliesPerMonth: 5_000,
    aiRepliesPerMonth: 500,
    connectedInstagramAccounts: 3,
    publicReplyFallback: true,
    exportLeads: true,
    teamAccess: false,
  },
  BUSINESS: BUSINESS_LIMITS,
  AGENCY: BUSINESS_LIMITS,
};

export function getPlanLimits(plan?: ProductPlan | null) {
  return PLAN_LIMITS[plan ?? "FREE"] ?? PLAN_LIMITS.FREE;
}

export function getPlanLabel(plan?: ProductPlan | null) {
  return getPlanLimits(plan).label;
}

export function isUnlimited(limit: PlanLimit): limit is "unlimited" {
  return limit === "unlimited" || limit >= UNLIMITED_LIMIT;
}

export function getUsagePercent(used: number, limit: PlanLimit) {
  if (isUnlimited(limit)) return 0;
  if (limit <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function makeUsageMetric(used: number, limit: PlanLimit): UsageMetric {
  if (isUnlimited(limit)) {
    return { used, limit, remaining: null, percent: 0, blocked: false };
  }

  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    percent: getUsagePercent(used, limit),
    blocked: used >= limit,
  };
}

export function getCurrentUsagePeriod(date = new Date()) {
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  const enforcementStart = getUsageEnforcementStart(monthStart);

  return {
    monthStart,
    monthEnd,
    enforcementStart: enforcementStart > monthStart ? enforcementStart : monthStart,
    periodLabel: new Intl.DateTimeFormat("en", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date),
  };
}

export function getUsageEnforcementStart(monthStart: Date) {
  const raw = process.env.USAGE_LIMITS_ENFORCED_FROM;
  if (!raw) return monthStart;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return monthStart;
  return parsed;
}

export function usageTone(percent: number, blocked: boolean): "green" | "amber" | "red" {
  if (blocked || percent > 90) return "red";
  if (percent >= 70) return "amber";
  return "green";
}

export function formatUsageMetricValue(metric: Pick<UsageMetric, "used" | "limit">) {
  return `${metric.used.toLocaleString()} / ${isUnlimited(metric.limit) ? "Unlimited" : metric.limit.toLocaleString()}`;
}

export function formatCampaignLimitFeature(limit: PlanLimit) {
  return isUnlimited(limit) ? "Unlimited automations" : `Up to ${limit.toLocaleString()} active automations`;
}

export function formatConnectedAccountsHelper(_planLabel: string, _metric: Pick<UsageMetric, "limit">) {
  return "Monthly reply and AI allowances are shared across your subscription.";
}
