import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  StripeOwnershipError,
  StripeWebhookInputError,
  type StripeOwner,
  type StripeWebhookDependencies,
  processStripeEvent,
  resolveStripeOwner,
  referralInvoiceRevenue,
} from "./stripe-webhook";

const USER_A: StripeOwner = {
  id: "11111111-1111-4111-8111-111111111111",
  clerkId: "user_prod_alpha",
  customerId: "cus_alpha",
};
const USER_B: StripeOwner = {
  id: "22222222-2222-4222-8222-222222222222",
  clerkId: "user_prod_beta",
  customerId: "cus_beta",
};

function dependencies(input: {
  clerkOwners?: Record<string, StripeOwner>;
  customerOwners?: Record<string, StripeOwner>;
}) {
  const subscriptions = new Map<
    string,
    { customerId?: string; plan?: "PRO" | "BUSINESS" | "FREE" }
  >();
  const warnStaleMetadata = vi.fn();
  const applyPendingRewards = vi.fn(async () => undefined);
  const qualifyPaidReferral = vi.fn(async () => undefined);
  const reversePaidReferral = vi.fn(async () => undefined);
  const syncSubscription = vi.fn(
    async (
      userId: string,
      props: { customerId?: string; plan?: "PRO" | "BUSINESS" | "FREE" },
    ) => {
      subscriptions.set(userId, { ...subscriptions.get(userId), ...props });
    },
  );
  const value: StripeWebhookDependencies = {
    findOwnerByClerkId: async (clerkId) => input.clerkOwners?.[clerkId] ?? null,
    findOwnerByCustomerId: async (customerId) =>
      input.customerOwners?.[customerId] ?? null,
    syncSubscription,
    retrieveSubscription: vi.fn(async () =>
      subscription({ customer: "cus_alpha" }),
    ),
    retrieveCharge: vi.fn(
      async (chargeId) =>
        ({
          id: chargeId,
          invoice: "in_disputed",
        }) as unknown as Stripe.Charge,
    ),
    applyPendingRewards,
    qualifyPaidReferral,
    reversePaidReferral,
    warnStaleMetadata,
  };
  return {
    value,
    subscriptions,
    syncSubscription,
    applyPendingRewards,
    qualifyPaidReferral,
    reversePaidReferral,
    warnStaleMetadata,
  };
}

function event(type: string, object: unknown, id = "evt_test") {
  return { id, type, data: { object } } as Stripe.Event;
}

function checkout(input: { clerkId?: string; customer?: string | null }) {
  return {
    id: "cs_test",
    customer: input.customer ?? null,
    metadata: input.clerkId ? { clerkId: input.clerkId } : {},
    subscription: "sub_test",
  } as unknown as Stripe.Checkout.Session;
}

