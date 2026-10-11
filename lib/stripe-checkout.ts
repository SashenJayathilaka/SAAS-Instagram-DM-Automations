import { AP3K_PRICING } from "@/lib/billing-plans";
import { createHash } from "crypto";
import type { StripeBillingInterval, StripePlan } from "@/lib/stripe-config";

export function stripeAutomaticTaxEnabled() {
  return process.env.STRIPE_AUTOMATIC_TAX_ENABLED === "true";
}

export function stripeCheckoutTaxOptions() {
  if (!stripeAutomaticTaxEnabled()) return {};
  return {
    automatic_tax: { enabled: true as const },
    billing_address_collection: "required" as const,
    tax_id_collection: { enabled: true as const },
  };
}

export function checkoutIdempotencyKey(input: {
  clerkId: string;
  plan: StripePlan;
  interval: StripeBillingInterval;
  now?: Date;
}) {
  const tenMinuteWindow = Math.floor((input.now ?? new Date()).getTime() / 600_000);
  const digest = createHash("sha256")
    .update(`${input.clerkId}:${input.plan}:${input.interval}:${JSON.stringify(AP3K_PRICING)}:${tenMinuteWindow}`)
    .digest("hex")
    .slice(0, 32);
  return `ap3k_checkout_${digest}`;
}
