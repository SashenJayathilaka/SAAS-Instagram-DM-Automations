import { client } from "@/lib/prisma";
import { getBillingLookup } from "@/lib/billing-snapshot";
import { stripe } from "@/lib/stripe";
import type { Prisma } from "@prisma/client";
import { refreshInstagramProfileSnapshotForUser } from "@/lib/instagram-profile-snapshot";

export const REFERRAL_MONTHS = 11;
export const REFERRAL_FOLLOWERS = 10_000;
export class ReferralError extends Error {}

export function addUtcMonths(value: Date, months: number) {
  const result = new Date(value);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  result.setUTCDate(
    Math.min(
      day,
      new Date(
        Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
      ).getUTCDate(),
    ),
  );
  return result;
}

/** Revenue after discounts, excluding tax. Annual invoices earn only eligible months. */
export function commissionForPeriod(input: {
  basisCents: number;
  firstPeriodStart: Date;
  periodStart: Date;
  periodEnd: Date;
  promo: boolean;
}) {
  const { firstPeriodStart, periodStart, periodEnd } = input;
  if (
    ![firstPeriodStart, periodStart, periodEnd].every((date) =>
      Number.isFinite(date.getTime()),
    ) ||
    !Number.isSafeInteger(input.basisCents) ||
    input.basisCents <= 0 ||
    periodEnd <= periodStart ||
    periodStart < firstPeriodStart
  )
    return { amountCents: 0, rateBps: 3000 };
  const windowEnd = addUtcMonths(firstPeriodStart, REFERRAL_MONTHS);
  const overlapEnd = Math.min(periodEnd.getTime(), windowEnd.getTime());
  if (overlapEnd <= periodStart.getTime())
    return { amountCents: 0, rateBps: 3000 };
  const firstMonthEnd = addUtcMonths(firstPeriodStart, 1).getTime();
  const duration = periodEnd.getTime() - periodStart.getTime();
  const eligible = overlapEnd - periodStart.getTime();
  const discountedDuration = input.promo
    ? Math.max(0, Math.min(overlapEnd, firstMonthEnd) - periodStart.getTime())
    : 0;
  // Month-aligned annual billing uses exact month shares, not varying month lengths.
  const fullMonths = Array.from({ length: 13 }, (_, n) => n).find(
    (n) =>
      n > 0 && addUtcMonths(periodStart, n).getTime() === periodEnd.getTime(),
  );
  const boundaryAligned =
    fullMonths &&
    Array.from({ length: fullMonths + 1 }, (_, n) =>
      addUtcMonths(periodStart, n).getTime(),
    ).includes(overlapEnd);
  const eligibleMonths =
    fullMonths && boundaryAligned
      ? Array.from({ length: fullMonths }, (_, n) =>
          addUtcMonths(periodStart, n),
        ).filter((date) => date < windowEnd).length
      : null;
  const fraction =
    eligibleMonths !== null
      ? eligibleMonths / fullMonths!
      : eligible / duration;
  const amountCents = Math.round(
    input.basisCents * (fraction * 0.3 - (discountedDuration / duration) * 0.2),
  );
  return {
    amountCents: Math.max(0, amountCents),
    rateBps: discountedDuration > 0 ? 1000 : 3000,
  };
}

export async function serializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await client.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (attempt < 3 && (code === "P2034" || code === "P2002")) continue;
      throw error;
    }
  }
}

export type RecurringPayment = {
  referredUserId: string;
  invoiceId: string;
  subscriptionId?: string;
  plan: string;
  amountPaid: number;
  currency: string;
  paidAt?: Date;
  basisCents?: number;
  periodStart?: Date;
  periodEnd?: Date;
  subscriptionStart?: Date;
  billingReason?: string | null;
  promoApplied?: boolean;
  paidOutOfBand?: boolean;
};

