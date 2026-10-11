import { stripe } from "@/lib/stripe";
import {
  getStripePriceIdFromEnv,
  getStripePriceLookupKey,
  type StripeBillingInterval,
  type StripePlan,
} from "@/lib/stripe-config";
import { AP3K_PRICING } from "@/lib/billing-plans";

function expectedPrice(plan: StripePlan, interval: StripeBillingInterval) {
  if (plan === "BUSINESS") return interval === "year" ? AP3K_PRICING.BUSINESS_ANNUAL : AP3K_PRICING.BUSINESS_MONTHLY;
  return interval === "year" ? AP3K_PRICING.PRO_ANNUAL : AP3K_PRICING.PRO_MONTHLY;
}

function assertConfiguredPrice(price: { active: boolean; currency: string; unit_amount: number | null; recurring?: { interval: string; interval_count?: number } | null }, plan: StripePlan, interval: StripeBillingInterval) {
  const expectedAmount = expectedPrice(plan, interval) * 100;
  if (!price.active || price.currency.toLowerCase() !== "usd" || price.unit_amount !== expectedAmount || price.recurring?.interval !== interval || (price.recurring.interval_count ?? 1) !== 1) {
    throw new Error(`Stripe ${plan.toLowerCase()} ${interval} price does not match the published AP3K catalog.`);
  }
}

function getExplicitNewCatalogPriceId(
  plan: StripePlan,
  interval: StripeBillingInterval
) {
  if (plan === "BUSINESS") {
    return interval === "year"
      ? process.env.STRIPE_PRICE_ID_BUSINESS_ANNUAL
      : process.env.STRIPE_PRICE_ID_BUSINESS_MONTHLY;
  }

  return interval === "year"
    ? process.env.STRIPE_PRICE_ID_PRO_ANNUAL
    : process.env.STRIPE_PRICE_ID_PRO_MONTHLY;
}

export async function resolveStripePriceId(
  plan: StripePlan,
  interval: StripeBillingInterval
) {
  // New catalog variables, when explicitly configured, are authoritative.
  const explicitNewCatalog = getExplicitNewCatalogPriceId(plan, interval);
  if (explicitNewCatalog) {
    const price = await stripe.prices.retrieve(explicitNewCatalog);
    assertConfiguredPrice(price, plan, interval);
    return explicitNewCatalog;
  }

  // Prefer stable lookup keys over legacy Creator/Agency environment variables.
  // This prevents old production price IDs from silently overriding the new
  // $15/$120 Pro and $25/$216 Business catalog.
  const lookupKey = getStripePriceLookupKey(plan, interval);
  const prices = await stripe.prices.list({
    active: true,
    lookup_keys: [lookupKey],
    limit: 1,
  });
  const lookupPrice = prices.data[0]?.id;
  if (lookupPrice) {
    assertConfiguredPrice(prices.data[0], plan, interval);
    return lookupPrice;
  }

  // Last-resort compatibility for older deployments before lookup keys existed.
  const legacyPriceId = getStripePriceIdFromEnv(plan, interval) ?? null;
  if (!legacyPriceId) return null;
  const legacyPrice = await stripe.prices.retrieve(legacyPriceId);
  assertConfiguredPrice(legacyPrice, plan, interval);
  return legacyPriceId;
}
