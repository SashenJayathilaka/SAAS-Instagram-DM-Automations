import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    referralPartner: {
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    referralAttribution: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    referralReward: { create: vi.fn() },
    subscription: { updateMany: vi.fn() },
  };
  const client = {
    $transaction: vi.fn(),
    referralPartner: { findUnique: vi.fn(), create: vi.fn(), count: vi.fn() },
    referralAttribution: { groupBy: vi.fn(), findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    referralReward: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    subscription: { findUnique: vi.fn(), updateMany: vi.fn() },
  };
  const createBalanceTransaction = vi.fn();
  return { transaction, client, createBalanceTransaction };
});

vi.mock("@/lib/referral-commissions", () => ({ getRecurringDashboard: vi.fn().mockResolvedValue({}), reverseRecurringCommission: vi.fn(), qualifyRecurringCommission: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ client: mocks.client }));
vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      createBalanceTransaction: mocks.createBalanceTransaction,
      create: vi.fn(),
      del: vi.fn(),
    },
  },
}));

import {
  activateConnectionBenefits,
  applyPendingReferralRewards,
  createReferralAttribution,
  getReferralDashboard,
  normalizeReferralCode,
  qualifyReferralPayment,
  reverseReferralRewardForInvoice,
} from "./referral-program";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.$transaction.mockImplementation(async (callback: any) => callback(mocks.transaction));
  mocks.client.referralAttribution.updateMany.mockResolvedValue({ count: 1 });
});

