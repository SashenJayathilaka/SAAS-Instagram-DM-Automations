import { getStripeSecretKey } from "@/lib/stripe-config";
import {
  StripeOwnershipError,
  StripeWebhookInputError,
  fingerprintExternalId,
  processStripeEvent,
} from "@/lib/stripe-webhook";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export type StripeRouteDependencies = {
  getStripeKey(): string | undefined;
  getWebhookSecret(): string | undefined;
  constructEvent(
    body: string,
    signature: string,
    webhookSecret: string,
    stripeKey: string
  ): Stripe.Event;
  processEvent(event: Stripe.Event): Promise<unknown>;
};

const defaultDependencies: StripeRouteDependencies = {
  getStripeKey: getStripeSecretKey,
  getWebhookSecret: () => process.env.STRIPE_WEBHOOK_SECRET,
  constructEvent(body, signature, webhookSecret, stripeKey) {
    const stripe = new Stripe(stripeKey);
    return stripe.webhooks.constructEvent(body, signature, webhookSecret);
  },
  processEvent: processStripeEvent,
};

function ok() {
  return NextResponse.json({ received: true }, { status: 200 });
}

export async function handleStripeWebhook(
  req: NextRequest,
  dependencies: StripeRouteDependencies = defaultDependencies
) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Invalid Stripe webhook" }, { status: 400 });
  }

  const webhookSecret = dependencies.getWebhookSecret();
  const stripeKey = dependencies.getStripeKey();
  if (!webhookSecret || !stripeKey) {
    console.error("[stripe-webhook] server configuration unavailable");
    return NextResponse.json(
      { error: "Stripe webhook processing unavailable" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = dependencies.constructEvent(body, signature, webhookSecret, stripeKey);
  } catch {
    console.warn("[stripe-webhook] signature verification failed");
    return NextResponse.json({ error: "Invalid Stripe webhook" }, { status: 400 });
  }

  try {
    await dependencies.processEvent(event);
    return ok();
  } catch (error) {
    if (error instanceof StripeWebhookInputError) {
      console.warn("[stripe-webhook] malformed signed event", {
        eventType: event.type,
        eventFingerprint: fingerprintExternalId(event.id),
        reason: error.code,
      });
      return NextResponse.json({ error: "Invalid Stripe webhook" }, { status: 400 });
    }
    console.error("[stripe-webhook] processing failed", {
      eventType: event.type,
      eventFingerprint: fingerprintExternalId(event.id),
      reason:
        error instanceof StripeOwnershipError
          ? error.code
          : "STRIPE_WEBHOOK_PROCESSING_ERROR",
    });
    return NextResponse.json(
      { error: "Stripe webhook processing failed" },
      { status: 500 }
    );
  }
}
