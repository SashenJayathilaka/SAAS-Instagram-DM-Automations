import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";

const REDACTED_META_VALUE = "[deleted_by_meta_data_deletion]";

type SignedRequestPayload = {
  algorithm?: unknown;
  user_id?: unknown;
};

export type SignedRequestVerificationResult =
  | { ok: true; userId: string }
  | { ok: false; reason: string };

export type MetaDataDeletionSummary = {
  matchedRecords: number;
  deletedRecords: number;
  anonymizedRecords: number;
  pausedAutomations: number;
};

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function base64UrlEncode(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

export function verifyMetaSignedRequest(
  signedRequest: string | null | undefined,
  appSecret: string | undefined
): SignedRequestVerificationResult {
  if (!appSecret?.trim()) {
    return { ok: false, reason: "missing_app_secret" };
  }

  if (!signedRequest || !signedRequest.includes(".")) {
    return { ok: false, reason: "missing_or_invalid_signed_request" };
  }

  const [encodedSignature, encodedPayload] = signedRequest.split(".", 2);
  if (!encodedSignature || !encodedPayload) {
    return { ok: false, reason: "missing_or_invalid_signed_request" };
  }

  const expectedSignature = base64UrlEncode(
    createHmac("sha256", appSecret).update(encodedPayload).digest()
  );

  if (!safeEqual(encodedSignature, expectedSignature)) {
    return { ok: false, reason: "signature_mismatch" };
  }

  let payload: SignedRequestPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8"));
  } catch {
    return { ok: false, reason: "invalid_payload" };
  }

  if (String(payload.algorithm).toUpperCase() !== "HMAC-SHA256") {
    return { ok: false, reason: "unsupported_algorithm" };
  }

  const userId = typeof payload.user_id === "string" ? payload.user_id.trim() : "";
  if (!userId) {
    return { ok: false, reason: "missing_user_id" };
  }

  return { ok: true, userId };
}

export function createMetaDeletionConfirmationCode(): string {
  return randomBytes(18).toString("base64url");
}

export function redactJsonExactMatch(value: Prisma.JsonValue, target: string): {
  value: Prisma.JsonValue;
  changed: boolean;
} {
  if (typeof value === "string") {
    return value === target
      ? { value: REDACTED_META_VALUE, changed: true }
      : { value, changed: false };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = redactJsonExactMatch(item, target);
      changed ||= result.changed;
      return result.value;
    });
    return { value: next, changed };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const next: Prisma.JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      const result = redactJsonExactMatch(item as Prisma.JsonValue, target);
      changed ||= result.changed;
      next[key] = result.value;
    }
    return { value: next, changed };
  }

  return { value, changed: false };
}

function hasExactJsonStringMatch(value: Prisma.JsonValue, target: string): boolean {
  if (typeof value === "string") return value === target;
  if (Array.isArray(value)) return value.some((item) => hasExactJsonStringMatch(item, target));
  if (value && typeof value === "object") {
    return Object.values(value).some((item) =>
      hasExactJsonStringMatch(item as Prisma.JsonValue, target)
    );
  }
  return false;
}

async function redactJsonRows<T extends { id: string }>(
  rows: T[],
  fieldName: keyof T,
  targetUserId: string,
  update: (id: string, value: Prisma.InputJsonValue) => Promise<unknown>
): Promise<number> {
  let anonymized = 0;

  for (const row of rows) {
    const value = row[fieldName] as Prisma.JsonValue | null;
    if (value === null || value === undefined) continue;

    const result = redactJsonExactMatch(value, targetUserId);
    if (!result.changed) continue;

    await update(row.id, result.value as Prisma.InputJsonValue);
    anonymized += 1;
  }

  return anonymized;
}