describe("referral program", () => {
  it("normalizes valid codes and rejects unsafe input", () => {
    expect(normalizeReferralCode(" ap3k-ab12cd34 ")).toBe("AP3K-AB12CD34");
    expect(normalizeReferralCode("../../admin")).toBeNull();
    expect(normalizeReferralCode("")).toBeNull();
  });

  it("creates signup attribution only for a different valid partner", async () => {
    mocks.transaction.referralPartner.findUnique.mockResolvedValue({ id: "partner-1", userId: "referrer-1" });
    mocks.transaction.referralAttribution.create.mockResolvedValue({ id: "attribution-1" });

    await createReferralAttribution(mocks.transaction as any, "referred-1", "ap3k-ab12cd34");

    expect(mocks.transaction.referralAttribution.create).toHaveBeenCalledWith({
      data: { partnerId: "partner-1", referredUserId: "referred-1", programVersion: 2, source: "LINK" },
      select: { id: true },
    });

    mocks.transaction.referralPartner.findUnique.mockResolvedValue({ id: "partner-1", userId: "same-user" });
    await createReferralAttribution(mocks.transaction as any, "same-user", "AP3K-AB12CD34");
    expect(mocks.transaction.referralAttribution.create).toHaveBeenCalledTimes(1);
  });

  it("marks a referred user as connected without creating a separate trial entitlement", async () => {
    const now = new Date("2026-09-01T12:00:00Z");

    const result = await activateConnectionBenefits("user-1", now);

    expect(result).toEqual({ referralConnected: true });
    expect(mocks.client.referralAttribution.updateMany).toHaveBeenCalledWith({
      where: { referredUserId: "user-1", connectedAt: null },
      data: { connectedAt: now, status: "CONNECTED" },
    });
  });

  it("qualifies a connected paid referral and assigns the next Founding 10 rank", async () => {
    mocks.transaction.referralAttribution.findUnique.mockResolvedValue({
      id: "attribution-1",
      connectedAt: new Date(),
      reward: null,
      partner: { id: "partner-1", userId: "referrer-1", founderRank: null },
    });
    mocks.transaction.referralPartner.count.mockResolvedValue(3);
    mocks.transaction.referralPartner.update.mockResolvedValue({});
    mocks.transaction.referralReward.create.mockResolvedValue({ id: "reward-1" });
    mocks.transaction.referralAttribution.update.mockResolvedValue({});

    const result = await qualifyReferralPayment({
      referredUserId: "referred-1",
      invoiceId: "in_paid",
      plan: "PRO",
      amountPaid: 900,
      currency: "usd",
      paidAt: new Date("2026-09-01T13:00:00Z"),
    });

    expect(result).toMatchObject({ rewardId: "reward-1", referrerUserId: "referrer-1", founderRank: 4 });
    expect(mocks.transaction.referralReward.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        qualifyingInvoiceId: "in_paid",
        amountCents: 900,
        currency: "usd",
      }),
      select: { id: true },
    });
  });

  it("does not reward payments below $9 or users who never connected Instagram", async () => {
    await expect(qualifyReferralPayment({
      referredUserId: "referred-1",
      invoiceId: "in_small",
      plan: "PRO",
      amountPaid: 100,
      currency: "usd",
    })).resolves.toBeNull();
    expect(mocks.client.$transaction).not.toHaveBeenCalled();

    mocks.transaction.referralAttribution.findUnique.mockResolvedValue({
      id: "attribution-1",
      connectedAt: null,
      reward: null,
      partner: { id: "partner-1", userId: "referrer-1", founderRank: null },
    });
    await expect(qualifyReferralPayment({
      referredUserId: "referred-1",
      invoiceId: "in_unconnected",
      plan: "PRO",
      amountPaid: 900,
      currency: "usd",
    })).resolves.toBeNull();
    expect(mocks.transaction.referralReward.create).not.toHaveBeenCalled();
  });

  it("waitlists a new partner after all ten founding spots are taken", async () => {
    mocks.transaction.referralAttribution.findUnique.mockResolvedValue({
      id: "attribution-1",
      connectedAt: new Date(),
      reward: null,
      partner: { id: "partner-1", userId: "referrer-1", founderRank: null },
    });
    mocks.transaction.referralPartner.count.mockResolvedValue(10);
    mocks.transaction.referralAttribution.update.mockResolvedValue({});

    await expect(qualifyReferralPayment({
      referredUserId: "referred-1",
      invoiceId: "in_late",
      plan: "BUSINESS",
      amountPaid: 2900,
      currency: "usd",
    })).resolves.toBeNull();
    expect(mocks.transaction.referralAttribution.update).toHaveBeenCalledWith({
      where: { id: "attribution-1" },
      data: { status: "WAITLISTED", firstPaidInvoiceId: "in_late" },
    });
    expect(mocks.transaction.referralReward.create).not.toHaveBeenCalled();
  });

  it("applies pending credit as a negative Stripe customer balance transaction", async () => {
    mocks.client.referralReward.findMany.mockResolvedValue([
      { id: "reward-1", amountCents: 900, currency: "usd", createdAt: new Date() },
    ]);
    mocks.createBalanceTransaction.mockResolvedValue({ id: "cbtxn_1" });
    mocks.client.referralReward.updateMany.mockResolvedValue({ count: 1 });

    const result = await applyPendingReferralRewards("referrer-1", "cus_referrer");

    expect(result).toEqual({ found: 1, applied: 1 });
    expect(mocks.createBalanceTransaction).toHaveBeenCalledWith(
      "cus_referrer",
      expect.objectContaining({ amount: -900, currency: "usd" }),
      { idempotencyKey: "ap3k-referral-reward-1" }
    );
  });

  it("reverses a pending reward without touching Stripe", async () => {
    mocks.client.referralReward.findUnique.mockResolvedValue({
      id: "reward-1",
      status: "PENDING",
      amountCents: 900,
      currency: "usd",
      partner: { userId: "referrer-1" },
    });
    mocks.client.referralReward.updateMany.mockResolvedValue({ count: 1 });

    const result = await reverseReferralRewardForInvoice("in_refunded", "refund");

    expect(result).toMatchObject({ reversed: true, recoveredFromStripe: false });
    expect(mocks.createBalanceTransaction).not.toHaveBeenCalled();
    expect(mocks.client.referralReward.updateMany).toHaveBeenCalledWith({
      where: { id: "reward-1", status: "PENDING" },
      data: expect.objectContaining({ status: "REVERSED" }),
    });
  });

  it("offsets an applied reward on the referrer's Stripe customer", async () => {
    mocks.client.referralReward.findUnique.mockResolvedValue({
      id: "reward-1",
      status: "APPLIED",
      amountCents: 900,
      currency: "usd",
      partner: { userId: "referrer-1" },
    });
    mocks.client.subscription.findUnique.mockResolvedValue({ customerId: "cus_referrer" });
    mocks.createBalanceTransaction.mockResolvedValue({ id: "cbtxn_reversal" });
    mocks.client.referralReward.updateMany.mockResolvedValue({ count: 1 });

    const result = await reverseReferralRewardForInvoice("in_disputed", "dispute");

    expect(result).toMatchObject({ reversed: true, recoveredFromStripe: true });
    expect(mocks.createBalanceTransaction).toHaveBeenCalledWith(
      "cus_referrer",
      expect.objectContaining({ amount: 900, currency: "usd" }),
      { idempotencyKey: "ap3k-referral-reversal-reward-1" }
    );
  });

  it("shows accurate referral totals and excludes reversed credit", async () => {
    mocks.client.referralPartner.findUnique.mockResolvedValue({
      id: "partner-1", userId: "referrer-1", code: "AP3K-AB12CD34", founderRank: null,
    });
    mocks.client.referralPartner.count.mockResolvedValue(2);
    mocks.client.referralAttribution.groupBy.mockResolvedValue([
      { status: "SIGNED_UP", _count: { _all: 3 } },
      { status: "CONNECTED", _count: { _all: 2 } },
      { status: "QUALIFIED", _count: { _all: 1 } },
      { status: "WAITLISTED", _count: { _all: 1 } },
    ]);
    mocks.client.referralReward.groupBy.mockResolvedValue([
      { status: "PENDING", _count: { _all: 1 }, _sum: { amountCents: 900 } },
      { status: "APPLIED", _count: { _all: 1 }, _sum: { amountCents: 900 } },
      { status: "REVERSED", _count: { _all: 1 }, _sum: { amountCents: 900 } },
    ]);
    mocks.client.referralAttribution.findMany.mockResolvedValue([{
      id: "attribution-refunded",
      status: "QUALIFIED",
      createdAt: new Date("2026-09-01T12:00:00Z"),
      connectedAt: new Date("2026-09-01T12:30:00Z"),
      qualifiedAt: new Date("2026-09-01T13:00:00Z"),
      reward: { status: "REVERSED" },
      referredUser: { firstname: "Sam" },
    }]);

    const result = await getReferralDashboard("referrer-1");

    expect(result.stats).toMatchObject({
      invited: 7,
      connected: 4,
      qualified: 2,
      creditEarnedCents: 1800,
      creditPendingCents: 900,
      creditAppliedCents: 900,
    });
    expect(result.founderSlotsRemaining).toBe(8);
    expect(result.recentReferrals[0]).toMatchObject({ name: "Sam", status: "REVERSED" });
  });
});
