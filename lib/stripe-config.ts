import type { SUBSCRIPTION_PLAN } from "@prisma/client";

export type StripePlan = "PRO" | "BUSINESS";
export type StripeBillingInterval = "month" | "year";

export const STRIPE_PRICE_LOOKUP_KEYS: Record<
  StripePlan,
  Record<StripeBillingInterval, string>
> = {
  PRO: {
    month: "ap3k_pro_month",
    year: "ap3k_pro_year",
  },
  BUSINESS: {
    month: "ap3k_business_month",
    year: "ap3k_business_year",
  },
};

export function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_CLIENT_SECRET;
}

export function parseStripePlan(value: string | string[] | undefined): StripePlan {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw?.trim().toUpperCase();

  // Keep legacy names working for old links and metadata.
  if (normalized === "BUSINESS" || normalized === "AGENCY") return "BUSINESS";
  return "PRO";
}

export function parseStripeBillingInterval(
  value: string | string[] | undefined
): StripeBillingInterval {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw?.trim().toLowerCase();
  return normalized === "year" || normalized === "annual" || normalized === "yearly"
    ? "year"
    : "month";
}

export function getStripePriceLookupKey(
  plan: StripePlan,
  interval: StripeBillingInterval
) {
  return STRIPE_PRICE_LOOKUP_KEYS[plan][interval];
}

export function getStripePriceIdFromEnv(
  plan: StripePlan,
  interval: StripeBillingInterval
) {
  if (plan === "BUSINESS") {
    if (interval === "year") return process.env.STRIPE_PRICE_ID_BUSINESS_ANNUAL;
    return (
      process.env.STRIPE_PRICE_ID_BUSINESS_MONTHLY ??
      process.env.STRIPE_PRICE_ID_AGENCY
    );
  }

  if (interval === "year") return process.env.STRIPE_PRICE_ID_PRO_ANNUAL;
  return (
    process.env.STRIPE_PRICE_ID_PRO_MONTHLY ??
    process.env.STRIPE_PRICE_ID_CREATOR ??
    process.env.STRIPE_SUBSCRIPTION_PRICE_ID
  );
}

// Backwards-compatible helper for older imports. New checkout code should call
// resolveStripePriceId so it can fall back to Stripe lookup keys.
export function getStripePriceId(
  plan: StripePlan,
  interval: StripeBillingInterval = "month"
) {
  return getStripePriceIdFromEnv(plan, interval);
}

export function stripePlanToDatabasePlan(plan: StripePlan): SUBSCRIPTION_PLAN {
  return plan === "BUSINESS" ? "BUSINESS" : "PRO";
}

export function inferActiveDatabasePlan(input: {
  metadataPlan?: string | null;
  lookupKey?: string | null;
  priceId?: string | null;
}): SUBSCRIPTION_PLAN {
  // A known current-catalog price is the strongest source of truth. This lets
  // plan changes in Stripe override stale metadata on the subscription.
  if (input.lookupKey === STRIPE_PRICE_LOOKUP_KEYS.BUSINESS.month) return "BUSINESS";
  if (input.lookupKey === STRIPE_PRICE_LOOKUP_KEYS.BUSINESS.year) return "BUSINESS";
  if (input.lookupKey === STRIPE_PRICE_LOOKUP_KEYS.PRO.month) return "PRO";
  if (input.lookupKey === STRIPE_PRICE_LOOKUP_KEYS.PRO.year) return "PRO";

  const businessIds = [
    process.env.STRIPE_PRICE_ID_BUSINESS_MONTHLY,
    process.env.STRIPE_PRICE_ID_BUSINESS_ANNUAL,
  ].filter(Boolean);
  if (input.priceId && businessIds.includes(input.priceId)) return "BUSINESS";

  const proIds = [
    process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
  ].filter(Boolean);
  if (input.priceId && proIds.includes(input.priceId)) return "PRO";

  // Legacy sessions/subscriptions may have no lookup key. In that case use the
  // explicit plan metadata written by AP3K checkout before considering old IDs.
  const metadata = input.metadataPlan?.trim().toUpperCase();
  if (metadata === "BUSINESS" || metadata === "AGENCY") return "BUSINESS";
  if (metadata === "PRO" || metadata === "CREATOR") return "PRO";

  const legacyBusinessIds = [process.env.STRIPE_PRICE_ID_AGENCY].filter(Boolean);
  if (input.priceId && legacyBusinessIds.includes(input.priceId)) return "BUSINESS";

  const legacyProIds = [
    process.env.STRIPE_PRICE_ID_CREATOR,
    process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
  ].filter(Boolean);
  if (input.priceId && legacyProIds.includes(input.priceId)) return "PRO";

  // Preserve historical paid customers whose old Stripe prices predate the
  // explicit AP3K catalog. Never silently upgrade an unknown paid price.
  return "PRO";
}
