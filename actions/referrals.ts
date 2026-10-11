"use server";

import { currentUser } from "@clerk/nextjs/server";
import { client } from "@/lib/prisma";
import { getOrCreateReferralPartner } from "@/lib/referral-program";
import {
  createWithdrawal,
  ensureReferralPromo,
  ReferralError,
  referralEligibility,
  reviewWithdrawal,
  serializable,
  validReferralEmail,
} from "@/lib/referral-commissions";
import { requireOwnerAdmin } from "@/lib/admin";
import { getEmailConfiguration } from "@/lib/email/delivery";
import { getApplicationUrl } from "@/lib/app-url";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { createHash } from "node:crypto";

async function owner() {
  const identity = await currentUser();
  if (!identity) throw new ReferralError("Sign in to continue.");
  const user = await client.user.findUnique({
    where: { clerkId: identity.id },
    select: { id: true, email: true, firstname: true, status: true },
  });
  if (user?.status !== "ACTIVE")
    throw new ReferralError("This account cannot perform referral actions.");
  if (!user) throw new ReferralError("Account not found.");
  return { ...user, clerkId: identity.id };
}
async function result(action: () => Promise<unknown>) {
  try {
    await action();
    revalidatePath("/dashboard", "layout");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof ReferralError
          ? error.message
          : "This request could not be completed. Please try again.",
    };
  }
}
export async function refreshReferralEligibility() {
  return result(async () => {
    const user = await owner();
    const eligibility = await referralEligibility(user.id, true);
    if (eligibility.billingState === "unavailable") throw new ReferralError("Billing could not be verified. Please retry from Billing. Your existing referral settings have not been changed.");
    await client.referralPartner.updateMany({
      where: { userId: user.id },
      data: {
        followers: eligibility.followers,
        eligibleUsername: eligibility.username,
        eligibilityCheckedAt: new Date(),
        ...(!eligibility.eligible ? { promoEnabled: false } : {}),
      },
    });
  });
}
export async function unlockReferralPromo() {
  return result(async () => ensureReferralPromo((await owner()).id));
}
export async function requestReferralWithdrawal(paypalEmail: string) {
  return result(async () => createWithdrawal((await owner()).id, paypalEmail));
}

export async function sendReferralInvite(input: string) {
  return result(async () => {
    const user = await owner();
    const recipient = validReferralEmail(input);
    if (recipient === user.email.toLowerCase())
      throw new ReferralError("Choose someone else's email address.");
    const config = getEmailConfiguration();
    if (!config.apiKey)
      throw new ReferralError("Email invitations are temporarily unavailable.");
    const partner = await getOrCreateReferralPartner(user.id);
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    const recipientHash = createHash("sha256")
      .update(`referral-invite:${recipient}`)
      .digest("hex");
    const month = new Date(day);
    month.setUTCDate(1);
    const invite = await serializable(async (tx) => {
      if (
        (await tx.referralInvite.count({
          where: { partnerId: partner.id, createdAt: { gte: day } },
        })) >= 5
      )
        throw new ReferralError("You can send up to five invitations per day.");
      if (
        await tx.referralInvite.findUnique({
          where: {
            partnerId_recipient_day: { partnerId: partner.id, recipient, day },
          },
        })
      )
        throw new ReferralError("You already invited this email today.");
      // Older cleanup runs could have removed the monthly counter. Honor the
      // durable invitation history too, across all partners, before any send.
      if (await tx.referralInvite.findFirst({
        where: { recipient, day: { gte: month } },
        select: { id: true },
      })) throw new ReferralError("This email has already received a recent invitation.");
      const limit = await tx.marketingRateLimit.upsert({
        where: { key_windowStart: { key: recipientHash, windowStart: month } },
        create: { key: recipientHash, windowStart: month, count: 1 },
        update: { count: { increment: 1 } },
      });
      if (limit.count > 1)
        throw new ReferralError(
          "This email has already received a recent invitation.",
        );
      return tx.referralInvite.create({
        data: { partnerId: partner.id, recipient, day },
      });
    });
    // Only a deliberate user action sends this fixed invitation; no background outreach.
    const link = `${getApplicationUrl()}/r/${partner.code}`;
    const promo =
      partner.promoEnabled && partner.promoCode
        ? `\nTheir code ${partner.promoCode} gives eligible new customers 40% off the first month of a monthly plan. Redeem it by joining here: ${getApplicationUrl()}/r/${partner.promoCode}\n`
        : "";
    try {
      const sent = await new Resend(config.apiKey).emails.send(
        {
          from: config.from,
          replyTo: config.replyTo,
          to: recipient,
          subject: "You're invited to try AP3K",
          text: `${user.firstname?.trim() || "An AP3K user"} invited you to AP3K, an Instagram automation tool.\n\nGet started: ${link}\n${promo}\nThe person inviting you may earn a commission if you subscribe. This is a one-time invitation they requested; you have not been subscribed to marketing emails. Contact support@ap3k.com if this invitation was unwanted.`,
        },
        { idempotencyKey: `ap3k-referral-invite-${invite.id}` },
      );
      if (sent.error) throw new Error("Delivery failed");
      await client.referralInvite.update({
        where: { id: invite.id },
        data: { status: "SENT" },
      });
    } catch {
      await client.referralInvite.update({
        where: { id: invite.id },
        data: { status: "FAILED" },
      });
      throw new ReferralError(
        "The invitation could not be delivered. Please share your link instead.",
      );
    }
  });
}

export async function reviewReferralWithdrawal(formData: FormData) {
  const admin = await requireOwnerAdmin();
  const action = String(formData.get("action"));
  if (action !== "PAID" && action !== "CANCELED")
    throw new ReferralError("Invalid review action.");
  if (String(formData.get("confirmation")) !== action)
    throw new ReferralError(`Type ${action} to confirm.`);
  await reviewWithdrawal(
    String(formData.get("id")),
    action,
    admin.clerkId,
    String(formData.get("reference") ?? ""),
    String(formData.get("note") ?? ""),
  );
  revalidatePath("/admin/referrals");
  revalidatePath("/dashboard", "layout");
}
