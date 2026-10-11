import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCurrentUser = vi.fn();
const mockUserFindUnique = vi.fn();
const mockSubscriptionUpsert = vi.fn();
const mockSubscriptionUpdateMany = vi.fn();
const mockPortalCreate = vi.fn();
const mockCustomerList = vi.fn();
const mockSubscriptionList = vi.fn();
const mockCheckoutSessionList = vi.fn();
const mockBillingLookup = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: (...args: unknown[]) => mockCurrentUser(...args),
}));

vi.mock("@/lib/prisma", () => ({
  client: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    subscription: { updateMany: (...args: unknown[]) => mockSubscriptionUpdateMany(...args), upsert: (...args: unknown[]) => mockSubscriptionUpsert(...args) },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: { list: (...args: unknown[]) => mockCustomerList(...args) },
    subscriptions: { list: (...args: unknown[]) => mockSubscriptionList(...args) },
    checkout: {
      sessions: { list: (...args: unknown[]) => mockCheckoutSessionList(...args) },
    },
    billingPortal: {
      sessions: { create: (...args: unknown[]) => mockPortalCreate(...args) },
    },
  },
}));

vi.mock("@/lib/billing-snapshot", () => ({
  getBillingLookup: (...args: unknown[]) => mockBillingLookup(...args),
}));

import { POST } from "@/app/api/billing/portal/route";

