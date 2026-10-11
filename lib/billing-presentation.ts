import {
  formatUsageMetricValue,
  isUnlimited,
  usageTone,
  type UsageMetric,
} from "@/lib/plan-limits";

export type BillingMetricKind = "default" | "accounts";

export function getBillingUsagePresentation(
  metric: UsageMetric,
  kind: BillingMetricKind = "default",
  helper?: string,
) {
  const accountLimitReached =
    kind === "accounts" &&
    !isUnlimited(metric.limit) &&
    metric.used >= metric.limit;
  const tone = accountLimitReached
    ? "amber"
    : usageTone(metric.percent, metric.blocked);
  const value =
    kind === "accounts" && !isUnlimited(metric.limit)
      ? `${metric.used.toLocaleString()} of ${metric.limit.toLocaleString()} accounts connected`
      : formatUsageMetricValue(metric);
  const description = accountLimitReached
    ? "Plan account limit reached"
    : (helper ??
      (metric.blocked
        ? "Limit reached"
        : isUnlimited(metric.limit)
          ? "Unlimited"
          : `${metric.remaining?.toLocaleString()} remaining`));

  return { tone, value, description };
}

const MANAGEABLE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
]);

export function isManageableSubscriptionStatus(status?: string | null) {
  return Boolean(status && MANAGEABLE_SUBSCRIPTION_STATUSES.has(status));
}

export function subscriptionStatusLabel(
  status: string,
  cancelAtPeriodEnd: boolean,
) {
  if (cancelAtPeriodEnd && (status === "active" || status === "trialing"))
    return "Cancels at period end";
  const labels: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Payment due",
    unpaid: "Payment due",
    paused: "Paused",
    canceled: "Canceled",
    incomplete: "Payment incomplete",
    incomplete_expired: "Expired",
  };
  return labels[status] ?? "Status unavailable";
}
