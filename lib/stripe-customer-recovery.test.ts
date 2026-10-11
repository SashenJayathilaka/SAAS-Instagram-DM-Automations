import { describe, expect, it, vi } from "vitest";
import { recoverOwnedStripeCustomerId } from "./stripe-customer-recovery";

function stripeClient(input: {
  customers?: any[];
  subscriptions?: Record<string, any[]>;
  sessions?: Record<string, any[]>;
} = {}) {
  return {
    customers: {
      list: vi.fn(async () => ({ data: input.customers ?? [] })),
    },
    subscriptions: {
      list: vi.fn(async ({ customer }: { customer: string }) => ({
        data: input.subscriptions?.[customer] ?? [],
      })),
    },
    checkout: {
      sessions: {
        list: vi.fn(async ({ customer }: { customer: string }) => ({
          data: input.sessions?.[customer] ?? [],
        })),
      },
    },
  } as any;
}

describe("Stripe customer recovery", () => {
  it("never trusts an email match without AP3K ownership metadata", async () => {
    const result = await recoverOwnedStripeCustomerId(
      stripeClient({
        customers: [{ id: "cus_email_only", email: "owner@example.com", created: 1 }],
        subscriptions: { cus_email_only: [{ status: "active", metadata: {} }] },
      }),
      { clerkId: "clerk-owner", email: "owner@example.com" }
    );

    expect(result).toBeNull();
  });

  it("recovers a customer from matching subscription metadata", async () => {
    const result = await recoverOwnedStripeCustomerId(
      stripeClient({
        customers: [{ id: "cus_owned", email: "owner@example.com", created: 1 }],
        subscriptions: {
          cus_owned: [{ status: "active", metadata: { clerkId: "clerk-owner" } }],
        },
      }),
      { clerkId: "clerk-owner", email: "owner@example.com" }
    );

    expect(result).toBe("cus_owned");
  });

  it("recovers legacy checkout ownership through client_reference_id", async () => {
    const result = await recoverOwnedStripeCustomerId(
      stripeClient({
        customers: [{ id: "cus_checkout", email: "owner@example.com", created: 1 }],
        sessions: {
          cus_checkout: [{ client_reference_id: "clerk-owner", metadata: {} }],
        },
      }),
      { clerkId: "clerk-owner", email: "owner@example.com" }
    );

    expect(result).toBe("cus_checkout");
  });

  it("prefers a manageable active subscription when duplicate customers exist", async () => {
    const result = await recoverOwnedStripeCustomerId(
      stripeClient({
        customers: [
          { id: "cus_old", email: "owner@example.com", created: 20 },
          { id: "cus_active", email: "owner@example.com", created: 10 },
        ],
        subscriptions: {
          cus_old: [{ status: "canceled", metadata: { clerkId: "clerk-owner" } }],
          cus_active: [{ status: "active", metadata: { clerkId: "clerk-owner" } }],
        },
      }),
      { clerkId: "clerk-owner", email: "owner@example.com" }
    );

    expect(result).toBe("cus_active");
  });
});
