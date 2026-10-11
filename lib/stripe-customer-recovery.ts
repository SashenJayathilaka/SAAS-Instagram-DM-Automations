import type Stripe from "stripe";

type StripeCustomerRecoveryClient = Pick<Stripe, "customers" | "subscriptions" | "checkout">;

type RecoverStripeCustomerInput = {
  clerkId: string;
  email: string;
};

const MANAGEABLE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

function belongsToClerkUser(value: { metadata?: Stripe.Metadata | null }, clerkId: string) {
  return value.metadata?.clerkId === clerkId;
}

/**
 * Recovers a customer only when Stripe itself contains an AP3K ownership proof.
 * An email match alone is intentionally insufficient: checkout metadata or the
 * checkout client reference must also match the authenticated Clerk user.
 */
export async function recoverOwnedStripeCustomerId(
  stripeClient: StripeCustomerRecoveryClient,
  input: RecoverStripeCustomerInput
) {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.clerkId.trim()) return null;

  const customers = await stripeClient.customers.list({ email, limit: 100 });
  const candidates: Array<{ customerId: string; score: number; created: number }> = [];

  for (const customer of customers.data) {
    if (customer.deleted) continue;

    const [subscriptions, sessions] = await Promise.all([
      stripeClient.subscriptions.list({
        customer: customer.id,
        status: "all",
        limit: 100,
      }),
      stripeClient.checkout.sessions.list({
        customer: customer.id,
        limit: 100,
      }),
    ]);

    const subscriptionProof = subscriptions.data.some((subscription) =>
      belongsToClerkUser(subscription, input.clerkId)
    );
    const checkoutProof = sessions.data.some(
      (session) =>
        session.client_reference_id === input.clerkId ||
        belongsToClerkUser(session, input.clerkId)
    );

    if (!subscriptionProof && !checkoutProof) continue;

    const manageable = subscriptions.data.some((subscription) =>
      MANAGEABLE_SUBSCRIPTION_STATUSES.has(subscription.status)
    );
    candidates.push({
      customerId: customer.id,
      score: (manageable ? 10 : 0) + (subscriptionProof ? 2 : 0) + (checkoutProof ? 1 : 0),
      created: customer.created,
    });
  }

  candidates.sort((a, b) => b.score - a.score || b.created - a.created);
  return candidates[0]?.customerId ?? null;
}
