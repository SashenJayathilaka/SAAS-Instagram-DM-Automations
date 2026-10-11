"use server";

import { requireAdminAction, adminFormString, createAdminAuditLog } from "@/actions/admin/safe-actions";
import { isOwnerAdminIdentity } from "@/lib/admin";
import { isAccountDeletionConfirmationValid } from "@/lib/account-deletion-confirmation";
import { deleteAp3kData } from "@/lib/account-deletion-data";
import { client } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getStripeSecretKey } from "@/lib/stripe-config";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function adminDeleteUserAction(form: FormData) {
  let admin;
  try { admin = await requireAdminAction(); }
  catch { return { status: 403, data: "Unauthorized." }; }

  const userId = adminFormString(form, "userId");
  const reason = adminFormString(form, "reason");
  if (!isAccountDeletionConfirmationValid(adminFormString(form, "confirmation")) || reason.length < 5 || reason.length > 500) {
    return { status: 400, data: "Type DELETE and provide a reason of 5–500 characters." };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return { status: 400, data: "Invalid user." };
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { id: true, clerkId: true, email: true, subscription: { select: { customerId: true } } },
  });
  if (!user) return { status: 404, data: "User no longer exists. Refresh the users list." };
  if (user.clerkId === admin.clerkId || isOwnerAdminIdentity({ clerkId: user.clerkId, email: user.email })) {
    return { status: 403, data: "Owner admin accounts cannot be deleted from the admin dashboard." };
  }
  if (user.subscription?.customerId && !getStripeSecretKey()) {
    return { status: 503, data: "Billing cleanup is unavailable. No account was deleted." };
  }

  // Persist intent before destructive work. The log survives removal of the user.
  const audit = await createAdminAuditLog({
    admin, action: "ADMIN_USER_DELETED", targetType: "User", targetId: user.id,
    reason, confirmation: "DELETE", status: "FAILED",
    metadata: { stage: "started" },
  });
  let stage = "pause";
  try {
    await client.$transaction([
      client.user.update({ where: { id: user.id }, data: { status: "SUSPENDED", suspendedAt: new Date(), suspendedReason: "Account deletion in progress" } }),
      client.automation.updateMany({ where: { userId: user.id, active: true }, data: { active: false } }),
    ]);
    stage = "billing";
    if (user.subscription?.customerId) {
      try { await stripe.customers.del(user.subscription.customerId); }
      catch (error) {
        if ((error as { code?: string })?.code !== "resource_missing") throw error;
      }
    }
    // Remove identity before the database row so a failed provider request is
    // retryable from this same user page, without trusting a client-supplied Clerk ID.
    stage = "sign-in";
    const clerk = await clerkClient();
    try { await clerk.users.deleteUser(user.clerkId); }
    catch (error) {
      if ((error as { status?: number })?.status !== 404) throw error;
    }
    stage = "account data";
    await deleteAp3kData(user.id, user.email, true);
    stage = "audit";
    await client.adminAuditLog.update({ where: { id: audit.id }, data: { status: "SUCCESS", metadata: { stage: "complete" } } });
  } catch {
    await client.adminAuditLog.update({ where: { id: audit.id }, data: { status: "FAILED", error: `Cleanup stopped at ${stage}.`, metadata: { stage } } });
    return { status: 502, data: `Deletion stopped at ${stage}. The account may be partially deleted; completed steps are not reversed. Refresh and retry if the user remains listed. Audit reference: ${audit.id}.` };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/ap3k-admin-v2", "layout");
  return { status: 200, data: "AP3K account, all Instagram connections and sign-in identity deleted. Active subscriptions canceled." };
}
