import type Stripe from "stripe";
import {
  findStripeOwnerByClerkId,
  findStripeOwnerByCustomerId,
  syncSubscriptionForUser,
} from "@/actions/user/queries";
import { inferActiveDatabasePlan } from "@/lib/stripe-config";
import { activePlanForSubscription } from "@/lib/stripe-entitlements";
import { stripe } from "@/lib/stripe";
import {
  applyPendingReferralRewards,
  qualifyAndApplyReferralReward,
  reverseReferralRewardForInvoice,
} from "@/lib/referral-program";
import type { SUBSCRIPTION_PLAN } from "@prisma/client";
import { createHash } from "node:crypto";
import { notifyOwnerBillingAlert } from "@/lib/email/owner-alerts";
import type { OwnerAlert } from "@/lib/email/owner-alert-content";
import { notifyBillingEmail } from "@/lib/email/events";

export type StripeOwner = {
  id: string;
  clerkId: string;
  customerId: string | null;
};

export type StripeWebhookDependencies = {
  findOwnerByClerkId(clerkId: string): Promise<StripeOwner | null>;
  findOwnerByCustomerId(customerId: string): Promise<StripeOwner | null>;
  syncSubscription(
    userId: string,
    props: { customerId?: string; plan?: SUBSCRIPTION_PLAN },
  ): Promise<unknown>;
  retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
  remainingCustomerPlan?(customerId: string, excludedSubscriptionId: string): Promise<SUBSCRIPTION_PLAN>;
  retrieveCharge(chargeId: string): Promise<Stripe.Charge>;
  invoiceIdsForPaymentIntent?(paymentIntentId: string): Promise<string[]>;
  paidOffStripe?(invoiceId: string): Promise<number>;
  applyPendingRewards(userId: string, customerId: string): Promise<unknown>;
  qualifyPaidReferral(input: {
    referredUserId: string;
    invoiceId: string;
    plan: SUBSCRIPTION_PLAN;
    amountPaid: number;
    currency: string;
    paidAt?: Date;
    subscriptionId?: string;
    basisCents?: number;
    periodStart?: Date;
    periodEnd?: Date;
    subscriptionStart?: Date;
    billingReason?: string | null;
    promoApplied?: boolean;
    paidOutOfBand?: boolean;
  }): Promise<unknown>;
  reversePaidReferral(
    invoiceId: string,
    reason: "refund" | "dispute",
    refundedCents?: number,
    chargedCents?: number,
  ): Promise<unknown>;
  warnStaleMetadata(details: {
    eventType: string;
    clerkIdFingerprint: string;
    customerIdFingerprint: string;
  }): void;
  notifyOwnerEmail?(input: OwnerAlert & { live: boolean }): Promise<unknown>;
  notifyCustomerEmail?(input: {
    userId: string;
    templateId: "plan_activated" | "payment_failed" | "subscription_canceled";
    stripeEventId: string;
    planName?: string | null;
    periodEnd?: string | null;
    failureReason?: string | null;
  }): Promise<unknown>;
};

export class StripeOwnershipError extends Error {
  constructor(
    public readonly code:
      | "STRIPE_OWNER_UNRESOLVED"
      | "STRIPE_OWNERSHIP_CONFLICT"
      | "STRIPE_CUSTOMER_BINDING_MISSING",
  ) {
    super(code);
    this.name = "StripeOwnershipError";
  }
}

export class StripeWebhookInputError extends Error {
  constructor(public readonly code: "STRIPE_CUSTOMER_ID_MISSING") {
    super(code);
    this.name = "StripeWebhookInputError";
  }
}