export async function qualifyRecurringCommission(input: RecurringPayment) {
  if (
    !input.subscriptionId ||
    !input.periodStart ||
    !input.periodEnd ||
    !input.subscriptionStart ||
    input.paidOutOfBand ||
    !["subscription_create", "subscription_cycle"].includes(
      input.billingReason ?? "",
    ) ||
    !["PRO", "BUSINESS"].includes(input.plan) ||
    input.currency.toLowerCase() !== "usd" ||
    input.amountPaid <= 0
  )
    return null;
  return serializable(async (tx) => {
    const attribution = await tx.referralAttribution.findUnique({
      where: { referredUserId: input.referredUserId },
      include: { partner: true },
    });
    if (
      !attribution ||
      attribution.programVersion !== 2 ||
      !attribution.partner.userId ||
      attribution.partner.userId === input.referredUserId
    )
      return null;
    if (
      await tx.referralCommission.findUnique({
        where: { invoiceId: input.invoiceId },
      })
    )
      return null;
    const firstPeriodStart =
      attribution.firstPeriodStart ?? input.subscriptionStart!;
    const basisCents = Math.min(
      input.amountPaid,
      Math.max(0, input.basisCents ?? input.amountPaid),
    );
    const promo = attribution.firstPeriodStart
      ? attribution.source === "PROMO"
      : input.promoApplied === true;
    // Consume the first-paid period even when Instagram has not been connected yet.
    // Connecting later must not restart the reward window or unlock another first-month coupon.
    if (!attribution.firstPeriodStart)
      await tx.referralAttribution.update({
        where: { id: attribution.id },
        data: { firstPeriodStart, source: promo ? "PROMO" : "LINK" },
      });

    const computed = commissionForPeriod({
      basisCents,
      firstPeriodStart,
      periodStart: input.periodStart!,
      periodEnd: input.periodEnd!,
      promo,
    });
    if (computed.amountCents <= 0) return null;
    const adjustment = await tx.referralInvoiceAdjustment.findUnique({
      where: { invoiceId: input.invoiceId },
    });
    const reversedCents = adjustment
      ? Math.round(
          computed.amountCents *
            (adjustment.disputed || adjustment.fullReversal
              ? 1
              : adjustment.chargedCents > 0
                ? Math.min(
                    1,
                    adjustment.refundedCents / adjustment.chargedCents,
                  )
                : 0),
        )
      : 0;
    const commission = await tx.referralCommission.create({
      data: {
        reversedCents,
        reversalReason: adjustment
          ? adjustment.disputed
            ? "dispute"
            : "refund"
          : null,
        partnerId: attribution.partnerId,
        attributionId: attribution.id,
        invoiceId: input.invoiceId,
        subscriptionId: input.subscriptionId!,
        basisCents,
        ...computed,
        periodStart: input.periodStart!,
        periodEnd: input.periodEnd!,
      },
    });
    await tx.referralAttribution.update({
      where: { id: attribution.id },
      data: {
        firstPeriodStart,
        source: promo ? "PROMO" : "LINK",
        ...(attribution.connectedAt
          ? {
              status: "QUALIFIED" as const,
              qualifiedAt:
                attribution.qualifiedAt ?? input.paidAt ?? new Date(),
            }
          : {}),
      },
    });
    return commission;
  });
}

export async function reverseRecurringCommission(
  invoiceId: string,
  reason: "refund" | "dispute",
  refundedCents?: number,
  chargedCents?: number,
) {
  return serializable(async (tx) => {
    const previous = await tx.referralInvoiceAdjustment.findUnique({
      where: { invoiceId },
    });
    const values = {
      refundedCents: Math.max(previous?.refundedCents ?? 0, refundedCents ?? 0),
      chargedCents: Math.max(previous?.chargedCents ?? 0, chargedCents ?? 0),
      disputed: previous?.disputed === true || reason === "dispute",
      fullReversal:
        previous?.fullReversal === true ||
        (reason === "refund" && (!chargedCents || refundedCents === undefined)),
    };
    await tx.referralInvoiceAdjustment.upsert({
      where: { invoiceId },
      create: { invoiceId, ...values },
      update: values,
    });
    const commission = await tx.referralCommission.findUnique({
      where: { invoiceId },
    });
    if (!commission) return null;
    const ratio =
      values.disputed || values.fullReversal
        ? 1
        : Math.min(1, Math.max(0, values.refundedCents / values.chargedCents));
    const reversedCents = Math.max(
      commission.reversedCents,
      Math.round(commission.amountCents * ratio),
    );
    return tx.referralCommission.update({
      where: { id: commission.id },
      data: { reversedCents, reversalReason: reason },
    });
  });
}

export async function referralBalance(
  tx: Prisma.TransactionClient,
  partnerId: string,
) {
  const [earned, withdrawals] = await Promise.all([
    tx.referralCommission.aggregate({
      where: { partnerId, attribution: { connectedAt: { not: null } } },
      _sum: { amountCents: true, reversedCents: true },
    }),
    tx.referralWithdrawal.groupBy({
      by: ["status"],
      where: { partnerId },
      _sum: { amountCents: true },
    }),
  ]);
  const earnedCents =
    (earned._sum.amountCents ?? 0) - (earned._sum.reversedCents ?? 0);
  const paidCents =
    withdrawals.find((row) => row.status === "PAID")?._sum.amountCents ?? 0;
  const reservedCents =
    withdrawals.find((row) => row.status === "REQUESTED")?._sum.amountCents ??
    0;
  return {
    earnedCents,
    paidCents,
    reservedCents,
    availableCents: Math.max(0, earnedCents - paidCents - reservedCents),
    balanceCents: earnedCents - paidCents - reservedCents,
  };
}

