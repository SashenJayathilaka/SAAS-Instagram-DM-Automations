import { stripe } from "@/lib/stripe";

export type BillingSnapshot = {
  status: string;
  interval: "month" | "year" | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  lookupKey: string | null;
};

export type BillingLookup =
  | { state: "none"; snapshot: null }
  | { state: "subscription"; snapshot: BillingSnapshot }
  | { state: "unavailable"; snapshot: null; reason?: "customer_missing" };

import { isManageableSubscriptionStatus } from "./billing-presentation";
export { isManageableSubscriptionStatus } from "./billing-presentation";

export async function getBillingLookup(
  customerId?: string | null,
): Promise<BillingLookup> {
  if (!customerId) return { state: "none", snapshot: null };

  try {
    const result = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    const subscription =
      result.data.find((item) => isManageableSubscriptionStatus(item.status)) ??
      result.data[0];
    if (!subscription) return { state: "none", snapshot: null };

    const price = subscription.items.data[0]?.price;
    const interval = price?.recurring?.interval;
    const periodEnd = subscription.items.data[0]?.current_period_end ?? (subscription as any).current_period_end;

    return {
      state: "subscription",
      snapshot: {
        status: subscription.status,
        interval:
          interval === "year" ? "year" : interval === "month" ? "month" : null,
        renewsAt:
          typeof periodEnd === "number"
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        lookupKey: price?.lookup_key ?? null,
      },
    };
  } catch (error) {
    const failure = error as { code?: string; param?: string };
    const missingCustomer = failure?.code === "resource_missing" && failure?.param === "customer";
    console.error("[billing] could not load Stripe subscription snapshot", {
      customerIdPresent: Boolean(customerId),
      code: failure?.code ?? "unknown",
      customerMissing: missingCustomer,
    });
    return { state: "unavailable", snapshot: null, ...(missingCustomer ? { reason: "customer_missing" as const } : {}) };
  }
}

export async function getBillingSnapshot(customerId?: string | null) {
  const result = await getBillingLookup(customerId);
  return result.snapshot;
}
