"use server";

import { createUser, findUser, updateSubscription } from "@/actions/user/queries";
import { dashboardPath } from "@/lib/dashboard";
import { activePlanForSubscription } from "@/lib/stripe-entitlements";
import { stripe } from "@/lib/stripe";
import { applyPendingReferralRewards } from "@/lib/referral-program";
import { currentUser } from "@clerk/nextjs/server";

export async function verifyCheckoutSession(sessionId: string) {
  const user = await currentUser();
  if (!user) return { status: 401 as const, error: "not_authenticated" as const };
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9]{1,250}$/.test(sessionId)) {
    return { status: 400 as const, error: "invalid_session" as const };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const sessionOwner = session.metadata?.clerkId ?? session.client_reference_id;
    if (!sessionOwner) return { status: 400 as const, error: "missing_owner" as const };
    if (sessionOwner !== user.id) return { status: 403 as const, error: "user_mismatch" as const };
    if (session.status !== "complete") return { status: 400 as const, error: "session_incomplete" as const };
    if (!["paid", "no_payment_required"].includes(session.payment_status)) return { status: 400 as const, error: "payment_pending" as const };
    if (typeof session.customer !== "string") return { status: 400 as const, error: "missing_customer" as const };
    if (session.mode !== "subscription" || typeof session.subscription !== "string") return { status: 400 as const, error: "missing_subscription" as const };

    // A completed Checkout URL can be reopened months later. Its original
    // price and metadata are not evidence of today's entitlement.
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    if (customerId !== session.customer) return { status: 403 as const, error: "customer_mismatch" as const };
    const plan = activePlanForSubscription(subscription);
    // Do not let an obsolete session downgrade a replacement subscription,
    // either. Webhooks own revocation; this recovery path only confirms access.
    if (plan === "FREE") return { status: 400 as const, error: "subscription_inactive" as const };

    let profile = await findUser(user.id);
    if (!profile) {
      const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
      if (!email) return { status: 400 as const, error: "missing_user_email" as const };
      await createUser(user.id, user.firstName ?? "", user.lastName ?? "", email);
      profile = await findUser(user.id);
    }

    await updateSubscription(user.id, {
      customerId: session.customer,
      plan,
    });
    if (profile?.id) {
      await applyPendingReferralRewards(profile.id, session.customer);
    }

    return {
      status: 200 as const,
      dashboardPath: dashboardPath(profile?.clerkId ?? user.id),
      plan,
    };
  } catch (error) {
    console.error("[stripe-checkout] session verification failed", {
      sessionId,
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    });
    return { status: 500 as const, error: "verification_failed" as const };
  }
}