function subscription(input: {
  clerkId?: string;
  customer?: string | null;
  status?: Stripe.Subscription.Status;
  plan?: "PRO" | "BUSINESS";
}) {
  const lookupKey =
    input.plan === "BUSINESS" ? "ap3k_business_month" : "ap3k_pro_month";
  return {
    id: "sub_test",
    customer: input.customer ?? null,
    metadata: input.clerkId ? { clerkId: input.clerkId } : {},
    status: input.status ?? "active",
    items: {
      data: [
        {
          price: { id: `price_${input.plan ?? "PRO"}`, lookup_key: lookupKey },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

describe("resolveStripeOwner", () => {
  it("resolves current metadata and customer ownership when both match", async () => {
    const deps = dependencies({
      clerkOwners: { [USER_A.clerkId]: USER_A },
      customerOwners: { cus_alpha: USER_A },
    });
    await expect(
      resolveStripeOwner(
        {
          eventType: "checkout.session.completed",
          metadataClerkId: USER_A.clerkId,
          customerId: "cus_alpha",
          allowInitialCustomerBinding: true,
        },
        deps.value,
      ),
    ).resolves.toMatchObject({
      owner: USER_A,
      source: "metadata-and-customer",
    });
  });

  it("uses customer ownership when Clerk metadata is stale", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    const result = await resolveStripeOwner(
      {
        eventType: "customer.subscription.updated",
        metadataClerkId: "user_dev_stale",
        customerId: "cus_alpha",
        allowInitialCustomerBinding: false,
      },
      deps.value,
    );
    expect(result).toMatchObject({ owner: USER_A, source: "customer" });
    expect(deps.warnStaleMetadata).toHaveBeenCalledOnce();
    const warning = deps.warnStaleMetadata.mock.calls[0][0];
    expect(JSON.stringify(warning)).not.toContain("user_dev_stale");
    expect(JSON.stringify(warning)).not.toContain("cus_alpha");
  });

  it("fails closed when metadata and customer resolve to different users", async () => {
    const deps = dependencies({
      clerkOwners: { [USER_A.clerkId]: USER_A },
      customerOwners: { cus_beta: USER_B },
    });
    await expect(
      resolveStripeOwner(
        {
          eventType: "checkout.session.completed",
          metadataClerkId: USER_A.clerkId,
          customerId: "cus_beta",
          allowInitialCustomerBinding: true,
        },
        deps.value,
      ),
    ).rejects.toMatchObject({ code: "STRIPE_OWNERSHIP_CONFLICT" });
  });

  it("returns a retriable ownership failure when neither source resolves", async () => {
    const deps = dependencies({});
    await expect(
      resolveStripeOwner(
        {
          eventType: "customer.subscription.updated",
          metadataClerkId: "user_dev_stale",
          customerId: "cus_missing",
          allowInitialCustomerBinding: false,
        },
        deps.value,
      ),
    ).rejects.toBeInstanceOf(StripeOwnershipError);
  });

  it("allows an initial customer binding only for an unbound metadata owner", async () => {
    const unbound = { ...USER_A, customerId: null };
    const deps = dependencies({ clerkOwners: { [USER_A.clerkId]: unbound } });
    await expect(
      resolveStripeOwner(
        {
          eventType: "customer.subscription.created",
          metadataClerkId: USER_A.clerkId,
          customerId: "cus_first",
          allowInitialCustomerBinding: true,
        },
        deps.value,
      ),
    ).resolves.toMatchObject({ source: "initial-metadata-binding" });

    await expect(
      resolveStripeOwner(
        {
          eventType: "customer.subscription.updated",
          metadataClerkId: USER_A.clerkId,
          customerId: "cus_first",
          allowInitialCustomerBinding: false,
        },
        deps.value,
      ),
    ).rejects.toMatchObject({ code: "STRIPE_CUSTOMER_BINDING_MISSING" });
  });

  it("blocks first binding when the metadata owner already has a different customer", async () => {
    const deps = dependencies({ clerkOwners: { [USER_A.clerkId]: USER_A } });
    await expect(
      resolveStripeOwner(
        {
          eventType: "checkout.session.completed",
          metadataClerkId: USER_A.clerkId,
          customerId: "cus_different",
          allowInitialCustomerBinding: true,
        },
        deps.value,
      ),
    ).rejects.toMatchObject({ code: "STRIPE_CUSTOMER_BINDING_MISSING" });
    expect(deps.syncSubscription).not.toHaveBeenCalled();
  });
});

describe("processStripeEvent", () => {
  it("uses customer ownership for checkout completion with stale metadata", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    await processStripeEvent(
      event(
        "checkout.session.completed",
        checkout({ clerkId: "user_dev_stale", customer: "cus_alpha" }),
      ),
      deps.value,
    );
    expect(deps.syncSubscription).toHaveBeenCalledWith(USER_A.id, {
      customerId: "cus_alpha",
      plan: "PRO",
    });
  });

  it("uses customer ownership for a subscription update with stale metadata", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    await processStripeEvent(
      event(
        "customer.subscription.updated",
        subscription({ clerkId: "user_dev_stale", customer: "cus_alpha" }),
      ),
      deps.value,
    );
    expect(deps.syncSubscription).toHaveBeenCalledWith(USER_A.id, {
      customerId: "cus_alpha",
      plan: "PRO",
    });
  });

  it("activates both Pro and Business from the current Stripe price", async () => {
    for (const plan of ["PRO", "BUSINESS"] as const) {
      const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
      vi.mocked(deps.value.retrieveSubscription).mockResolvedValue(subscription({ customer: "cus_alpha", plan }));
      await processStripeEvent(
        event(
          "customer.subscription.created",
          subscription({ customer: "cus_alpha", plan }),
        ),
        deps.value,
      );
      expect(deps.syncSubscription).toHaveBeenLastCalledWith(USER_A.id, {
        customerId: "cus_alpha",
        plan,
      });
    }
  });

  it("keeps access during past-due Smart Retries and revokes it when unpaid", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    vi.mocked(deps.value.retrieveSubscription)
      .mockResolvedValueOnce(subscription({ customer: "cus_alpha", status: "past_due" }))
      .mockResolvedValueOnce(subscription({ customer: "cus_alpha", status: "unpaid" }));
    await processStripeEvent(
      event(
        "customer.subscription.updated",
        subscription({ customer: "cus_alpha", status: "past_due" }),
      ),
      deps.value,
    );
    expect(deps.syncSubscription).toHaveBeenLastCalledWith(USER_A.id, {
      customerId: "cus_alpha",
      plan: "PRO",
    });

    await processStripeEvent(
      event(
        "customer.subscription.updated",
        subscription({ customer: "cus_alpha", status: "unpaid" }),
      ),
      deps.value,
    );
    expect(deps.syncSubscription).toHaveBeenLastCalledWith(USER_A.id, {
      customerId: "cus_alpha",
      plan: "FREE",
    });
  });

  it("processes successful renewals and failed renewal state from invoice events", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    const retrieve = vi.mocked(deps.value.retrieveSubscription);
    retrieve.mockResolvedValueOnce(
      subscription({
        customer: "cus_alpha",
        plan: "BUSINESS",
        status: "active",
      }),
    );
    await processStripeEvent(
      event("invoice.paid", {
        id: "in_paid",
        amount_paid: 2900,
        currency: "usd",
        status_transitions: { paid_at: 1_788_200_000 },
        parent: { subscription_details: { subscription: "sub_test" } },
      }),
      deps.value,
    );
    expect(deps.syncSubscription).toHaveBeenLastCalledWith(USER_A.id, {
      customerId: "cus_alpha",
      plan: "BUSINESS",
    });
    expect(deps.qualifyPaidReferral).toHaveBeenCalledWith(
      expect.objectContaining({
        referredUserId: USER_A.id,
        invoiceId: "in_paid",
        plan: "BUSINESS",
        amountPaid: 2900,
        currency: "usd",
        paidAt: new Date(1_788_200_000 * 1000),
      }),
    );

    retrieve.mockResolvedValueOnce(
      subscription({ customer: "cus_alpha", status: "past_due" }),
    );
    await processStripeEvent(
      event("invoice.payment_failed", {
        parent: { subscription_details: { subscription: "sub_test" } },
      }),
      deps.value,
    );
    expect(deps.syncSubscription).toHaveBeenLastCalledWith(USER_A.id, {
      customerId: "cus_alpha",
      plan: "PRO",
    });
    expect(deps.qualifyPaidReferral).toHaveBeenCalledTimes(1);
  });

  it("applies a paid-plan downgrade from the replacement price", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    await processStripeEvent(
      event(
        "customer.subscription.updated",
        subscription({ customer: "cus_alpha", plan: "PRO" }),
      ),
      deps.value,
    );
    expect(deps.syncSubscription).toHaveBeenLastCalledWith(USER_A.id, {
      customerId: "cus_alpha",
      plan: "PRO",
    });
  });

  it("preserves subscription deletion semantics through customer ownership", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    await processStripeEvent(
      event(
        "customer.subscription.deleted",
        subscription({ clerkId: "user_dev_stale", customer: "cus_alpha" }),
      ),
      deps.value,
    );
    expect(deps.syncSubscription).toHaveBeenCalledWith(USER_A.id, {
      customerId: "cus_alpha",
      plan: "FREE",
    });
  });

  it("emits deterministic lifecycle emails after billing state is synchronized", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    const notifyCustomerEmail = vi.fn(async () => undefined);
    deps.value.notifyCustomerEmail = notifyCustomerEmail;

    await processStripeEvent(
      event(
        "checkout.session.completed",
        checkout({ customer: "cus_alpha" }),
        "evt_checkout",
      ),
      deps.value,
    );
    await processStripeEvent(
      event(
        "invoice.payment_failed",
        {
          id: "in_failed",
          parent: { subscription_details: { subscription: "sub_test" } },
        },
        "evt_failed",
      ),
      deps.value,
    );
    await processStripeEvent(
      event(
        "customer.subscription.deleted",
        subscription({ customer: "cus_alpha" }),
        "evt_deleted",
      ),
      deps.value,
    );

    expect(notifyCustomerEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: USER_A.id,
        templateId: "plan_activated",
        stripeEventId: "evt_checkout",
        planName: "PRO",
      }),
    );
    expect(notifyCustomerEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: USER_A.id,
        templateId: "payment_failed",
        stripeEventId: "evt_failed",
      }),
    );
    expect(notifyCustomerEmail).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        userId: USER_A.id,
        templateId: "subscription_canceled",
        stripeEventId: "evt_deleted",
      }),
    );
  });

  it("never rolls back billing when the customer email provider fails", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    deps.value.notifyCustomerEmail = vi.fn(async () => {
      throw new Error("provider unavailable");
    });

    await expect(
      processStripeEvent(
        event(
          "customer.subscription.deleted",
          subscription({ customer: "cus_alpha" }),
          "evt_delete_email_failure",
        ),
        deps.value,
      ),
    ).resolves.toMatchObject({ outcome: "processed" });
    expect(deps.syncSubscription).toHaveBeenCalledWith(USER_A.id, {
      customerId: "cus_alpha",
      plan: "FREE",
    });
  });

  it("reverses referral rewards for refunded and disputed invoice charges", async () => {
    const deps = dependencies({});

    await processStripeEvent(
      event("charge.refunded", { id: "ch_refund", invoice: "in_refunded" }),
      deps.value,
    );
    expect(deps.reversePaidReferral).toHaveBeenCalledWith(
      "in_refunded",
      "refund",
      undefined,
      undefined,
    );

    await processStripeEvent(
      event("charge.dispute.created", { id: "dp_test", charge: "ch_disputed" }),
      deps.value,
    );
    expect(deps.value.retrieveCharge).toHaveBeenCalledWith("ch_disputed");
    expect(deps.reversePaidReferral).toHaveBeenCalledWith(
      "in_disputed",
      "dispute",
    );
  });

  it("is idempotent when Stripe redelivers the same event", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    const repeated = event(
      "customer.subscription.updated",
      subscription({ clerkId: USER_A.clerkId, customer: "cus_alpha" }),
      "evt_repeated",
    );
    await processStripeEvent(repeated, deps.value);
    await processStripeEvent(repeated, deps.value);
    expect(deps.subscriptions.size).toBe(1);
    expect(deps.subscriptions.get(USER_A.id)).toEqual({
      customerId: "cus_alpha",
      plan: "PRO",
    });
  });

  it("does not update either user when ownership conflicts", async () => {
    const deps = dependencies({
      clerkOwners: { [USER_A.clerkId]: USER_A },
      customerOwners: { cus_beta: USER_B },
    });
    await expect(
      processStripeEvent(
        event(
          "checkout.session.completed",
          checkout({ clerkId: USER_A.clerkId, customer: "cus_beta" }),
        ),
        deps.value,
      ),
    ).rejects.toBeInstanceOf(StripeOwnershipError);
    expect(deps.syncSubscription).not.toHaveBeenCalled();
  });

  it("classifies a signed handled event without a customer ID as malformed", async () => {
    const deps = dependencies({ clerkOwners: { [USER_A.clerkId]: USER_A } });
    await expect(
      processStripeEvent(
        event(
          "checkout.session.completed",
          checkout({ clerkId: USER_A.clerkId, customer: null }),
        ),
        deps.value,
      ),
    ).rejects.toBeInstanceOf(StripeWebhookInputError);
    expect(deps.syncSubscription).not.toHaveBeenCalled();
  });
});

