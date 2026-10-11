import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), session: vi.fn(), subscription: vi.fn(), find: vi.fn(), create: vi.fn(), update: vi.fn(), rewards: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: mocks.user }));
vi.mock("@/lib/stripe", () => ({ stripe: { checkout: { sessions: { retrieve: mocks.session } }, subscriptions: { retrieve: mocks.subscription } } }));
vi.mock("@/actions/user/queries", () => ({ findUser: mocks.find, createUser: mocks.create, updateSubscription: mocks.update }));
vi.mock("@/lib/referral-program", () => ({ applyPendingReferralRewards: mocks.rewards }));
import { verifyCheckoutSession } from "./verify-checkout";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "user_owner", primaryEmailAddress: { emailAddress: "owner@example.com" }, emailAddresses: [] });
  mocks.session.mockResolvedValue({ status: "complete", payment_status: "paid", mode: "subscription", customer: "cus_owner", subscription: "sub_current", metadata: { clerkId: "user_owner", plan: "BUSINESS" } });
  mocks.subscription.mockResolvedValue({ status: "active", customer: "cus_owner", metadata: { plan: "BUSINESS" }, items: { data: [{ price: { id: "price_current", lookup_key: "ap3k_pro_month" } }] } });
  mocks.find.mockResolvedValue({ id: "db_owner", clerkId: "user_owner" });
});

describe("checkout recovery entitlement boundary", () => {
  it("uses the current subscription price after a plan change, never old session metadata", async () => {
    expect(await verifyCheckoutSession("cs_live_valid")).toMatchObject({ status: 200, plan: "PRO" });
    expect(mocks.subscription).toHaveBeenCalledWith("sub_current");
    expect(mocks.update).toHaveBeenCalledWith("user_owner", { customerId: "cus_owner", plan: "PRO" });
  });
  it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"])("does not resurrect %s subscriptions through old URLs", async status => {
    mocks.subscription.mockResolvedValue({ status });
    // Customer must still match even when the subscription is inactive.
    mocks.subscription.mockResolvedValue({ status, customer: "cus_owner" });
    expect(await verifyCheckoutSession("cs_live_valid")).toMatchObject({ status: 400, error: "subscription_inactive" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not grant access for a completed asynchronous checkout awaiting payment", async () => {
    mocks.session.mockResolvedValue({ ...(await mocks.session()), payment_status: "unpaid" });
    expect(await verifyCheckoutSession("cs_live_valid")).toMatchObject({ error: "payment_pending" });
    expect(mocks.subscription).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("accepts a zero-total checkout only with a current valid subscription", async () => {
    mocks.session.mockResolvedValue({ ...(await mocks.session()), payment_status: "no_payment_required" });
    expect(await verifyCheckoutSession("cs_live_valid")).toMatchObject({ status: 200 });
  });
  it("rejects another user's checkout", async () => {
    mocks.session.mockResolvedValue({ ...(await mocks.session()), metadata: { clerkId: "user_other" } });
    expect(await verifyCheckoutSession("cs_live_valid")).toMatchObject({ status: 403 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects a mismatched subscription customer", async () => {
    mocks.subscription.mockResolvedValue({ ...(await mocks.subscription()), customer: "cus_other" });
    expect(await verifyCheckoutSession("cs_live_valid")).toMatchObject({ error: "customer_mismatch" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects one-time checkout sessions", async () => {
    mocks.session.mockResolvedValue({ ...(await mocks.session()), mode: "payment", subscription: null });
    expect(await verifyCheckoutSession("cs_live_valid")).toMatchObject({ error: "missing_subscription" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not call Stripe without a session or with malformed input", async () => {
    expect(await verifyCheckoutSession("not-a-session")).toMatchObject({ status: 400 });
    mocks.user.mockResolvedValue(null);
    expect(await verifyCheckoutSession("cs_live_valid")).toMatchObject({ status: 401 });
    expect(mocks.session).not.toHaveBeenCalled();
  });
});
