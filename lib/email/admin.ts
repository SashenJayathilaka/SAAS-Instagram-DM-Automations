import { ownerAlertConfiguration } from "@/lib/email/owner-alert-content";
import { client } from "@/lib/prisma";
import { getEmailConfiguration } from "@/lib/email/delivery";

export async function getEmailAdminOverview() {
  const [grouped, recent] = await Promise.all([
    client.emailDelivery.groupBy({ by: ["status"], _count: { _all: true } }),
    client.emailDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        templateId: true,
        recipient: true,
        subject: true,
        status: true,
        providerMessageId: true,
        errorMessage: true,
        createdAt: true,
      },
    }),
  ]);

  const configuration = getEmailConfiguration();
  return {
    ownerAlerts: ownerAlertConfiguration(),
    configuration: {
      configured: configuration.configured,
      webhookConfigured: configuration.webhookConfigured,
      from: configuration.from,
      replyTo: configuration.replyTo,
    },
    counts: Object.fromEntries(grouped.map((row) => [row.status, row._count._all])),
    recent,
  };
}
