import { client } from "@/lib/prisma";
import {
  parseStripeBillingInterval,
  parseStripePlan,
  stripePlanToDatabasePlan,
} from "@/lib/stripe-config";
import { resolveStripePriceId } from "@/lib/stripe-pricing";
import { stripe } from "@/lib/stripe";
import {
  checkoutIdempotencyKey,
  stripeCheckoutTaxOptions,
} from "@/lib/stripe-checkout";
import {
  getBillingLookup,
  isManageableSubscriptionStatus,
} from "@/lib/billing-snapshot";
import { referralCheckoutDiscount } from "@/lib/referral-commissions";
import { prepareReferralCreditForCheckout } from "@/lib/referral-program";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ status: 401 }, { status: 401 });

  const plan = parseStripePlan(
    req.nextUrl.searchParams.get("plan") ?? undefined,
  );
  const interval = parseStripeBillingInterval(
    req.nextUrl.searchParams.get("interval") ?? undefined,
  );
  const databasePlan = stripePlanToDatabasePlan(plan);
  const hostUrl = process.env.NEXT_PUBLIC_HOST_URL;

  const existing = await client.user.findUnique({
    where: { clerkId: user.id },
    select: {
      id: true,
      email: true,
      subscription: { select: { plan: true, customerId: true } },
    },
  });
  if (existing?.subscription?.customerId) {
    const billingLookup = await getBillingLookup(
      existing.subscription.customerId,
    );
    if (billingLookup.state === "unavailable") {
      return NextResponse.json(
        {
          status: 503,
          error:
            "Stripe billing status is temporarily unavailable. Please try again.",
        },
        { status: 503 },
      );
    }
    if (
      billingLookup.state === "subscription" &&
      isManageableSubscriptionStatus(billingLookup.snapshot.status)
    ) {
      return NextResponse.json(
        {
          status: 409,
          error:
            "An active paid subscription already exists. Manage your plan from Billing.",
        },
        { status: 409 },
      );
    }
  }

  let priceId: string | null = null;
  try {
    priceId = await resolveStripePriceId(plan, interval);
  } catch (err) {
    console.error("[stripe-checkout] price lookup failed", {
      plan,
      interval,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  if (!priceId || !hostUrl) {
    return NextResponse.json(
      { status: 400, error: "Missing Stripe checkout configuration" },
      { status: 400 },
    );
  }

  try {
    const customerId = existing
      ? await prepareReferralCreditForCheckout({
          userId: existing.id,
          clerkId: user.id,
          email: existing.email,
        })
      : null;
    const referralPromo = existing
      ? await referralCheckoutDiscount(existing.id, interval)
      : null;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        integration_identifier: "ap3k_checkout_kmqrzvtx",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: user.id,
        metadata: {
          clerkId: user.id,
          plan: databasePlan,
          interval,
          ...(referralPromo
            ? { ap3kReferralPromo: referralPromo.partnerId }
            : {}),
        },
        subscription_data: {
          metadata: {
            clerkId: user.id,
            plan: databasePlan,
            interval,
            ...(referralPromo
              ? { ap3kReferralPromo: referralPromo.partnerId }
              : {}),
          },
        },
        ...(customerId
          ? { customer: customerId }
          : { customer_email: user.emailAddresses[0]?.emailAddress }),
        success_url: `${hostUrl}/payment?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${hostUrl}/payment?cancel=true`,
        ...(referralPromo
          ? { discounts: [{ coupon: referralPromo.coupon }] }
          : { allow_promotion_codes: true }),
        ...stripeCheckoutTaxOptions(),
      },
      {
        idempotencyKey:
          (referralPromo ? `promo_${referralPromo.partnerId}_` : "") +
          checkoutIdempotencyKey({ clerkId: user.id, plan, interval }),
      },
    );

    return NextResponse.json({ status: 200, session_url: session.url });
  } catch (err) {
    console.error("[stripe-checkout] failed to create checkout session", {
      plan,
      interval,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { status: 500, error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
