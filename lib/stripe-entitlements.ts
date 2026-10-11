import type Stripe from "stripe";
import type { SUBSCRIPTION_PLAN } from "@prisma/client";
import { inferActiveDatabasePlan } from "./stripe-config";

/** Both webhook processing and checkout recovery must use current Stripe state. */
export function activePlanForSubscription(subscription: Stripe.Subscription): SUBSCRIPTION_PLAN {
  // Keep access during Stripe's existing payment recovery window.
  if (!["active", "trialing", "past_due"].includes(subscription.status)) return "FREE";
  const price = subscription.items?.data?.[0]?.price;
  return inferActiveDatabasePlan({
    metadataPlan: subscription.metadata?.plan,
    lookupKey: price?.lookup_key,
    priceId: price?.id,
  });
}