describe("owner business alerts", () => {
  function liveEvent(type: string, object: unknown, id = "evt_live") {
    return {
      id,
      type,
      created: 1790000000,
      livemode: true,
      data: { object },
    } as Stripe.Event;
  }
  it("uses a paid invoice, not checkout completion, as the payment signal", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    const notifyOwnerEmail = vi.fn();
    deps.value.notifyOwnerEmail = notifyOwnerEmail;
    await processStripeEvent(
      liveEvent(
        "checkout.session.completed",
        checkout({ customer: "cus_alpha" }),
      ),
      deps.value,
    );
    expect(notifyOwnerEmail).not.toHaveBeenCalled();
    await processStripeEvent(
      liveEvent("invoice.paid", {
        id: "in_paid",
        subscription: "sub_test",
        amount_paid: 900,
        currency: "usd",
        billing_reason: "subscription_create",
      }),
      deps.value,
    );
    expect(notifyOwnerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "payment",
        key: "in_paid",
        userId: USER_A.id,
        amount: 900,
        currency: "usd",
      }),
    );
  });
  it("ignores free invoices and test payments", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    const notifyOwnerEmail = vi.fn();
    deps.value.notifyOwnerEmail = notifyOwnerEmail;
    await processStripeEvent(
      liveEvent("invoice.paid", {
        id: "in_free",
        subscription: "sub_test",
        amount_paid: 0,
        currency: "usd",
      }),
      deps.value,
    );
    await processStripeEvent(
      {
        ...liveEvent("invoice.paid", {
          id: "in_test",
          subscription: "sub_test",
          amount_paid: 900,
          currency: "usd",
        }),
        livemode: false,
      },
      deps.value,
    );
    expect(notifyOwnerEmail).not.toHaveBeenCalled();
  });
  it("uses the invoice identity across repeated failure attempts", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    const notifyOwnerEmail = vi.fn();
    deps.value.notifyOwnerEmail = notifyOwnerEmail;
    for (const id of ["evt_attempt1", "evt_attempt2"])
      await processStripeEvent(
        liveEvent(
          "invoice.payment_failed",
          {
            id: "in_failed",
            subscription: "sub_test",
            amount_due: 900,
            currency: "usd",
          },
          id,
        ),
        deps.value,
      );
    expect(notifyOwnerEmail.mock.calls.map(([input]) => input.key)).toEqual([
      "in_failed",
      "in_failed",
    ]);
  });
  it("retries the webhook when the durable queue is unavailable", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    deps.value.notifyOwnerEmail = vi
      .fn()
      .mockRejectedValue(new Error("queue unavailable"));
    await expect(
      processStripeEvent(
        liveEvent("invoice.paid", {
          id: "in_paid",
          subscription: "sub_test",
          amount_paid: 900,
          currency: "usd",
        }),
        deps.value,
      ),
    ).rejects.toThrow("queue unavailable");
  });
});