export function validReferralEmail(input: string) {
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
    throw new ReferralError("Enter a valid email address.");
  return email;
}

export async function createWithdrawal(userId: string, email: string) {
  const paypalEmail = validReferralEmail(email);
  return serializable(async (tx) => {
    const partner = await tx.referralPartner.findUnique({ where: { userId } });
    if (!partner) throw new ReferralError("No referral balance is available.");
    if (
      await tx.referralWithdrawal.count({
        where: { partnerId: partner.id, status: "REQUESTED" },
      })
    )
      throw new ReferralError("Your existing withdrawal is awaiting review.");
    const balance = await referralBalance(tx, partner.id);
    if (balance.availableCents < 1)
      throw new ReferralError("No commission is available to withdraw.");
    return tx.referralWithdrawal.create({
      data: {
        partnerId: partner.id,
        amountCents: balance.availableCents,
        paypalEmail,
      },
    });
  });
}

export async function reviewWithdrawal(
  id: string,
  action: "PAID" | "CANCELED",
  adminId: string,
  reference: string,
  note: string,
) {
  if (
    note.trim().length < 5 ||
    (action === "PAID" && reference.trim().length < 5)
  )
    throw new ReferralError(
      "Add a review note and, for a paid request, the real payment reference.",
    );
  return serializable(async (tx) => {
    const request = await tx.referralWithdrawal.findUnique({ where: { id } });
    if (!request || request.status !== "REQUESTED")
      throw new ReferralError("This withdrawal has already been reviewed.");
    const balance = await referralBalance(tx, request.partnerId);
    if (action === "PAID" && balance.balanceCents < 0)
      throw new ReferralError(
        "Refund adjustments reduced this balance. Cancel this request and ask the partner to request the corrected amount.",
      );
    const updated = await tx.referralWithdrawal.update({
      where: { id },
      data: {
        status: action,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        paymentReference: action === "PAID" ? reference.trim() : null,
        reviewNote: note.trim().slice(0, 500),
      },
    });
    await tx.adminAuditLog.create({
      data: {
        adminUserId: adminId,
        action: `referral.withdrawal.${action.toLowerCase()}`,
        targetType: "ReferralWithdrawal",
        targetId: id,
        reason: note.trim(),
        status: "SUCCESS",
        after: {
          amountCents: request.amountCents,
          status: action,
          paymentReference: updated.paymentReference,
        },
      },
    });
    return updated;
  });
}

export async function referralEligibility(userId: string, force = false) {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      clerkId: true,
      subscription: { select: { plan: true, customerId: true } },
    },
  });
  const accounts = await client.integrations.findMany({
    where: {
      userId,
      name: "INSTAGRAM",
      status: "CONNECTED",
      reconnectRequired: false,
      planLocked: false,
    },
    include: { snapshots: { orderBy: { fetchedAt: "desc" }, take: 1 } },
  });
  if (force && user) {
    for (const account of accounts)
      await refreshInstagramProfileSnapshotForUser(user.clerkId, account.id, {
        force: true,
      });
    return referralEligibility(userId, false);
  }
  const fresh = accounts.filter(
    (account) =>
      account.snapshots[0] &&
      Date.now() - account.snapshots[0].fetchedAt.getTime() < 24 * 60 * 60_000,
  );
  const best = fresh.sort(
    (a, b) =>
      (b.snapshots[0].followersCount ?? 0) -
      (a.snapshots[0].followersCount ?? 0),
  )[0];
  const followers = best?.snapshots[0].followersCount ?? 0;
  const storedPaidPlan =
    user?.subscription?.plan === "PRO" ||
    user?.subscription?.plan === "BUSINESS";
  const billing = storedPaidPlan
    ? await getBillingLookup(user?.subscription?.customerId)
    : null;
  const paidPlan =
    storedPaidPlan &&
    billing?.state === "subscription" &&
    billing.snapshot.status === "active";
  return {
    followers,
    paidPlan,
    plan: user?.subscription?.plan ?? "FREE",
    billingState: billing?.state ?? "none",
    eligible: paidPlan && followers >= REFERRAL_FOLLOWERS,
    username: best?.instagramUsername ?? null,
  };
}