const defaultDependencies: StripeWebhookDependencies = {
  findOwnerByClerkId: findStripeOwnerByClerkId,
  findOwnerByCustomerId: findStripeOwnerByCustomerId,
  syncSubscription: syncSubscriptionForUser,
  retrieveSubscription(subscriptionId) {
    return stripe.subscriptions.retrieve(subscriptionId);
  },
  async remainingCustomerPlan(customerId, deletedSubscriptionId) {
    let plan: SUBSCRIPTION_PLAN = "FREE";
    for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })) {
      if (subscription.id === deletedSubscriptionId) continue;
      const current = activePlanForSubscription(subscription);
      if (current === "BUSINESS") return current;
      if (current === "PRO") plan = current;
    }
    return plan;
  },
  retrieveCharge(chargeId) {
    return stripe.charges.retrieve(chargeId);
  },
  async invoiceIdsForPaymentIntent(paymentIntentId) {
    const ids = new Set<string>();
    for await (const payment of stripe.invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: paymentIntentId },
      status: "paid", limit: 100,
    })) {
      const id = stripeId(payment.invoice);
      if (id) ids.add(id);
    }
    return Array.from(ids);
  },
  async paidOffStripe(invoiceId) {
    const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ["amount_paid_off_stripe"] });
    return invoice.amount_paid_off_stripe ?? 0;
  },
  applyPendingRewards: applyPendingReferralRewards,
  qualifyPaidReferral: qualifyAndApplyReferralReward,
  reversePaidReferral: reverseReferralRewardForInvoice,
  warnStaleMetadata(details) {
    console.warn("[stripe-webhook] stale Clerk metadata", details);
  },
  notifyCustomerEmail: notifyBillingEmail,
  notifyOwnerEmail: notifyOwnerBillingAlert,
};

async function notifyCustomerSafely(
  dependencies: StripeWebhookDependencies,
  input: Parameters<
    NonNullable<StripeWebhookDependencies["notifyCustomerEmail"]>
  >[0],
) {
  try {
    await dependencies.notifyCustomerEmail?.(input);
  } catch (error) {
    console.warn("[stripe-webhook] non-blocking customer email failure", {
      templateId: input.templateId,
      stripeEventId: input.stripeEventId,
      errorType:
        error instanceof Error ? error.constructor.name : "UnknownError",
    });
  }
}

export function fingerprintExternalId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function stripeId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    value.id.trim()
  ) {
    return value.id;
  }
  return null;
}

function metadataClerkId(metadata?: Stripe.Metadata | null) {
  const value = metadata?.clerkId;
  return typeof value === "string" && value.trim() ? value : null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const value =
    (invoice as any).parent?.subscription_details?.subscription ??
    (invoice as any).subscription;
  return stripeId(value);
}

async function currentCustomerPlan(subscription: Stripe.Subscription, customerId: string, dependencies: StripeWebhookDependencies) {
  const own = activePlanForSubscription(subscription);
  if (own === "BUSINESS") return own;
  // A stale event for an old subscription must not revoke or downgrade its replacement.
  const other = await dependencies.remainingCustomerPlan?.(customerId, subscription.id) ?? "FREE";
  return other === "BUSINESS" ? other : own === "PRO" || other === "PRO" ? "PRO" : "FREE";
}

async function syncStripeSubscription(
  eventType: string,
  subscription: Stripe.Subscription,
  allowInitialCustomerBinding: boolean,
  dependencies: StripeWebhookDependencies,
) {
  const customerId = stripeId(subscription.customer);
  if (!customerId) {
    throw new StripeWebhookInputError("STRIPE_CUSTOMER_ID_MISSING");
  }
  const resolution = await resolveStripeOwner(
    {
      eventType,
      metadataClerkId: metadataClerkId(subscription.metadata),
      customerId,
      allowInitialCustomerBinding,
    },
    dependencies,
  );
  const plan = await currentCustomerPlan(subscription, customerId, dependencies);
  await dependencies.syncSubscription(resolution.owner.id, {
    customerId,
    plan,
  });
  await dependencies.applyPendingRewards(resolution.owner.id, customerId);
  return { ...resolution, plan };
}

export async function resolveStripeOwner(
  input: {
    eventType: string;
    metadataClerkId: string | null;
    customerId: string | null;
    allowInitialCustomerBinding: boolean;
  },
  dependencies: StripeWebhookDependencies = defaultDependencies,
) {
  const [metadataOwner, customerOwner] = await Promise.all([
    input.metadataClerkId
      ? dependencies.findOwnerByClerkId(input.metadataClerkId)
      : Promise.resolve(null),
    input.customerId
      ? dependencies.findOwnerByCustomerId(input.customerId)
      : Promise.resolve(null),
  ]);

  if (metadataOwner && customerOwner) {
    if (metadataOwner.id !== customerOwner.id) {
      throw new StripeOwnershipError("STRIPE_OWNERSHIP_CONFLICT");
    }
    return { owner: customerOwner, source: "metadata-and-customer" as const };
  }

  if (customerOwner) {
    if (input.metadataClerkId && !metadataOwner && input.customerId) {
      dependencies.warnStaleMetadata({
        eventType: input.eventType,
        clerkIdFingerprint: fingerprintExternalId(input.metadataClerkId),
        customerIdFingerprint: fingerprintExternalId(input.customerId),
      });
    }
    return { owner: customerOwner, source: "customer" as const };
  }

  if (metadataOwner) {
    if (
      input.allowInitialCustomerBinding &&
      input.customerId &&
      metadataOwner.customerId === null
    ) {
      return {
        owner: metadataOwner,
        source: "initial-metadata-binding" as const,
      };
    }
    throw new StripeOwnershipError("STRIPE_CUSTOMER_BINDING_MISSING");
  }

  throw new StripeOwnershipError("STRIPE_OWNER_UNRESOLVED");
}

