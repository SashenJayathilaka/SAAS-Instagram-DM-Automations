import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  $transaction: vi.fn(),
  referralInvoiceAdjustment: { findUnique: vi.fn(), upsert: vi.fn() },
  referralAttribution: { findUnique: vi.fn(), update: vi.fn() },
  referralPartner: { findUnique: vi.fn(), update: vi.fn() },
  referralCommission: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
  },
  referralWithdrawal: {
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn(),
  },
  subscription: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  integrations: { findMany: vi.fn() },
  adminAuditLog: { create: vi.fn() },
}));
const stripe = vi.hoisted(() => ({
  coupons: { create: vi.fn(), retrieve: vi.fn() },
  invoices: { list: vi.fn() },
}));
vi.mock("@/lib/billing-snapshot", () => ({
  getBillingLookup: vi.fn().mockResolvedValue({
    state: "subscription",
    snapshot: { status: "active" },
  }),
}));
vi.mock("@/lib/prisma", () => ({ client: db }));
vi.mock("@/lib/stripe", () => ({ stripe }));
vi.mock("@/lib/instagram-profile-snapshot", () => ({
  refreshInstagramProfileSnapshotForUser: vi.fn(),
}));
import { getBillingLookup } from "@/lib/billing-snapshot";
import {
  addUtcMonths,
  commissionForPeriod,
  createWithdrawal,
  ensureReferralPromo,
  qualifyRecurringCommission,
  referralCheckoutDiscount,
  reviewWithdrawal,
  reverseRecurringCommission,
  validReferralEmail,
} from "./referral-commissions";
const start = new Date("2026-01-01T00:00:00Z");
const input = {
  basisCents: 900,
  firstPeriodStart: start,
  periodStart: start,
  periodEnd: addUtcMonths(start, 1),
  promo: false,
};
const payment = {
  referredUserId: "friend",
  invoiceId: "in_1",
  subscriptionId: "sub_1",
  plan: "PRO",
  amountPaid: 900,
  currency: "usd",
  basisCents: 900,
  periodStart: start,
  periodEnd: addUtcMonths(start, 1),
  subscriptionStart: start,
  billingReason: "subscription_create",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getBillingLookup).mockResolvedValue({
    state: "subscription",
    snapshot: {
      status: "active",
      interval: "month",
      renewsAt: null,
      cancelAtPeriodEnd: false,
      lookupKey: "ap3k_pro_month",
    },
  });
  db.$transaction.mockImplementation((fn) => fn(db));
  db.referralPartner.findUnique.mockResolvedValue({
    id: "partner",
    userId: "owner",
    code: "AP3K-12345678",
  });
  db.referralAttribution.findUnique.mockResolvedValue({
    id: "attribution",
    partnerId: "partner",
    programVersion: 2,
    connectedAt: start,
    firstPeriodStart: null,
    partner: { userId: "owner" },
  });
  db.referralCommission.findUnique.mockResolvedValue(null);
  db.referralCommission.create.mockImplementation(async (value) => value.data);
  db.referralCommission.aggregate.mockResolvedValue({
    _sum: { amountCents: 1000, reversedCents: 100 },
  });
  db.referralWithdrawal.groupBy.mockResolvedValue([]);
  db.referralWithdrawal.count.mockResolvedValue(0);
  db.referralWithdrawal.create.mockImplementation(async (value) => value.data);
});
describe("commission contract", () => {
  it("pays30%of actualmonthlyrevenue", () =>
    expect(commissionForPeriod(input).amountCents).toBe(270));
  it("pays10%of discounted firstpayment", () =>
    expect(
      commissionForPeriod({ ...input, basisCents: 540, promo: true })
        .amountCents,
    ).toBe(54));
  it("pays30%after firstpromomonth", () =>
    expect(
      commissionForPeriod({
        ...input,
        promo: true,
        periodStart: addUtcMonths(start, 1),
        periodEnd: addUtcMonths(start, 2),
      }).amountCents,
    ).toBe(270));
  it("endsafter11months", () =>
    expect(
      commissionForPeriod({
        ...input,
        periodStart: addUtcMonths(start, 11),
        periodEnd: addUtcMonths(start, 12),
      }).amountCents,
    ).toBe(0));
  it("payslasteligiblemonthlyinvoice", () =>
    expect(
      commissionForPeriod({
        ...input,
        periodStart: addUtcMonths(start, 10),
        periodEnd: addUtcMonths(start, 11),
      }).amountCents,
    ).toBe(270));
  it("proratesannualpaymentto11months", () =>
    expect(
      commissionForPeriod({
        ...input,
        basisCents: 9000,
        periodEnd: addUtcMonths(start, 12),
      }).amountCents,
    ).toBe(2475));
  it("prorates partial finalmonth after anchorchange", () =>
    expect(
      commissionForPeriod({
        ...input,
        periodStart: new Date("2026-11-15T00:00:00Z"),
        periodEnd: new Date("2026-12-15T00:00:00Z"),
      }).amountCents,
    ).toBe(144));
  it("capsmonthendanchors", () =>
    expect(
      addUtcMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString(),
    ).toBe("2026-02-28T00:00:00.000Z"));
  it.each([0, -1, NaN, 0.1])("rejects invalid revenue %s", (basisCents) =>
    expect(commissionForPeriod({ ...input, basisCents }).amountCents).toBe(0),
  );
  it("rejectsperiodsbeforefirstpayment", () =>
    expect(
      commissionForPeriod({
        ...input,
        firstPeriodStart: addUtcMonths(start, 1),
      }).amountCents,
    ).toBe(0));
});
describe("invoice awards", () => {
  it("records durableinvoice dedup key andattribution", async () => {
    expect(await qualifyRecurringCommission(payment)).toMatchObject({
      invoiceId: "in_1",
      amountCents: 270,
      basisCents: 900,
    });
    expect(db.referralAttribution.update).toHaveBeenCalled();
  });
  it("doesn'tawardduplicate invoices", async () => {
    db.referralCommission.findUnique.mockResolvedValue({ id: "existing" });
    expect(await qualifyRecurringCommission(payment)).toBeNull();
    expect(db.referralCommission.create).not.toHaveBeenCalled();
  });
  it.each([
    { billingReason: "subscription_update" },
    { paidOutOfBand: true },
    { currency: "eur" },
    { plan: "FREE" },
    { amountPaid: 0 },
    { subscriptionId: undefined },
  ])("rejectsnonqualifyingpayment %o", async (override) => {
    expect(
      await qualifyRecurringCommission({ ...payment, ...override }),
    ).toBeNull();
    expect(db.referralCommission.create).not.toHaveBeenCalled();
  });
  it.each([{ programVersion: 1 }, { partner: { userId: "friend" } }])(
    "rejectsnonqualifyingattribution %o",
    async (override) => {
      db.referralAttribution.findUnique.mockResolvedValue({
        id: "a",
        programVersion: 2,
        connectedAt: start,
        partner: { userId: "owner" },
        ...override,
      });
      expect(await qualifyRecurringCommission(payment)).toBeNull();
    },
  );
  it("refundbeforepaidstillreversesaward", async () => {
    db.referralInvoiceAdjustment.findUnique.mockResolvedValue({
      disputed: true,
    });
    expect(await qualifyRecurringCommission(payment)).toMatchObject({
      amountCents: 270,
      reversedCents: 270,
    });
  });
  it("retains promo source on renewal without metadata", async () => {
    db.referralAttribution.findUnique.mockResolvedValue({
      id: "a",
      partnerId: "partner",
      programVersion: 2,
      connectedAt: start,
      firstPeriodStart: start,
      source: "PROMO",
      partner: { userId: "owner" },
    });
    await qualifyRecurringCommission({
      ...payment,
      promoApplied: false,
      periodStart: addUtcMonths(start, 1),
      periodEnd: addUtcMonths(start, 2),
    });
    expect(db.referralAttribution.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: "PROMO" }),
      }),
    );
  });
  it("consumes first payment before Instagram connects", async () => {
    db.referralAttribution.findUnique.mockResolvedValue({
      id: "a",
      programVersion: 2,
      connectedAt: null,
      partner: { userId: "owner" },
    });
    expect(await qualifyRecurringCommission(payment)).toMatchObject({
      amountCents: 270,
    });
    expect(db.referralAttribution.update).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { firstPeriodStart: start, source: "LINK" },
    });
  });
  it("capsrevenuetocashcollected", async () => {
    expect(
      await qualifyRecurringCommission({
        ...payment,
        amountPaid: 600,
        basisCents: 900,
      }),
    ).toMatchObject({ amountCents: 180 });
  });
  it("adjustspartialrefundcumulatively", async () => {
    db.referralCommission.findUnique.mockResolvedValue({
      id: "c",
      amountCents: 270,
      reversedCents: 0,
    });
    await reverseRecurringCommission("in_1", "refund", 450, 900);
    expect(db.referralCommission.update).toHaveBeenCalledWith({
      where: { id: "c" },
      data: { reversedCents: 135, reversalReason: "refund" },
    });
  });
  it("olderrefundeventcannotreduceadjustment", async () => {
    db.referralCommission.findUnique.mockResolvedValue({
      id: "c",
      amountCents: 270,
      reversedCents: 200,
    });
    await reverseRecurringCommission("in_1", "refund", 100, 900);
    expect(db.referralCommission.update).toHaveBeenCalledWith({
      where: { id: "c" },
      data: { reversedCents: 200, reversalReason: "refund" },
    });
  });
  it("disputereversesentirecommission", async () => {
    db.referralCommission.findUnique.mockResolvedValue({
      id: "c",
      amountCents: 270,
      reversedCents: 10,
    });
    await reverseRecurringCommission("in_1", "dispute");
    expect(db.referralCommission.update).toHaveBeenCalledWith({
      where: { id: "c" },
      data: { reversedCents: 270, reversalReason: "dispute" },
    });
  });
});
describe("withdrawal ledger", () => {
  it("reservesonlyavailablebalance", async () => {
    db.referralWithdrawal.groupBy.mockResolvedValue([
      { status: "PAID", _sum: { amountCents: 200 } },
    ]);
    expect(await createWithdrawal("owner", "Me@example.com")).toMatchObject({
      partnerId: "partner",
      amountCents: 700,
      paypalEmail: "me@example.com",
    });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
  it("blockstwooutstandingrequests", async () => {
    db.referralWithdrawal.count.mockResolvedValue(1);
    await expect(createWithdrawal("owner", "a@b.com")).rejects.toThrow(
      "existing withdrawal",
    );
    expect(db.referralWithdrawal.create).not.toHaveBeenCalled();
  });
  it("blocksnegativebalanceafterrefund", async () => {
    db.referralWithdrawal.groupBy.mockResolvedValue([
      { status: "PAID", _sum: { amountCents: 1000 } },
    ]);
    await expect(createWithdrawal("owner", "a@b.com")).rejects.toThrow(
      "No commission",
    );
  });
  it("blockspaymentifrefundreducedreservedfunds", async () => {
    db.referralWithdrawal.findUnique.mockResolvedValue({
      id: "w",
      status: "REQUESTED",
      partnerId: "partner",
      amountCents: 1000,
    });
    db.referralWithdrawal.groupBy.mockResolvedValue([
      { status: "REQUESTED", _sum: { amountCents: 1000 } },
    ]);
    await expect(
      reviewWithdrawal("w", "PAID", "admin", "paypal_123", "Verified request"),
    ).rejects.toThrow("Refund adjustments");
    expect(db.referralWithdrawal.update).not.toHaveBeenCalled();
  });
  it("blocksdoubleadminsettlement", async () => {
    db.referralWithdrawal.findUnique.mockResolvedValue({ status: "PAID" });
    await expect(
      reviewWithdrawal("w", "PAID", "admin", "paypal_123", "Verified request"),
    ).rejects.toThrow("already been reviewed");
  });
  it("invalidemailnevercreatesledgerentry", async () => {
    expect(() => validReferralEmail("abc\n@foo.com")).toThrow();
    await expect(createWithdrawal("owner", "notemail")).rejects.toThrow();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
describe("promo eligibility", () => {
  it("preserves existing promotion settings when billing cannot be verified", async () => {
    db.user.findUnique.mockResolvedValue({ clerkId: "clerk", subscription: { plan: "BUSINESS", customerId: "cus_stale" } });
    db.integrations.findMany.mockResolvedValue([]);
    vi.mocked(getBillingLookup).mockResolvedValue({ state: "unavailable", snapshot: null });
    await expect(ensureReferralPromo("owner")).rejects.toThrow("Billing could not be verified");
    expect(db.referralPartner.update).not.toHaveBeenCalled();
    expect(stripe.coupons.create).not.toHaveBeenCalled();
  });
  it("annualcheckoutneverappliesfirstmonthdiscount", async () => {
    expect(await referralCheckoutDiscount("friend", "year")).toBeNull();
    expect(db.referralAttribution.findUnique).not.toHaveBeenCalled();
  });
  it("freepartnercannotunlockcoupon", async () => {
    db.user.findUnique.mockResolvedValue({
      clerkId: "clerk",
      subscription: { plan: "FREE" },
    });
    db.integrations.findMany.mockResolvedValue([]);
    await expect(ensureReferralPromo("owner")).rejects.toThrow("paid plan");
    expect(stripe.coupons.create).not.toHaveBeenCalled();
  });
  it("stalesnapshotcannotunlockcoupon", async () => {
    db.user.findUnique.mockResolvedValue({
      clerkId: "clerk",
      subscription: { plan: "PRO" },
    });
    db.integrations.findMany.mockResolvedValue([
      {
        id: "ig",
        snapshots: [
          { followersCount: 100000, fetchedAt: new Date("2020-01-01") },
        ],
      },
    ]);
    await expect(ensureReferralPromo("owner")).rejects.toThrow("10,000");
    expect(stripe.coupons.create).not.toHaveBeenCalled();
  });
});

describe("promo authorization at checkout", () => {
  it("unlocks40%coupon for verified eligibleowner", async () => {
    db.user.findUnique.mockResolvedValue({
      clerkId: "owner",
      subscription: { plan: "PRO", customerId: "cus_owner" },
    });
    db.integrations.findMany.mockResolvedValue([
      {
        id: "ig",
        instagramUsername: "owner",
        snapshots: [{ followersCount: 10001, fetchedAt: new Date() }],
      },
    ]);
    stripe.coupons.retrieve.mockRejectedValue({ code: "resource_missing" });
    await ensureReferralPromo("owner");
    expect(stripe.coupons.create).toHaveBeenCalledWith(
      expect.objectContaining({ percent_off: 40, duration: "once" }),
      expect.anything(),
    );
    expect(db.referralPartner.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ promoEnabled: true, followers: 10001 }),
      }),
    );
  });
  it("Stripe priorpaidinvoice prevents repeated firstmonthcoupon", async () => {
    db.referralAttribution.findUnique.mockResolvedValue({
      programVersion: 2,
      source: "PROMO",
      partner: {
        userId: "owner",
        promoEnabled: true,
        stripeCouponId: "coupon",
      },
    });
    db.subscription.findUnique.mockResolvedValue({ customerId: "cus_friend" });
    stripe.invoices.list.mockResolvedValue({
      has_more: false,
      data: [{ amount_paid: 540 }],
    });
    expect(await referralCheckoutDiscount("friend", "month")).toBeNull();
  });
  it("pastdue subscription cannotunlockpromotion", async () => {
    db.user.findUnique.mockResolvedValue({
      clerkId: "owner",
      subscription: { plan: "PRO", customerId: "cus_owner" },
    });
    db.integrations.findMany.mockResolvedValue([
      {
        id: "ig",
        snapshots: [{ followersCount: 10001, fetchedAt: new Date() }],
      },
    ]);
    vi.mocked(getBillingLookup).mockResolvedValue({
      state: "subscription",
      snapshot: {
        status: "past_due",
        interval: "month",
        renewsAt: null,
        cancelAtPeriodEnd: false,
        lookupKey: "ap3k_pro_month",
      },
    });
    await expect(ensureReferralPromo("owner")).rejects.toThrow("paid plan");
    expect(stripe.coupons.create).not.toHaveBeenCalled();
  });
});
