import {
  getRecurringDashboard,
  qualifyRecurringCommission,
  reverseRecurringCommission,
  type RecurringPayment,
} from "@/lib/referral-commissions";
import { client } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type { Prisma, SUBSCRIPTION_PLAN } from "@prisma/client";
import { randomBytes } from "node:crypto";

export const REFERRAL_COOKIE = "ap3k_ref";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const FOUNDING_PARTNER_LIMIT = 10;
export const REFERRAL_REWARD_CENTS = 900;

const REFERRAL_CODE_PATTERN = /^[A-Z0-9-]{6,24}$/;

export function normalizeReferralCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null;
}

function createReferralCode() {
  return `AP3K-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function isPrismaCode(error: unknown, code: string) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === code,
  );
}

export async function createReferralAttribution(
  transaction: Prisma.TransactionClient,
  referredUserId: string,
  rawCode?: string | null,
) {
  const promo = rawCode?.startsWith("PROMO:") ?? false;
  const code = normalizeReferralCode(promo ? rawCode?.slice(6) : rawCode);
  if (!code) return null;

  const partner = await transaction.referralPartner.findUnique({
    where: promo ? { promoCode: code } : { code },
    select: { id: true, userId: true, promoEnabled: true },
  });
  if (
    !partner ||
    !partner.userId ||
    (promo && !partner.promoEnabled) ||
    partner.userId === referredUserId
  )
    return null;

  return transaction.referralAttribution.create({
    data: {
      partnerId: partner.id,
      referredUserId,
      programVersion: 2,
      source: promo ? "PROMO" : "LINK",
    },
    select: { id: true },
  });
}

export async function getOrCreateReferralPartner(userId: string) {
  const existing = await client.referralPartner.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await client.referralPartner.create({
        data: { userId, code: createReferralCode() },
      });
    } catch (error) {
      if (!isPrismaCode(error, "P2002")) throw error;
      const raced = await client.referralPartner.findUnique({
        where: { userId },
      });
      if (raced) return raced;
    }
  }

  throw new Error("REFERRAL_CODE_CREATION_FAILED");
}

export async function activateConnectionBenefits(
  userId: string,
  now = new Date(),
) {
  const attribution = await client.referralAttribution.updateMany({
    where: { referredUserId: userId, connectedAt: null },
    data: { connectedAt: now, status: "CONNECTED" },
  });

  // A real paid invoice may arrive before Instagram connection. Its commission
  // remains reserved from availability until this prerequisite is satisfied.
  await client.referralAttribution.updateMany({
    where: {
      referredUserId: userId,
      programVersion: 2,
      connectedAt: { not: null },
      commissions: { some: {} },
    },
    data: { status: "QUALIFIED", qualifiedAt: now },
  });
  return { referralConnected: attribution.count > 0 };
}

type QualifyingPayment = RecurringPayment & {
  referredUserId: string;
  invoiceId: string;
  plan: SUBSCRIPTION_PLAN;
  amountPaid: number;
  currency: string;
  paidAt?: Date;
};

export async function qualifyReferralPayment(input: QualifyingPayment) {
  if (
    !input.invoiceId ||
    !["PRO", "BUSINESS"].includes(input.plan) ||
    input.currency.toLowerCase() !== "usd" ||
    input.amountPaid < REFERRAL_REWARD_CENTS
  ) {
    return null;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await client.$transaction(
        async (transaction) => {
          const attribution = await transaction.referralAttribution.findUnique({
            where: { referredUserId: input.referredUserId },
            include: {
              partner: {
                select: { id: true, userId: true, founderRank: true },
              },
              reward: { select: { id: true } },
            },
          });

          if (
            !attribution?.connectedAt ||
            !attribution.partner.userId ||
            attribution.programVersion === 2
          )
            return null;
          if (attribution.reward) {
            return {
              rewardId: attribution.reward.id,
              referrerUserId: attribution.partner.userId,
              alreadyQualified: true,
            };
          }

          let founderRank = attribution.partner.founderRank;
          if (!founderRank) {
            const founders = await transaction.referralPartner.count({
              where: { founderRank: { not: null } },
            });
            if (founders >= FOUNDING_PARTNER_LIMIT) {
              await transaction.referralAttribution.update({
                where: { id: attribution.id },
                data: {
                  status: "WAITLISTED",
                  firstPaidInvoiceId: input.invoiceId,
                },
              });
              return null;
            }

            founderRank = founders + 1;
            await transaction.referralPartner.update({
              where: { id: attribution.partner.id },
              data: { founderRank, qualifiedAt: input.paidAt ?? new Date() },
            });
          }

          const qualifiedAt = input.paidAt ?? new Date();
          const reward = await transaction.referralReward.create({
            data: {
              partnerId: attribution.partner.id,
              attributionId: attribution.id,
              qualifyingInvoiceId: input.invoiceId,
              amountCents: REFERRAL_REWARD_CENTS,
              currency: "usd",
            },
            select: { id: true },
          });
          await transaction.referralAttribution.update({
            where: { id: attribution.id },
            data: {
              status: "QUALIFIED",
              qualifiedAt,
              firstPaidInvoiceId: input.invoiceId,
            },
          });

          return {
            rewardId: reward.id,
            referrerUserId: attribution.partner.userId,
            founderRank,
            alreadyQualified: false,
          };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (
        (isPrismaCode(error, "P2034") || isPrismaCode(error, "P2002")) &&
        attempt < 3
      ) {
        continue;
      }
      throw error;
    }
  }

  return null;
}

export async function applyPendingReferralRewards(
  userId: string,
  customerId: string,
) {
  const rewards = await client.referralReward.findMany({
    where: {
      partner: { userId },
      status: "PENDING",
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  let applied = 0;
  for (const reward of rewards) {
    try {
      const transaction = await stripe.customers.createBalanceTransaction(
        customerId,
        {
          amount: -reward.amountCents,
          currency: reward.currency,
          description: "AP3K referral reward - one Pro month credit",
          metadata: { ap3k_referral_reward_id: reward.id },
        },
        { idempotencyKey: `ap3k-referral-${reward.id}` },
      );

      const updated = await client.referralReward.updateMany({
        where: { id: reward.id, status: "PENDING" },
        data: {
          status: "APPLIED",
          stripeBalanceTransactionId: transaction.id,
          appliedAt: new Date(),
          failureReason: null,
        },
      });
      applied += updated.count;
    } catch (error) {
      await client.referralReward.updateMany({
        where: { id: reward.id, status: "PENDING" },
        data: {
          failureReason: (error instanceof Error
            ? error.message
            : "Stripe credit failed"
          ).slice(0, 500),
        },
      });
      console.error("[referral] Stripe credit application failed", {
        rewardId: reward.id,
        customerIdPresent: Boolean(customerId),
      });
    }
  }

  return { found: rewards.length, applied };
}

export async function prepareReferralCreditForCheckout(input: {
  userId: string;
  clerkId: string;
  email: string;
}) {
  const [subscription, pendingRewards] = await Promise.all([
    client.subscription.findUnique({
      where: { userId: input.userId },
      select: { customerId: true },
    }),
    client.referralReward.count({
      where: { partner: { userId: input.userId }, status: "PENDING" },
    }),
  ]);
  if (pendingRewards === 0) return subscription?.customerId ?? null;

  let customerId = subscription?.customerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.email,
      metadata: { clerkId: input.clerkId, ap3k_owner: "true" },
    });
    const claimed = await client.subscription.updateMany({
      where: { userId: input.userId, customerId: null },
      data: { customerId: customer.id },
    });

    if (claimed.count > 0) {
      customerId = customer.id;
    } else {
      const raced = await client.subscription.findUnique({
        where: { userId: input.userId },
        select: { customerId: true },
      });
      customerId = raced?.customerId ?? null;
      if (customerId !== customer.id) {
        await stripe.customers.del(customer.id).catch(() => undefined);
      }
    }
  }

  if (customerId) await applyPendingReferralRewards(input.userId, customerId);
  return customerId;
}

export async function qualifyAndApplyReferralReward(input: QualifyingPayment) {
  const attribution = await client.referralAttribution.findUnique({
    where: { referredUserId: input.referredUserId },
    select: { programVersion: true },
  });
  if (attribution?.programVersion === 2)
    return qualifyRecurringCommission(input);
  const result = await qualifyReferralPayment(input);
  if (!result) return null;

  const subscription = await client.subscription.findUnique({
    where: { userId: result.referrerUserId },
    select: { customerId: true },
  });
  if (subscription?.customerId) {
    await applyPendingReferralRewards(
      result.referrerUserId,
      subscription.customerId,
    );
  }
  return result;
}

export async function reverseReferralRewardForInvoice(
  invoiceId: string,
  reason: "refund" | "dispute",
  refundedCents?: number,
  chargedCents?: number,
) {
  if (!invoiceId) return null;
  await reverseRecurringCommission(
    invoiceId,
    reason,
    refundedCents,
    chargedCents,
  );

  const reward = await client.referralReward.findUnique({
    where: { qualifyingInvoiceId: invoiceId },
    include: {
      partner: { select: { userId: true } },
    },
  });
  if (!reward || reward.status === "REVERSED") return null;

  const reversedAt = new Date();
  if (reward.status === "PENDING") {
    const reversed = await client.referralReward.updateMany({
      where: { id: reward.id, status: "PENDING" },
      data: {
        status: "REVERSED",
        reversedAt,
        failureReason: `Reward reversed after qualifying payment ${reason}`,
      },
    });
    return {
      rewardId: reward.id,
      reversed: reversed.count > 0,
      recoveredFromStripe: false,
    };
  }

  if (!reward.partner.userId)
    return { rewardId: reward.id, reversed: false, recoveredFromStripe: false };
  const subscription = await client.subscription.findUnique({
    where: { userId: reward.partner.userId },
    select: { customerId: true },
  });
  if (!subscription?.customerId) {
    console.error(
      "[referral] cannot reverse applied reward without Stripe customer",
      {
        rewardId: reward.id,
      },
    );
    return { rewardId: reward.id, reversed: false, recoveredFromStripe: false };
  }

  await stripe.customers.createBalanceTransaction(
    subscription.customerId,
    {
      amount: reward.amountCents,
      currency: reward.currency,
      description: `AP3K referral reward reversal - ${reason}`,
      metadata: {
        ap3k_referral_reward_reversal_id: reward.id,
        qualifying_invoice_id: invoiceId,
      },
    },
    { idempotencyKey: `ap3k-referral-reversal-${reward.id}` },
  );

  const reversed = await client.referralReward.updateMany({
    where: { id: reward.id, status: "APPLIED" },
    data: {
      status: "REVERSED",
      reversedAt,
      failureReason: `Reward reversed after qualifying payment ${reason}`,
    },
  });
  return {
    rewardId: reward.id,
    reversed: reversed.count > 0,
    recoveredFromStripe: true,
  };
}

export async function getReferralDashboard(userId: string) {
  const partner = await getOrCreateReferralPartner(userId);
  const [foundersTaken, attributionCounts, rewards, recentReferrals] =
    await Promise.all([
      client.referralPartner.count({ where: { founderRank: { not: null } } }),
      client.referralAttribution.groupBy({
        by: ["status"],
        where: { partnerId: partner.id },
        _count: { _all: true },
      }),
      client.referralReward.groupBy({
        by: ["status"],
        where: { partnerId: partner.id },
        _count: { _all: true },
        _sum: { amountCents: true },
      }),
      client.referralAttribution.findMany({
        where: { partnerId: partner.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          status: true,
          createdAt: true,
          connectedAt: true,
          qualifiedAt: true,
          reward: { select: { status: true } },
          referredUser: { select: { firstname: true } },
        },
      }),
    ]);

  const counts = Object.fromEntries(
    attributionCounts.map((item) => [item.status, item._count._all]),
  );
  const rewardTotals = Object.fromEntries(
    rewards.map((item) => [
      item.status,
      { count: item._count._all, cents: item._sum.amountCents ?? 0 },
    ]),
  );

  return {
    recurring: await getRecurringDashboard(userId, partner.id),
    code: partner.code,
    founderRank: partner.founderRank,
    foundersTaken,
    founderSlotsRemaining: Math.max(0, FOUNDING_PARTNER_LIMIT - foundersTaken),
    stats: {
      invited: Object.values(counts).reduce(
        (total, count) => total + Number(count),
        0,
      ),
      connected:
        Number(counts.CONNECTED ?? 0) +
        Number(counts.QUALIFIED ?? 0) +
        Number(counts.WAITLISTED ?? 0),
      qualified:
        Number(rewardTotals.PENDING?.count ?? 0) +
        Number(rewardTotals.APPLIED?.count ?? 0),
      creditEarnedCents:
        (rewardTotals.PENDING?.cents ?? 0) + (rewardTotals.APPLIED?.cents ?? 0),
      creditPendingCents: rewardTotals.PENDING?.cents ?? 0,
      creditAppliedCents: rewardTotals.APPLIED?.cents ?? 0,
    },
    recentReferrals: recentReferrals.map((item) => ({
      id: item.id,
      name: item.referredUser?.firstname?.trim() || "Friend",
      status: item.reward?.status === "REVERSED" ? "REVERSED" : item.status,
      createdAt: item.createdAt.toISOString(),
      connectedAt: item.connectedAt?.toISOString() ?? null,
      qualifiedAt: item.qualifiedAt?.toISOString() ?? null,
    })),
  };
}
