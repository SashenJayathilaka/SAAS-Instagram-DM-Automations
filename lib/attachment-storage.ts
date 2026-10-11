import {
  attachmentScopePrefix,
  attachmentScopeFilter,
  attachmentOwnerPrefix,
  attachmentKeyInScope,
} from "@/lib/attachment-scope";
import { Bucket, BlobError, uploadHandler } from "@upstash/blob";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { client } from "@/lib/prisma";
import {
  ATTACHMENT_TYPES,
  attachmentUrl,
  validateAttachmentDeclaration,
  normalizeAttachmentType,
} from "./message-attachment";
import { inspectAttachment } from "./attachment-validation";
export const attachmentSelection = {
  id: true,
  filename: true,
  mediaType: true,
  size: true,
} as const;
export function attachmentDto(a: {
  id: string;
  filename: string;
  mediaType: string;
  size: number;
}) {
  return {
    id: a.id,
    name: a.filename,
    mediaType: normalizeAttachmentType(a.mediaType),
    size: a.size,
    url: attachmentUrl(a.id),
  };
}
export async function attachmentUser(request?: Request) {
  if (
    request &&
    request.method !== "GET" &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    throw new BlobError("forbidden");
  const { userId } = await auth();
  if (!userId) throw new BlobError("unauthorized");
  const user = await client.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, status: true },
  });
  if (!user || user.status === "SUSPENDED") throw new BlobError("forbidden");
  return user;
}
export function createAttachmentUploads() {
  const bucket = Bucket.fromEnv();
  return uploadHandler({
    bucket,
    endpoint: `/api/attachments/upload/${attachmentScopePrefix()}`,
    constraints: {
      maxSize: 25000000,
      contentTypes: Object.keys(ATTACHMENT_TYPES),
    },
    multipart: true,
    context: attachmentUser,
    onBeforeUpload: async ({ ctx, file }) => {
      const mediaType = validateAttachmentDeclaration(file.type, file.size);
      const stale = await client.automationAttachment.findMany({
        where: {
          userId: ctx.id,
          ...attachmentScopeFilter(),
          status: "PENDING",
          createdAt: { lt: new Date(Date.now() - 86400000) },
        },
        select: { id: true, storageKey: true },
        take: 50,
      });
      if (stale.length)
        await bucket
          .abortStaleMultipartUploads({
            olderThan: "1d",
            prefix: attachmentOwnerPrefix(ctx.id),
          })
          .catch(() => undefined);
      for (const abandoned of stale) {
        if (!attachmentKeyInScope(abandoned.storageKey)) continue;
        const expired = await client.automationAttachment.updateMany({
          where: {
            id: abandoned.id,
            userId: ctx.id,
            status: "PENDING",
            ...attachmentScopeFilter(),
          },
          data: { status: "FAILED" },
        });
        if (expired.count)
          await bucket.del(abandoned.storageKey).catch(() => undefined);
      }
      const id = randomUUID(),
        path = `${attachmentOwnerPrefix(ctx.id)}${id}`;
      await client.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ctx.id}::uuid FOR UPDATE`;
        const count = await tx.automationAttachment.count({
          where: {
            userId: ctx.id,
            ...attachmentScopeFilter(),
            createdAt: { gte: new Date(Date.now() - 60000) },
          },
        });
        if (count >= 10) throw new BlobError("rate_limited");
        const total = await tx.automationAttachment.aggregate({
          where: {
            userId: ctx.id,
            status: { in: ["PENDING", "READY"] },
            ...attachmentScopeFilter(),
          },
          _sum: { size: true },
        });
        if ((total._sum.size ?? 0) + file.size > 500000000)
          throw new BlobError("too_large");
        await tx.automationAttachment.create({
          data: {
            id,
            userId: ctx.id,
            storageKey: path,
            filename: file.name.slice(0, 180),
            contentType: file.type,
            mediaType,
            size: file.size,
          },
        });
      });
      return {
        path,
        metadata: { owner: ctx.id, id },
        constraints: { maxSize: mediaType === "IMAGE" ? 8000000 : 25000000 },
      };
    },
    onUploadComplete: async ({ ctx, path, metadata, uploadId }) => {
      if (!path.startsWith(attachmentOwnerPrefix(ctx.id)))
        throw new BlobError("forbidden");
      const item = await client.automationAttachment.findFirst({
        where: { id: metadata.id, userId: ctx.id, storageKey: path },
      });
      if (!item || metadata.owner !== ctx.id) throw new BlobError("forbidden");
      if (item.status === "READY" && item.uploadId === uploadId)
        return attachmentDto(item);
      if (item.status !== "PENDING") throw new BlobError("forbidden");
      try {
        const object = await bucket.get(path);
        if (object.contentType !== item.contentType) {
          await object.body.cancel();
          throw new Error("Stored content type mismatch.");
        }
        await inspectAttachment(object.body, item.contentType, item.size);
      } catch {
        const failed = await client.automationAttachment.updateMany({
          where: { id: item.id, status: "PENDING" },
          data: { status: "FAILED" },
        });
        if (!failed.count) {
          const previous = await client.automationAttachment.findFirst({
            where: { id: item.id, userId: ctx.id, status: "READY", uploadId },
          });
          if (previous) return attachmentDto(previous);
        }
        throw new BlobError("content_type_not_allowed");
      }
      const completed = await client.automationAttachment.updateMany({
        where: { id: item.id, userId: ctx.id, status: "PENDING" },
        data: { status: "READY", uploadId },
      });
      if (!completed.count) {
        const previous = await client.automationAttachment.findFirst({
          where: { id: item.id, userId: ctx.id, status: "READY", uploadId },
        });
        if (previous) return attachmentDto(previous);
        throw new BlobError("not_ready");
      }
      return attachmentDto(item);
    },
    onError: () =>
      new Response(
        JSON.stringify({
          error:
            "Attachment upload could not be completed. Check its format and size, then try again.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
  });
}
