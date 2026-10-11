import {deleteOwnedAttachmentObjects} from "@/lib/attachment-cleanup";
import { client } from "@/lib/prisma";

export async function deleteAp3kData(userId: string, email: string, retainAdminAudit = false) {
  await deleteOwnedAttachmentObjects(userId);
  await client.$transaction(
    async (transaction) => {
      const [automations, integrations] = await Promise.all([
        transaction.automation.findMany({
          where: { userId },
          select: { id: true },
        }),
        transaction.integrations.findMany({
          where: { userId },
          select: {
            id: true,
            instagramId: true,
            webhookAccountId: true,
            pageId: true,
            businessId: true,
          },
        }),
      ]);

      const automationIds = automations.map(({ id }) => id);
      const integrationIds = integrations.map(({ id }) => id);
      const accountIds = Array.from(
        new Set(
          integrations
            .flatMap(({ instagramId, webhookAccountId, pageId, businessId }) => [
              instagramId,
              webhookAccountId,
              pageId,
              businessId,
            ])
            .filter((value): value is string => Boolean(value))
        )
      );

      if (automationIds.length) {
        await transaction.dms.deleteMany({
          where: { automationId: { in: automationIds } },
        });
      }

      const webhookOwnership = [
        ...(automationIds.length ? [{ automationId: { in: automationIds } }] : []),
        ...(accountIds.length ? [{ igAccountId: { in: accountIds } }] : []),
      ];
      if (webhookOwnership.length) {
        await transaction.webhookEvent.deleteMany({
          where: { OR: webhookOwnership },
        });
      }

      const auditTargetIds = [userId, ...integrationIds, ...automationIds];
      if (!retainAdminAudit) await transaction.adminAuditLog.deleteMany({
        where: {
          OR: [
            { adminUserId: userId },
            { adminEmail: { equals: email, mode: "insensitive" } },
            { targetId: { in: auditTargetIds } },
          ],
        },
      });

      if (retainAdminAudit) await transaction.user.deleteMany({ where: { id: userId } });
      else await transaction.user.delete({ where: { id: userId } });
    },
    { isolationLevel: "Serializable" }
  );
}