describe("owner alerts for revenue risks", () => {
  function live(type: string, object: unknown) {
    return {
      id: "evt_risk",
      created: 1790000000,
      livemode: true,
      type,
      data: { object },
    } as Stripe.Event;
  }
  it("reports an ended subscription once by subscription identity", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    const notifyOwnerEmail = vi.fn();
    deps.value.notifyOwnerEmail = notifyOwnerEmail;
    await processStripeEvent(
      live(
        "customer.subscription.deleted",
        subscription({ customer: "cus_alpha", status: "canceled" }),
      ),
      deps.value,
    );
    expect(notifyOwnerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "cancellation",
        key: "sub_test",
        userId: USER_A.id,
      }),
    );
  });
  it("reports refunds as cumulative amounts and keeps new refund increments distinct", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    const notifyOwnerEmail = vi.fn();
    deps.value.notifyOwnerEmail = notifyOwnerEmail;
    for (const amount of [300, 900])
      await processStripeEvent(
        live("charge.refunded", {
          id: "ch_paid",
          customer: "cus_alpha",
          invoice: "in_paid",
          amount_refunded: amount,
          currency: "usd",
        }),
        deps.value,
      );
    expect(notifyOwnerEmail.mock.calls.map(([input]) => input.key)).toEqual([
      "ch_paid:300",
      "ch_paid:900",
    ]);
  });
  it("includes the dispute deadline and ignores charges outside AP3K", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    const notifyOwnerEmail = vi.fn();
    deps.value.notifyOwnerEmail = notifyOwnerEmail;
    await processStripeEvent(
      live("charge.dispute.created", {
        id: "dp_1",
        charge: { id: "ch_1", customer: "cus_alpha", invoice: "in_paid" },
        amount: 900,
        currency: "usd",
        evidence_details: { due_by: 1790000000 },
      }),
      deps.value,
    );
    expect(notifyOwnerEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "dispute",
        key: "dp_1",
        detail: expect.stringContaining("Evidence is due"),
      }),
    );
    notifyOwnerEmail.mockClear();
    await processStripeEvent(
      live("charge.refunded", {
        id: "ch_other",
        customer: "cus_other",
        invoice: "in_other",
        amount_refunded: 900,
        currency: "usd",
      }),
      deps.value,
    );
    expect(notifyOwnerEmail).not.toHaveBeenCalled();
  });
});