async function chargeInvoiceIds(charge: Stripe.Charge, dependencies: StripeWebhookDependencies) {
  const legacy = stripeId((charge as Stripe.Charge & { invoice?: string | null }).invoice);
  if (legacy) return [legacy];
  const intent = stripeId(charge.payment_intent);
  return intent && dependencies.invoiceIdsForPaymentIntent
    ? dependencies.invoiceIdsForPaymentIntent(intent) : [];
}

export async function processStripeEvent(
  event: Stripe.Event,
  dependencies: StripeWebhookDependencies = defaultDependencies,
) {
  switch (event.type) {
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status && !["paid", "no_payment_required"].includes(session.payment_status)) {
        return { outcome: "ignored" as const, source: "payment-pending" as const };
      }
      const customerId = stripeId(session.customer);
      if (!customerId) {
        throw new StripeWebhookInputError("STRIPE_CUSTOMER_ID_MISSING");
      }
      const resolution = await resolveStripeOwner(
        {
          eventType: event.type,
          metadataClerkId: metadataClerkId(session.metadata),
          customerId,
          allowInitialCustomerBinding: true,
        },
        dependencies,
      );
      const subscriptionId = stripeId(session.subscription);
      if (subscriptionId) {
        const subscription =
          await dependencies.retrieveSubscription(subscriptionId);
        const plan = await currentCustomerPlan(subscription, customerId, dependencies);
        await dependencies.syncSubscription(resolution.owner.id, {
          customerId,
          plan,
        });
        await notifyCustomerSafely(dependencies, {
          userId: resolution.owner.id,
          templateId: "plan_activated",
          stripeEventId: event.id,
          planName: plan,
          periodEnd: (subscription.items.data[0]?.current_period_end ?? (subscription as any).current_period_end)
            ? new Date(
                (subscription.items.data[0]?.current_period_end ?? (subscription as any).current_period_end) * 1000,
              ).toLocaleDateString("en-US", { dateStyle: "medium" })
            : null,
        });
      } else {
        // Bind ownership, but never grant paid access from Checkout metadata alone.
        await dependencies.syncSubscription(resolution.owner.id, {
          customerId,
        });
      }
      await dependencies.applyPendingRewards(resolution.owner.id, customerId);
      return { outcome: "processed" as const, source: resolution.source };
    }

    case "customer.subscription.created": {
      const current = await dependencies.retrieveSubscription((event.data.object as Stripe.Subscription).id);
      const resolution = await syncStripeSubscription(
        event.type,
        current,
        true,
        dependencies,
      );
      return { outcome: "processed" as const, source: resolution.source };
    }

    case "customer.subscription.updated": {
      const current = await dependencies.retrieveSubscription((event.data.object as Stripe.Subscription).id);
      const resolution = await syncStripeSubscription(
        event.type,
        current,
        false,
        dependencies,
      );
      return { outcome: "processed" as const, source: resolution.source };
    }

    case "customer.subscription.paused":
    case "customer.subscription.resumed": {
      const current = await dependencies.retrieveSubscription((event.data.object as Stripe.Subscription).id);
      const resolution = await syncStripeSubscription(
        event.type,
        current,
        false,
        dependencies,
      );
      return { outcome: "processed" as const, source: resolution.source };
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (!subscriptionId) {
        return {
          outcome: "ignored" as const,
          source: "non-subscription-invoice" as const,
        };
      }
      const paidOutOfBand = Boolean((invoice as Stripe.Invoice & { paid_out_of_band?: boolean }).paid_out_of_band) ||
        (event.type === "invoice.paid" && (dependencies.paidOffStripe ? await dependencies.paidOffStripe(invoice.id) : invoice.amount_paid_off_stripe ?? 0) > 0);
      const subscription =
        await dependencies.retrieveSubscription(subscriptionId);
      const resolution = await syncStripeSubscription(
        event.type,
        subscription,
        false,
        dependencies,
      );
      if (
        event.livemode === true &&
        ((event.type === "invoice.paid" && (invoice.amount_paid ?? 0) > 0) ||
          (event.type === "invoice.payment_failed" &&
            (invoice.amount_due ?? 0) > 0))
      ) {
        await dependencies.notifyOwnerEmail?.({
          live: true,
          kind: event.type === "invoice.paid" ? "payment" : "payment_failed",
          key: invoice.id,
          userId: resolution.owner.id,
          plan: resolution.plan,
          amount:
            event.type === "invoice.paid"
              ? invoice.amount_paid
              : invoice.amount_due,
          currency: invoice.currency,
          reference: invoice.number || invoice.id,
          occurredAt: new Date(event.created * 1000).toISOString(),
          detail:
            event.type === "invoice.paid"
              ? paidOutOfBand
                ? "This subscription invoice was marked paid outside Stripe. Check the payment record before counting it as a Stripe collection."
                : invoice.billing_reason === "subscription_create"
                  ? "A customer made their first subscription payment."
                  : invoice.billing_reason === "subscription_cycle"
                    ? "A subscription renewal payment was received."
                    : "A subscription invoice was paid, including any plan-change adjustment."
              : "A subscription payment failed. Stripe may retry it. You will receive only one failure alert for this invoice.",
        });
      }
      if (event.type === "invoice.paid") {
        await dependencies.qualifyPaidReferral({
          referredUserId: resolution.owner.id,
          invoiceId: invoice.id,
          plan: inferActiveDatabasePlan({
            metadataPlan: subscription.metadata?.plan,
            lookupKey:
              (invoice.lines?.data?.[0] as any)?.price?.lookup_key ??
              subscription.items?.data?.[0]?.price?.lookup_key,
            priceId:
              (invoice.lines?.data?.[0] as any)?.price?.id ??
              (invoice.lines?.data?.[0] as any)?.pricing?.price_details?.price,
          }),
          amountPaid: invoice.amount_paid ?? 0,
          currency: invoice.currency ?? "",
          subscriptionId: subscription.id,
          ...referralInvoiceRevenue(invoice, subscription),
          billingReason: invoice.billing_reason,
          promoApplied: Boolean(subscription.metadata?.ap3kReferralPromo),
          paidOutOfBand: paidOutOfBand,
          paidAt: new Date(
            (invoice.status_transitions?.paid_at ?? event.created) * 1000,
          ),
        });
      } else {
        await notifyCustomerSafely(dependencies, {
          userId: resolution.owner.id,
          templateId: "payment_failed",
          stripeEventId: event.id,
          planName: resolution.plan,
          failureReason:
            "Stripe could not complete the latest subscription payment. Update the payment method or retry from Billing.",
        });
      }
      return { outcome: "processed" as const, source: resolution.source };
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = stripeId(subscription.customer);
      if (!customerId) {
        throw new StripeWebhookInputError("STRIPE_CUSTOMER_ID_MISSING");
      }

      let resolution;
      try {
        resolution = await resolveStripeOwner(
          {
            eventType: event.type,
            metadataClerkId: metadataClerkId(subscription.metadata),
            customerId,
            allowInitialCustomerBinding: false,
          },
          dependencies,
        );
      } catch (error) {
        if (
          error instanceof StripeOwnershipError &&
          error.code === "STRIPE_OWNER_UNRESOLVED"
        ) {
          return {
            outcome: "ignored" as const,
            source: "unowned-deleted-customer" as const,
          };
        }
        throw error;
      }

      // A delayed deletion of an old subscription must not revoke its replacement.
      const remainingPlan = await dependencies.remainingCustomerPlan?.(customerId, subscription.id) ?? "FREE";
      await dependencies.syncSubscription(resolution.owner.id, {
        customerId,
        plan: remainingPlan,
      });
      if (event.livemode === true && subscription.status === "canceled") {
        await dependencies.notifyOwnerEmail?.({
          live: true,
          kind: "cancellation",
          key: subscription.id,
          userId: resolution.owner.id,
          reference: subscription.id,
          occurredAt: new Date(event.created * 1000).toISOString(),
        });
      }
      if (remainingPlan === "FREE") await notifyCustomerSafely(dependencies, {
        userId: resolution.owner.id,
        templateId: "subscription_canceled",
        stripeEventId: event.id,
        planName: "Free",
      });
      return { outcome: "processed" as const, source: resolution.source };
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const invoiceIds = await chargeInvoiceIds(charge, dependencies);
      if (!invoiceIds.length) {
        return {
          outcome: "ignored" as const,
          source: "non-invoice-charge" as const,
        };
      }
      if (event.livemode === true) {
        const customerId = stripeId(charge.customer);
        const owner = customerId
          ? await dependencies.findOwnerByCustomerId(customerId)
          : null;
        if (owner && charge.amount_refunded > 0)
          await dependencies.notifyOwnerEmail?.({
            live: true,
            kind: "refund",
            key: `${charge.id}:${charge.amount_refunded}`,
            userId: owner.id,
            amount: charge.amount_refunded,
            currency: charge.currency,
            reference: charge.id,
            occurredAt: new Date(event.created * 1000).toISOString(),
          });
      }
      for (const invoiceId of invoiceIds) {
        await dependencies.reversePaidReferral(invoiceId, "refund", charge.amount_refunded, charge.amount);
      }
      return {
        outcome: "processed" as const,
        source: "referral-reversal" as const,
      };
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const chargeId = stripeId(dispute.charge);
      if (!chargeId) {
        return {
          outcome: "ignored" as const,
          source: "dispute-without-charge" as const,
        };
      }
      const charge =
        typeof dispute.charge === "object"
          ? dispute.charge
          : await dependencies.retrieveCharge(chargeId);
      const invoiceIds = await chargeInvoiceIds(charge, dependencies);
      if (!invoiceIds.length) {
        return {
          outcome: "ignored" as const,
          source: "non-invoice-dispute" as const,
        };
      }
      if (event.livemode === true) {
        const customerId = stripeId(charge.customer);
        const owner = customerId
          ? await dependencies.findOwnerByCustomerId(customerId)
          : null;
        if (owner)
          await dependencies.notifyOwnerEmail?.({
            live: true,
            kind: "dispute",
            key: dispute.id,
            userId: owner.id,
            amount: dispute.amount,
            currency: dispute.currency,
            reference: dispute.id,
            occurredAt: new Date(event.created * 1000).toISOString(),
            detail: dispute.evidence_details?.due_by
              ? `A customer disputed a payment. Evidence is due by ${new Date(dispute.evidence_details.due_by * 1000).toISOString().slice(0, 10)}. Review it in Stripe.`
              : undefined,
          });
      }
      for (const invoiceId of invoiceIds) await dependencies.reversePaidReferral(invoiceId, "dispute");
      return {
        outcome: "processed" as const,
        source: "referral-reversal" as const,
      };
    }

    default:
      return { outcome: "ignored" as const };
  }
}

