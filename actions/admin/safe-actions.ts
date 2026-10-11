import { requireOwnerAdmin } from "@/lib/admin";
import { sanitizeAdminPayload } from "@/lib/admin-control-center";
import { client } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type AuditStatus = "SUCCESS" | "FAILED" | "BLOCKED";

export type AdminIdentity = {
  clerkId: string;
  email?: string | null;
  name?: string | null;
};

export type AdminAuditInput = {
  admin?: AdminIdentity;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  reason?: string | null;
  confirmation?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  status?: AuditStatus;
  error?: string | null;
};

export async function requireAdminAction() {
  return await requireOwnerAdmin();
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return sanitizeAdminPayload(value) as Prisma.InputJsonValue;
}

export async function createAdminAuditLog(input: AdminAuditInput) {
  return await client.adminAuditLog.create({
    data: {
      adminUserId: input.admin?.clerkId,
      adminEmail: input.admin?.email ?? undefined,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? undefined,
      targetLabel: input.targetLabel ?? undefined,
      reason: input.reason ?? undefined,
      confirmation: input.confirmation ?? undefined,
      before: toJson(input.before),
      after: toJson(input.after),
      metadata: toJson(input.metadata),
      status: input.status ?? "SUCCESS",
      error: input.error ?? undefined,
    },
  });
}

export async function requireTypedConfirmation(input: {
  admin: AdminIdentity;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  reason?: string | null;
  confirmation?: string | null;
  expected: string;
  metadata?: unknown;
}) {
  const confirmation = input.confirmation?.trim();
  if (confirmation === input.expected) return;

  await createAdminAuditLog({
    ...input,
    confirmation,
    status: "BLOCKED",
    error: `Typed confirmation mismatch. Expected ${input.expected}.`,
  });
  throw new Error(`Type ${input.expected} to confirm this action.`);
}

export function adminFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function requireReason(reason: string) {
  if (reason.trim().length < 3) {
    throw new Error("Admin reason is required.");
  }
}
