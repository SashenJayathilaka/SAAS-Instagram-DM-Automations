import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import {
  StripeOwnershipError,
  type StripeOwner,
  type StripeWebhookDependencies,
  processStripeEvent,
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

function event(object: unknown) {
  return {
    id: "evt_account_deleted",
    type: "customer.subscription.deleted",
    data: { object },
  } as Stripe.Event;
}

function subscription(clerkId: string, customerId: string) {
  return {
    id: "sub_deleted",
    customer: customerId,
    metadata: { clerkId },
    status: "canceled",
  } as unknown as Stripe.Subscription;
}

function dependencies(input?: {
  clerkOwner?: StripeOwner | null;
  customerOwner?: StripeOwner | null;
}) {
  const syncSubscription = vi.fn();
  const value: StripeWebhookDependencies = {
    findOwnerByClerkId: vi.fn(async () => input?.clerkOwner ?? null),
    findOwnerByCustomerId: vi.fn(async () => input?.customerOwner ?? null),
    syncSubscription,
    retrieveSubscription: vi.fn(async () => subscription("user_test", "cus_test")),
    retrieveCharge: vi.fn(),
    applyPendingRewards: vi.fn(async () => undefined),
    qualifyPaidReferral: vi.fn(async () => undefined),
    reversePaidReferral: vi.fn(async () => undefined),
    warnStaleMetadata: vi.fn(),
  };
  return { value, syncSubscription };
}

describe("Stripe events emitted by AP3K account deletion", () => {
  it("safely ignores a deleted-subscription event after the AP3K owner is gone", async () => {
    const deps = dependencies();

    await expect(
      processStripeEvent(
        event(subscription("deleted-clerk-user", "cus_deleted")),
        deps.value
      )
    ).resolves.toEqual({
      outcome: "ignored",
      source: "unowned-deleted-customer",
    });

    expect(deps.syncSubscription).not.toHaveBeenCalled();
  });

  it("still fails closed when deletion-event ownership conflicts", async () => {
    const deps = dependencies({ clerkOwner: USER_A, customerOwner: USER_B });

    await expect(
      processStripeEvent(
        event(subscription(USER_A.clerkId, USER_B.customerId!)),
        deps.value
      )
    ).rejects.toBeInstanceOf(StripeOwnershipError);

    expect(deps.syncSubscription).not.toHaveBeenCalled();
  });

  it("still downgrades an existing AP3K owner before account data is removed", async () => {
    const deps = dependencies({ clerkOwner: USER_A, customerOwner: USER_A });

    await expect(
      processStripeEvent(
        event(subscription(USER_A.clerkId, USER_A.customerId!)),
        deps.value
      )
    ).resolves.toMatchObject({ outcome: "processed" });

    expect(deps.syncSubscription).toHaveBeenCalledWith(USER_A.id, {
      customerId: USER_A.customerId,
      plan: "FREE",
    });
  });
});