// Ignore tax and unrelated invoice items. No proration commissions are issued.
export function referralInvoiceRevenue(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription,
) {
  const lines = invoice.lines?.data ?? [];
  const recurring = lines.filter((line) => {
    const value = line as any;
    return (
      !value.proration &&
      !value.parent?.subscription_item_details?.proration &&
      (value.type === "subscription" ||
        value.parent?.type === "subscription_item_details" ||
        value.subscription)
    );
  });
  if (!recurring.length || invoice.lines?.has_more) return { basisCents: 0 };
  const periodStart = Math.min(...recurring.map((line) => line.period.start));
  const periodEnd = Math.max(...recurring.map((line) => line.period.end));
  const revenue = recurring.reduce((sum, line) => {
    const value = line as any;
    const discounts = (value.discount_amounts ?? []).reduce(
      (total: number, item: { amount: number }) => total + item.amount,
      0,
    );
    const inclusiveTax = (value.tax_amounts ?? value.taxes ?? [])
      .filter(
        (item: { inclusive: boolean }) =>
          item.inclusive || (item as any).tax_behavior === "inclusive",
      )
      .reduce(
        (total: number, item: { amount: number }) => total + item.amount,
        0,
      );
    return sum + Math.max(0, value.amount - discounts - inclusiveTax);
  }, 0);
  const invoiceTax =
    (
      (invoice as any).total_tax_amounts ?? (invoice as any).total_taxes
    )?.reduce((sum: number, tax: { amount: number }) => sum + tax.amount, 0) ??
    (invoice as any).tax ??
    0;
  const basisCents = Math.max(
    0,
    Math.min(revenue, (invoice.amount_paid ?? 0) - invoiceTax),
  );
  return {
    basisCents,
    periodStart: new Date(periodStart * 1000),
    periodEnd: new Date(periodEnd * 1000),
    subscriptionStart: new Date(
      ((subscription as any).billing_cycle_anchor ??
        (subscription as any).start_date) * 1000,
    ),
  };
}