export async function ensureReferralPromo(userId: string) {
  const eligibility = await referralEligibility(userId, true);
  const partner = await client.referralPartner.findUnique({
    where: { userId },
  });
  if (!partner) throw new ReferralError("Open your referral page first.");
  if (eligibility.billingState === "unavailable") throw new ReferralError("Billing could not be verified. Please retry from Billing. Your existing referral settings have not been changed.");
  if (!eligibility.eligible) {
    await client.referralPartner.update({
      where: { id: partner.id },
      data: {
        promoEnabled: false,
        followers: eligibility.followers,
        eligibleUsername: eligibility.username,
        eligibilityCheckedAt: new Date(),
      },
    });
    throw new ReferralError(
      "A paid plan and 10,000 verified Instagram followers are required.",
    );
  }
  const promoCode = partner.promoCode ?? `${partner.code}-40`;
  const stripeCouponId =
    partner.stripeCouponId ?? `ap3k_referral_${partner.id}`;
  if (!partner.stripeCouponId) {
    try {
      const existing = await stripe.coupons.retrieve(stripeCouponId);
      if (
        existing.percent_off !== 40 ||
        existing.duration !== "once" ||
        existing.metadata?.ap3k_referral_partner !== partner.id
      )
        throw new ReferralError("The referral coupon could not be verified.");
    } catch (error) {
      if ((error as { code?: string }).code !== "resource_missing") throw error;
      await stripe.coupons.create(
        {
          id: stripeCouponId,
          duration: "once",
          percent_off: 40,
          name: "AP3K referral: 40% off first month",
          metadata: { ap3k_referral_partner: partner.id },
        },
        { idempotencyKey: `referral-coupon-${partner.id}` },
      );
    }
  }
  return client.referralPartner.update({
    where: { id: partner.id },
    data: {
      promoCode,
      stripeCouponId,
      promoEnabled: true,
      followers: eligibility.followers,
      eligibleUsername: eligibility.username,
      eligibilityCheckedAt: new Date(),
    },
  });
}

/** Customer-facing code is redeemed through /r/{code}; annual subscriptions never get a first-month coupon. */
export async function referralCheckoutDiscount(
  userId: string,
  interval: string,
) {
  if (interval !== "month") return null;
  const attribution = await client.referralAttribution.findUnique({
    where: { referredUserId: userId },
    include: { partner: true },
  });
  if (
    !attribution ||
    attribution.programVersion !== 2 ||
    attribution.source !== "PROMO" ||
    attribution.firstPeriodStart ||
    !attribution.partner.userId ||
    attribution.partner.userId === userId ||
    !attribution.partner.promoEnabled ||
    !attribution.partner.stripeCouponId
  )
    return null;
  const subscription = await client.subscription.findUnique({
    where: { userId },
    select: { customerId: true },
  });
  if (subscription?.customerId) {
    // Stripe is the authority if a prior invoice webhook has not arrived yet.
    const paid = await stripe.invoices.list({
      customer: subscription.customerId,
      status: "paid",
      limit: 100,
    });
    if (paid.has_more || paid.data.some((invoice) => invoice.amount_paid > 0))
      return null;
  }
  const eligibility = await referralEligibility(
    attribution.partner.userId,
    true,
  );
  if (!eligibility.eligible) return null;
  return {
    coupon: attribution.partner.stripeCouponId,
    partnerId: attribution.partnerId,
  };
}

export async function getRecurringDashboard(userId: string, partnerId: string) {
  const [balance, eligibility, partner, clicks, attributions, withdrawals] =
    await Promise.all([
      referralBalance(client, partnerId),
      referralEligibility(userId),
      client.referralPartner.findUnique({ where: { id: partnerId } }),
      client.referralClick.count({ where: { partnerId } }),
      client.referralAttribution.findMany({
        where: { partnerId, programVersion: 2 },
        include: {
          referredUser: { select: { firstname: true } },
          commissions: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      client.referralWithdrawal.findMany({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
  const rows = attributions.map((row) => ({
    id: row.id,
    name: row.referredUser?.firstname?.trim() || "Friend",
    source: row.source,
    status: row.status,
    earnedCents: !row.connectedAt
      ? 0
      : row.commissions.reduce(
          (sum, item) => sum + item.amountCents - item.reversedCents,
          0,
        ),
    createdAt: row.createdAt.toISOString(),
  }));
  const sourceTotals = Object.fromEntries(
    ["LINK", "PROMO"].map((source) => [
      source,
      {
        subscribed: rows.filter(
          (row) => row.source === source && row.status === "QUALIFIED",
        ).length,
        earnedCents: rows
          .filter((row) => row.source === source)
          .reduce((sum, row) => sum + row.earnedCents, 0),
      },
    ]),
  ) as Record<"LINK" | "PROMO", { subscribed: number; earnedCents: number }>;
  return {
    ...balance,
    ...eligibility,
    clicks,
    signups: rows.length,
    subscribed: rows.filter((row) => row.status === "QUALIFIED").length,
    promoCode:
      eligibility.eligible && partner?.promoEnabled ? partner.promoCode : null,
    rows: rows.slice(0, 30),
    sourceTotals,
    withdrawals: withdrawals.map((row) => ({
      id: row.id,
      amountCents: row.amountCents,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