export async function processMetaDataDeletion(
  prisma: PrismaClient,
  targetUserId: string
): Promise<MetaDataDeletionSummary> {
  let matchedRecords = 0;
  let deletedRecords = 0;
  let anonymizedRecords = 0;
  let pausedAutomations = 0;

  await prisma.$transaction(async (tx) => {
    const pendingSelections = await tx.metaOAuthSelection.findMany({
      select: { id: true, accounts: true },
    });
    const matchingPendingSelectionIds = pendingSelections
      .filter((selection) => hasExactJsonStringMatch(selection.accounts, targetUserId))
      .map((selection) => selection.id);

    if (matchingPendingSelectionIds.length) {
      const pendingSelectionResult = await tx.metaOAuthSelection.deleteMany({
        where: { id: { in: matchingPendingSelectionIds } },
      });
      matchedRecords += pendingSelectionResult.count;
      deletedRecords += pendingSelectionResult.count;
    }

    const integrationMatches = await tx.integrations.findMany({
      where: { metaAppScopedUserId: targetUserId },
      select: {
        id: true,
        userId: true,
        instagramId: true,
        webhookAccountId: true,
        pageId: true,
        businessId: true,
      },
    });

    if (integrationMatches.length === 0) return;

    const integrationIds = integrationMatches.map((integration) => integration.id);
    const userIds = Array.from(
      new Set(integrationMatches.map((integration) => integration.userId).filter(Boolean))
    ) as string[];
    const accountIds = Array.from(
      new Set(
        integrationMatches
          .flatMap((integration) => [
            integration.instagramId,
            integration.webhookAccountId,
            integration.pageId,
            integration.businessId,
          ])
          .filter(Boolean)
      )
    ) as string[];

    const automations = userIds.length
      ? await tx.automation.findMany({
          where: { userId: { in: userIds } },
          select: { id: true },
        })
      : [];
    const automationIds = automations.map((automation) => automation.id);

    if (userIds.length) {
      const pauseResult = await tx.automation.updateMany({
        where: {
          userId: { in: userIds },
          active: true,
        },
        data: {
          active: false,
          needsReview: true,
          reviewReason: "Meta data deletion request processed.",
        },
      });
      pausedAutomations += pauseResult.count;
    }

    for (const integration of integrationMatches) {
      await tx.integrations.update({
        where: { id: integration.id },
        data: {
          token: `deleted:${integration.id}`,
          expiresAt: null,
          instagramId: null,
          metaAppScopedUserId: null,
          webhookAccountId: null,
          pageId: null,
          pageName: null,
          businessId: null,
          instagramUsername: null,
          profilePictureUrl: null,
          igAccountSource: null,
          oauthResolutionDiagnostics: Prisma.JsonNull,
          webhookSubscriptionSubscribed: false,
          webhookSubscriptionMode: "DATA_DELETED",
          webhookSubscriptionError: null,
          oauthLastError: null,
          oauthLastErrorAt: null,
          oauthLastErrorSource: null,
          status: "DISCONNECTED",
          disconnectedAt: new Date(),
          disconnectedReason: "Meta data deletion callback processed",
          reconnectRequired: false,
          lastAdminNote: "meta_data_deletion_processed",
          lastAdminActionAt: new Date(),
        },
      });
    }
    matchedRecords += integrationMatches.length;
    anonymizedRecords += integrationMatches.length;

    const snapshotResult = await tx.instagramAccountSnapshot.deleteMany({
      where: { integrationId: { in: integrationIds } },
    });
    matchedRecords += snapshotResult.count;
    deletedRecords += snapshotResult.count;

    if (automationIds.length) {
      const leadResult = await tx.lead.deleteMany({
        where: { automationId: { in: automationIds } },
      });
      matchedRecords += leadResult.count;
      deletedRecords += leadResult.count;

      const automationEventResult = await tx.automationEvent.updateMany({
        where: { automationId: { in: automationIds } },
        data: { igUserId: null, meta: Prisma.JsonNull },
      });
      matchedRecords += automationEventResult.count;
      anonymizedRecords += automationEventResult.count;

      const messageLogResult = await tx.messageLog.deleteMany({
        where: { automationId: { in: automationIds } },
      });
      matchedRecords += messageLogResult.count;
      deletedRecords += messageLogResult.count;

      const postResult = await tx.post.deleteMany({
        where: { automationId: { in: automationIds } },
      });
      matchedRecords += postResult.count;
      deletedRecords += postResult.count;

      const dmsResult = await tx.dms.updateMany({
        where: { automationId: { in: automationIds } },
        data: { senderId: null, reciever: null, message: null },
      });
      matchedRecords += dmsResult.count;
      anonymizedRecords += dmsResult.count;
    }

    if (automationIds.length || accountIds.length) {
      const webhookEventResult = await tx.webhookEvent.updateMany({
        where: {
          OR: [
            ...(automationIds.length ? [{ automationId: { in: automationIds } }] : []),
            ...(accountIds.length ? [{ igAccountId: { in: accountIds } }] : []),
          ],
        },
        data: {
          igUserId: null,
          igAccountId: null,
          payload: Prisma.JsonNull,
        },
      });
      matchedRecords += webhookEventResult.count;
      anonymizedRecords += webhookEventResult.count;
    }

    const integrationJsonRows = await tx.integrations.findMany({
      where: {
        id: { in: integrationIds },
        oauthResolutionDiagnostics: { not: Prisma.JsonNull },
      },
      select: { id: true, oauthResolutionDiagnostics: true },
    });
    const integrationJsonCount = await redactJsonRows(
      integrationJsonRows,
      "oauthResolutionDiagnostics",
      targetUserId,
      (id, oauthResolutionDiagnostics) =>
        tx.integrations.update({ where: { id }, data: { oauthResolutionDiagnostics } })
    );
    matchedRecords += integrationJsonCount;
    anonymizedRecords += integrationJsonCount;

    const selectionRows = await tx.metaOAuthSelection.findMany({
      where: userIds.length ? { userId: { in: userIds } } : { id: { in: [] } },
      select: { id: true, accounts: true },
    });
    const selectionCount = await redactJsonRows(selectionRows, "accounts", targetUserId, (id, accounts) =>
      tx.metaOAuthSelection.update({ where: { id }, data: { accounts } })
    );
    matchedRecords += selectionCount;
    anonymizedRecords += selectionCount;

    const automationMetaRows = await tx.automationEvent.findMany({
      where: {
        automationId: { in: automationIds },
        meta: { not: Prisma.JsonNull },
      },
      select: { id: true, meta: true },
    });
    const automationMetaCount = await redactJsonRows(
      automationMetaRows,
      "meta",
      targetUserId,
      (id, meta) => tx.automationEvent.update({ where: { id }, data: { meta } })
    );
    matchedRecords += automationMetaCount;
    anonymizedRecords += automationMetaCount;

    const webhookPayloadRows = await tx.webhookEvent.findMany({
      where: {
        OR: [
          ...(automationIds.length ? [{ automationId: { in: automationIds } }] : []),
          ...(accountIds.length ? [{ igAccountId: { in: accountIds } }] : []),
        ],
        payload: { not: Prisma.JsonNull },
      },
      select: { id: true, payload: true },
    });
    const webhookPayloadCount = await redactJsonRows(
      webhookPayloadRows,
      "payload",
      targetUserId,
      (id, payload) => tx.webhookEvent.update({ where: { id }, data: { payload } })
    );
    matchedRecords += webhookPayloadCount;
    anonymizedRecords += webhookPayloadCount;

    const auditBeforeRows = await tx.adminAuditLog.findMany({
      where: userIds.length
        ? {
            OR: [
              { targetId: { in: [...userIds, ...integrationIds] } },
              { before: { not: Prisma.JsonNull } },
            ],
          }
        : { id: { in: [] } },
      select: { id: true, before: true },
    });
    const auditBeforeCount = await redactJsonRows(auditBeforeRows, "before", targetUserId, (id, before) =>
      tx.adminAuditLog.update({ where: { id }, data: { before } })
    );
    matchedRecords += auditBeforeCount;
    anonymizedRecords += auditBeforeCount;

    const auditAfterRows = await tx.adminAuditLog.findMany({
      where: userIds.length
        ? {
            OR: [
              { targetId: { in: [...userIds, ...integrationIds] } },
              { after: { not: Prisma.JsonNull } },
            ],
          }
        : { id: { in: [] } },
      select: { id: true, after: true },
    });
    const auditAfterCount = await redactJsonRows(auditAfterRows, "after", targetUserId, (id, after) =>
      tx.adminAuditLog.update({ where: { id }, data: { after } })
    );
    matchedRecords += auditAfterCount;
    anonymizedRecords += auditAfterCount;

    const auditMetadataRows = await tx.adminAuditLog.findMany({
      where: userIds.length
        ? {
            OR: [
              { targetId: { in: [...userIds, ...integrationIds] } },
              { metadata: { not: Prisma.JsonNull } },
            ],
          }
        : { id: { in: [] } },
      select: { id: true, metadata: true },
    });
    const auditMetadataCount = await redactJsonRows(
      auditMetadataRows,
      "metadata",
      targetUserId,
      (id, metadata) => tx.adminAuditLog.update({ where: { id }, data: { metadata } })
    );
    matchedRecords += auditMetadataCount;
    anonymizedRecords += auditMetadataCount;
  });

  return { matchedRecords, deletedRecords, anonymizedRecords, pausedAutomations };
}
