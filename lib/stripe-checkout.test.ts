import { afterEach, describe, expect, it } from "vitest";
import {
  checkoutIdempotencyKey,
  stripeCheckoutTaxOptions,
} from "@/lib/stripe-checkout";

afterEach(() => {
  delete process.env.STRIPE_AUTOMATIC_TAX_ENABLED;
});

describe("Stripe Checkout hardening", () => {
  it("deduplicates checkout creation inside a ten-minute window", () => {
    const input = { clerkId: "user_123", plan: "PRO" as const, interval: "month" as const };
    const first = checkoutIdempotencyKey({ ...input, now: new Date("2026-09-12T01:01:00Z") });
    const repeated = checkoutIdempotencyKey({ ...input, now: new Date("2026-09-12T01:09:59Z") });
    const later = checkoutIdempotencyKey({ ...input, now: new Date("2026-09-12T01:10:00Z") });

    expect(first).toBe(repeated);
    expect(first).not.toBe(later);
    expect(first).toMatch(/^ap3k_checkout_[a-f0-9]{32}$/);
  });

  it("does not claim to collect tax until registration is explicitly enabled", () => {
    expect(stripeCheckoutTaxOptions()).toEqual({});
    process.env.STRIPE_AUTOMATIC_TAX_ENABLED = "true";
    expect(stripeCheckoutTaxOptions()).toEqual({
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
    });
  });
});