describe("referral invoice revenue", () => {
  const sub = {
    start_date: 100,
    billing_cycle_anchor: 200,
  } as Stripe.Subscription;
  it("excludes discounts and inclusive tax", () => {
    const invoice = {
      amount_paid: 648,
      total_tax_amounts: [{ amount: 108 }],
      lines: {
        data: [
          {
            type: "subscription",
            amount: 1080,
            discount_amounts: [{ amount: 432 }],
            tax_amounts: [{ amount: 108, inclusive: true }],
            period: { start: 200, end: 300 },
          },
        ],
      },
    } as unknown as Stripe.Invoice;
    expect(referralInvoiceRevenue(invoice, sub)).toMatchObject({
      basisCents: 540,
      subscriptionStart: new Date(200000),
    });
  });
  it("accepts current Stripe tax shape", () => {
    const invoice = {
      amount_paid: 1080,
      total_taxes: [{ amount: 180 }],
      lines: {
        data: [
          {
            parent: {
              type: "subscription_item_details",
              subscription_item_details: { proration: false },
            },
            amount: 1080,
            taxes: [{ amount: 180, tax_behavior: "inclusive" }],
            period: { start: 200, end: 300 },
          },
        ],
      },
    } as unknown as Stripe.Invoice;
    expect(referralInvoiceRevenue(invoice, sub).basisCents).toBe(900);
  });
  it("ignores nested prorations", () => {
    const invoice = {
      amount_paid: 900,
      lines: {
        data: [
          {
            parent: {
              type: "subscription_item_details",
              subscription_item_details: { proration: true },
            },
            amount: 900,
            period: { start: 200, end: 300 },
          },
        ],
      },
    } as unknown as Stripe.Invoice;
    expect(referralInvoiceRevenue(invoice, sub).basisCents).toBe(0);
  });
  it("pays a delayed eligible invoice after subscription cancellation", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    vi.mocked(deps.value.retrieveSubscription).mockResolvedValue(
      subscription({
        customer: "cus_alpha",
        status: "canceled",
        plan: "BUSINESS",
      }),
    );
    await processStripeEvent(
      event("invoice.paid", {
        id: "in_late",
        subscription: "sub_test",
        amount_paid: 2900,
        currency: "usd",
        status_transitions: { paid_at: 200 },
      }),
      deps.value,
    );
    expect(deps.qualifyPaidReferral).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "BUSINESS", amountPaid: 2900 }),
    );
    expect(deps.syncSubscription).toHaveBeenCalledWith(
      USER_A.id,
      expect.objectContaining({ plan: "FREE" }),
    );
  });
});