function portalRequest(body?: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/billing/portal", {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Stripe Customer Portal route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_configured");
    vi.stubEnv("STRIPE_CLIENT_SECRET", "");
    vi.stubEnv("NEXT_PUBLIC_HOST_URL", "https://preview.ap3k.test/");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL_URL", "");
    mockCurrentUser.mockResolvedValue({ id: "clerk-user-a" });
    mockUserFindUnique.mockResolvedValue({
      id: "user-a",
      clerkId: "clerk-user-a",
      email: "owner@example.com",
      subscription: { customerId: "cus_owned_by_a", plan: "PRO" },
    });
    mockCustomerList.mockResolvedValue({ data: [] });
    mockSubscriptionList.mockResolvedValue({ data: [] });
    mockCheckoutSessionList.mockResolvedValue({ data: [] });
    mockSubscriptionUpsert.mockResolvedValue({});
    mockSubscriptionUpdateMany.mockResolvedValue({ count: 1 });
    mockBillingLookup.mockResolvedValue({
      state: "subscription",
      snapshot: { status: "active" },
    });
    mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.test/session-a" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const response = await POST(portalRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "not_authenticated" } });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it("returns a safe error when the authenticated AP3K user is missing", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const response = await POST(portalRequest());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "user_not_found" } });
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it("does not create a session without a linked Stripe customer", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-a",
      clerkId: "clerk-user-a",
      email: "owner@example.com",
      subscription: { customerId: null, plan: "PRO" },
    });

    const response = await POST(portalRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "customer_not_linked" } });
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it("does not open an empty portal for internal plan access", async () => {
    mockBillingLookup.mockResolvedValue({ state: "none", snapshot: null });

    const response = await POST(portalRequest());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "subscription_not_found" },
    });
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it("does not clear an unresolved stale billing link or start another subscription", async () => {
    mockBillingLookup.mockResolvedValue({ state: "unavailable", snapshot: null, reason: "customer_missing" });
    const response = await POST(portalRequest());
    expect(response.status).toBe(409);
    expect(mockSubscriptionUpdateMany).not.toHaveBeenCalled();
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it("recovers a missing customer only with Stripe ownership proof and a verified subscription", async () => {
    mockBillingLookup.mockResolvedValueOnce({ state: "unavailable", snapshot: null, reason: "customer_missing" });
    mockCustomerList.mockResolvedValue({ data: [{ id: "cus_recovered", created: 1 }] });
    mockSubscriptionList.mockResolvedValue({ data: [{ status: "active", metadata: { clerkId: "clerk-user-a" } }] });
    const response = await POST(portalRequest());
    expect(response.status).toBe(200);
    expect(mockSubscriptionUpdateMany).toHaveBeenCalledWith({ where: { userId: "user-a", customerId: "cus_owned_by_a" }, data: { customerId: "cus_recovered" } });
    expect(mockPortalCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_recovered" }));
  });

  it("does not overwrite a billing link changed by a concurrent webhook", async () => {
    mockBillingLookup.mockResolvedValueOnce({ state: "unavailable", snapshot: null, reason: "customer_missing" });
    mockCustomerList.mockResolvedValue({ data: [{ id: "cus_recovered", created: 1 }] });
    mockSubscriptionList.mockResolvedValue({ data: [{ status: "active", metadata: { clerkId: "clerk-user-a" } }] });
    mockSubscriptionUpdateMany.mockResolvedValue({ count: 0 });
    expect((await POST(portalRequest())).status).toBe(409);
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it("uses only the authenticated user's stored Stripe customer", async () => {
    const response = await POST(portalRequest());

    expect(response.status).toBe(200);
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { clerkId: "clerk-user-a" },
      select: {
        clerkId: true,
        id: true,
        email: true,
        subscription: { select: { customerId: true, plan: true } },
      },
    });
    expect(mockPortalCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_owned_by_a" }));
  });

  it("returns to the authenticated user's AP3K Billing page", async () => {
    await POST(portalRequest());

    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: "cus_owned_by_a",
      return_url: "https://preview.ap3k.test/dashboard/clerk-user-a/billing",
    });
  });

  it("recovers and persists a provably owned Stripe customer after a webhook delay", async () => {
    mockUserFindUnique.mockResolvedValue({
      id: "user-a",
      clerkId: "clerk-user-a",
      email: "owner@example.com",
      subscription: { customerId: null, plan: "PRO" },
    });
    mockCustomerList.mockResolvedValue({
      data: [{ id: "cus_recovered", email: "owner@example.com", created: 10 }],
    });
    mockSubscriptionList.mockResolvedValue({
      data: [{ status: "active", metadata: { clerkId: "clerk-user-a" } }],
    });

    const response = await POST(portalRequest());

    expect(response.status).toBe(200);
    expect(mockSubscriptionUpsert).toHaveBeenCalledWith({
      where: { userId: "user-a" },
      create: { userId: "user-a", customerId: "cus_recovered", plan: "PRO" },
      update: { customerId: "cus_recovered" },
    });
    expect(mockPortalCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_recovered" }));
  });

  it("ignores browser-supplied customer and user identifiers", async () => {
    await POST(portalRequest({
      customerId: "cus_attacker_selected",
      userId: "user-b",
      clerkId: "clerk-user-b",
      email: "other@example.com",
      returnUrl: "https://evil.example",
    }));

    expect(mockPortalCreate).toHaveBeenCalledWith(expect.objectContaining({
      customer: "cus_owned_by_a",
      return_url: "https://preview.ap3k.test/dashboard/clerk-user-a/billing",
    }));
    expect(JSON.stringify(mockPortalCreate.mock.calls)).not.toContain("cus_attacker_selected");
    expect(JSON.stringify(mockPortalCreate.mock.calls)).not.toContain("evil.example");
  });

  it("cannot cross into another user's customer portal", async () => {
    await POST(portalRequest({ customerId: "cus_owned_by_b" }));

    expect(mockUserFindUnique.mock.calls[0][0].where).toEqual({ clerkId: "clerk-user-a" });
    expect(mockPortalCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_owned_by_a" }));
    expect(mockPortalCreate).not.toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_owned_by_b" }));
  });

  it("returns a safe failure when Stripe rejects portal creation", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockPortalCreate.mockRejectedValue({ type: "StripeInvalidRequestError", code: "resource_missing" });

    const response = await POST(portalRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "portal_session_failed" } });
  });

  it("reports Stripe as unavailable when server configuration is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_CLIENT_SECRET", "");

    const response = await POST(portalRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "stripe_unavailable" } });
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });
});
