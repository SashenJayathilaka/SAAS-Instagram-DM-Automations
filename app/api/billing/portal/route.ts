import { dashboardPath } from "@/lib/dashboard";
import { getApplicationUrl } from "@/lib/app-url";
import { getBillingLookup } from "@/lib/billing-snapshot";
import { client } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { recoverOwnedStripeCustomerId } from "@/lib/stripe-customer-recovery";
import { getStripeSecretKey } from "@/lib/stripe-config";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PortalErrorCode =
  | "not_authenticated"
  | "user_not_found"
  | "customer_not_linked"
  | "subscription_not_found"
  | "stripe_unavailable"
  | "portal_session_failed";

function errorResponse(status: number, code: PortalErrorCode, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "private, no-store" } }
  );
}

function safeStripeError(error: unknown) {
  if (typeof error !== "object" || error === null) return {};
  const value = error as { type?: unknown; code?: unknown };
  return {
    stripeErrorType: typeof value.type === "string" ? value.type : undefined,
    stripeErrorCode: typeof value.code === "string" ? value.code : undefined,
  };
}

export async function POST(_request: Request) {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return errorResponse(401, "not_authenticated", "Sign in to manage billing.");
  }

  const user = await client.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: {
      clerkId: true,
      id: true,
      email: true,
      subscription: { select: { customerId: true, plan: true } },
    },
  });

  if (!user) {
    return errorResponse(404, "user_not_found", "Your AP3K account could not be found.");
  }

  if (!getStripeSecretKey()) {
    console.error("[stripe-portal] unavailable", {
      operation: "create_customer_portal_session",
      customerLinked: Boolean(user.subscription?.customerId),
    });
    return errorResponse(503, "stripe_unavailable", "Billing management is temporarily unavailable.");
  }

  try {
    let customerId = user.subscription?.customerId ?? null;
    if (!customerId) {
      customerId = await recoverOwnedStripeCustomerId(stripe, {
        clerkId: user.clerkId,
        email: user.email,
      });

      if (customerId) {
        await client.subscription.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            customerId,
            plan: user.subscription?.plan ?? "FREE",
          },
          update: { customerId },
        });
      }
    }

    if (!customerId) {
      return errorResponse(
        409,
        "customer_not_linked",
        "No Stripe subscription is linked to this AP3K account. If you were charged, contact support@ap3k.com with the billing email."
      );
    }

    let billingLookup = await getBillingLookup(customerId);
    if (billingLookup.state === "unavailable" && billingLookup.reason === "customer_missing") {
      const recovered = await recoverOwnedStripeCustomerId(stripe, { clerkId: user.clerkId, email: user.email });
      if (!recovered || recovered === customerId) {
        return errorResponse(409, "customer_not_linked", "The saved billing account could not be found. Contact support@ap3k.com with your billing email so we can reconcile it before another subscription is started. Your AP3K plan has not been changed.");
      }
      const recoveryLookup = await getBillingLookup(recovered);
      if (recoveryLookup.state !== "subscription") {
        return errorResponse(503, "stripe_unavailable", "We could not verify a subscription for the recovered billing account. Please contact support@ap3k.com.");
      }
      const linked = await client.subscription.updateMany({
        where: { userId: user.id, customerId },
        data: { customerId: recovered },
      });
      if (linked.count !== 1) return errorResponse(409, "customer_not_linked", "Your billing link changed during this check. Refresh and try again.");
      customerId = recovered;
      billingLookup = recoveryLookup;
    }
    if (billingLookup.state === "none") {
      return errorResponse(
        409,
        "subscription_not_found",
        "No Stripe subscription was found for this billing account. If you were charged, contact support@ap3k.com with your billing email."
      );
    }
    if (billingLookup.state === "unavailable") {
      return errorResponse(
        503,
        "stripe_unavailable",
        "Stripe billing status is temporarily unavailable. Please try again."
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getApplicationUrl()}${dashboardPath(user.clerkId)}/billing`,
    });

    if (!session.url) {
      throw new Error("Stripe portal session URL missing");
    }

    return NextResponse.json(
      { url: session.url },
      { status: 200, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("[stripe-portal] session creation failed", {
      operation: "create_customer_portal_session",
      customerLinked: Boolean(user.subscription?.customerId),
      ...safeStripeError(error),
    });
    return errorResponse(502, "portal_session_failed", "Could not open billing management. Please try again.");
  }
}