describe("current Stripe account webhook compatibility", () => {
  it("does not grant access while an asynchronous Checkout payment is pending", async () => {
    const deps = dependencies({ clerkOwners: { [USER_A.clerkId]: USER_A }, customerOwners: { cus_alpha: USER_A } });
    const result = await processStripeEvent(event("checkout.session.completed", { ...checkout({ clerkId: USER_A.clerkId, customer: "cus_alpha" }), payment_status: "unpaid" }), deps.value);
    expect(result.outcome).toBe("ignored");
    expect(deps.syncSubscription).not.toHaveBeenCalled();
  });
  it("fulfills a successful asynchronous Checkout payment", async () => {
    const deps = dependencies({ clerkOwners: { [USER_A.clerkId]: USER_A }, customerOwners: { cus_alpha: USER_A } });
    await processStripeEvent(event("checkout.session.async_payment_succeeded", { ...checkout({ clerkId: USER_A.clerkId, customer: "cus_alpha" }), payment_status: "paid" }), deps.value);
    expect(deps.syncSubscription).toHaveBeenCalledWith(USER_A.id, { customerId: "cus_alpha", plan: "PRO" });
  });
  it("resolves refund invoices through PaymentIntent invoice payments", async () => {
    const deps = dependencies({});
    deps.value.invoiceIdsForPaymentIntent = vi.fn(async () => ["in_one", "in_two"]);
    await processStripeEvent(event("charge.refunded", { id: "ch_current", payment_intent: "pi_current", amount: 2500, amount_refunded: 500 }), deps.value);
    expect(deps.value.invoiceIdsForPaymentIntent).toHaveBeenCalledWith("pi_current");
    expect(deps.reversePaidReferral).toHaveBeenCalledWith("in_one", "refund", 500, 2500);
    expect(deps.reversePaidReferral).toHaveBeenCalledWith("in_two", "refund", 500, 2500);
  });
  it("excludes externally paid invoices from referral qualification", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    deps.value.paidOffStripe = vi.fn(async () => 1500);
    await processStripeEvent(event("invoice.paid", { id: "in_external", parent: { subscription_details: { subscription: "sub_test" } }, amount_paid: 1500, currency: "usd" }), deps.value);
    expect(deps.qualifyPaidReferral).toHaveBeenCalledWith(expect.objectContaining({ paidOutOfBand: true }));
  });
});

