"use server";

import { redirect } from "next/navigation";
import { requireOwnerAdmin } from "@/lib/admin";
import { client } from "@/lib/prisma";
import { getEmailConfiguration, sendAp3kEmail } from "@/lib/email/delivery";
import { isEmailTemplateId } from "@/lib/email/catalog";

export async function adminSendEmailTestAction(templateId: string) {
  const admin = await requireOwnerAdmin();
  const selected = isEmailTemplateId(templateId) ? templateId : "welcome";
  const configuration = getEmailConfiguration();
  if (!configuration.configured || !admin.email) {
    redirect(`/admin/emails?template=${selected}&test=not-configured`);
  }

  const profile = await client.user.findUnique({ where: { email: admin.email }, select: { id: true, firstname: true } });
  const result = await sendAp3kEmail({
    templateId: selected,
    to: admin.email,
    userId: profile?.id,
    idempotencyKey: `admin-test:${selected}:${Date.now()}`,
    context: {
      firstName: profile?.firstname || admin.name || "Abdelkhalek",
      instagramUsername: "useap3k",
      automationName: "Comment to customer",
      planName: "Business",
      usagePercent: 80,
      actionsUsed: 400,
      actionLimit: 500,
      weeklyLeads: 42,
      weeklyReplies: 186,
      weeklyDms: 124,
      weeklyComments: 211,
      failureReason: "Instagram authorization needs to be refreshed before this automation can continue.",
      rewardLabel: "one month of Pro",
      supportMessage: "How do I reconnect Instagram without losing my automations?",
      supportReply: "Open Settings, choose Instagram connection, and select Reconnect. Approve the requested permissions in Meta, then run one automation test. Your saved automations remain in AP3K during reconnection.",
    },
    metadata: { source: "admin_test" },
  });

  redirect(`/admin/emails?template=${selected}&test=${result.ok ? "sent" : result.status}`);
}

export async function adminSendOwnerAlertTestAction() {
  await requireOwnerAdmin();
  const { enqueueOwnerAlert, deliverOwnerAlertSafely } = await import("@/lib/email/owner-alerts");
  // At most one test per minute even if the button is double-clicked.
  const delivery = await enqueueOwnerAlert({ kind: "test", key: `admin-test:${Math.floor(Date.now() / 60_000)}`, occurredAt: new Date().toISOString() });
  if (!delivery) redirect("/admin/emails?ownerTest=disabled");
  const result = await deliverOwnerAlertSafely(delivery.id);
  redirect(`/admin/emails?ownerTest=${result === "sent" ? "sent" : "queued"}`);
}

export async function adminRetryOwnerAlertsAction() {
  await requireOwnerAdmin();
  const { processOwnerAlertQueue } = await import("@/lib/email/owner-alerts");
  await processOwnerAlertQueue();
  redirect("/admin/emails?ownerTest=checked");
}
