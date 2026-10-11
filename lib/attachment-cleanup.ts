import { attachmentScopeFilter, attachmentOwnerPrefix } from "@/lib/attachment-scope";
import { Bucket } from "@upstash/blob";
import { client } from "@/lib/prisma";
/** Remove private objects before deleting the ownership records needed to retry. */
export async function deleteOwnedAttachmentObjects(userId: string) {
  const count = await client.automationAttachment.count({
    where: { userId, ...attachmentScopeFilter() },
  });
  if (!count) return;
  if (!/^[0-9a-f-]{36}$/.test(userId) || !process.env.UPSTASH_BLOB_TOKEN)
    throw new Error(
      "Attachment storage cleanup is unavailable. Retry account deletion after storage is restored.",
    );
  await Bucket.fromEnv().del({ prefix: attachmentOwnerPrefix(userId) });
}