describe("out-of-order Stripe lifecycle events", () => {
  it("does not restore paid access from an old active subscription event", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    vi.mocked(deps.value.retrieveSubscription).mockResolvedValue(subscription({ customer: "cus_alpha", status: "canceled" }));
    await processStripeEvent(event("customer.subscription.updated", subscription({ customer: "cus_alpha", status: "active", plan: "BUSINESS" })), deps.value);
    expect(deps.syncSubscription).toHaveBeenCalledWith(USER_A.id, { customerId: "cus_alpha", plan: "FREE" });
  });
  it("preserves a replacement plan when an obsolete subscription update arrives", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    vi.mocked(deps.value.retrieveSubscription).mockResolvedValue(subscription({ customer: "cus_alpha", status: "canceled" }));
    deps.value.remainingCustomerPlan = vi.fn(async () => "BUSINESS" as const);
    await processStripeEvent(event("customer.subscription.updated", subscription({ customer: "cus_alpha", status: "active" })), deps.value);
    expect(deps.syncSubscription).toHaveBeenCalledWith(USER_A.id, { customerId: "cus_alpha", plan: "BUSINESS" });
  });
  it("preserves a replacement paid subscription when an old cancellation arrives", async () => {
    const deps = dependencies({ customerOwners: { cus_alpha: USER_A } });
    deps.value.remainingCustomerPlan = vi.fn(async () => "BUSINESS" as const);
    deps.value.notifyCustomerEmail = vi.fn();
    await processStripeEvent(event("customer.subscription.deleted", subscription({ customer: "cus_alpha", status: "canceled" })), deps.value);
    expect(deps.syncSubscription).toHaveBeenCalledWith(USER_A.id, { customerId: "cus_alpha", plan: "BUSINESS" });
    expect(deps.value.notifyCustomerEmail).not.toHaveBeenCalled();
  });
});
