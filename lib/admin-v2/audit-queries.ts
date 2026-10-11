// lib/admin-v2/audit-queries.ts
// ALL queries in this file are read-only. NEVER select token fields.
import type { Prisma } from "@prisma/client";
import { client } from "@/lib/prisma";
import { sanitizeAdminPayload } from "@/lib/admin-control-center";

export const AUDIT_LIMIT = 25;
const RECENT_LIMIT = 5;

export type AdminV2AuditLogFilters = {
  action?: string;
  targetId?: string;
  adminEmail?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type AdminV2AuditLogRow = {
  id: string;
  createdAt: Date;
  action: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  adminEmail: string | null;
  reason: string | null;
  status: string;
  error: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

function toSafeRecord(val: unknown): Record<string, unknown> | null {
  if (val === null || val === undefined) return null;
  if (typeof val !== "object" || Array.isArray(val)) return null;
  return sanitizeAdminPayload(val) as Record<string, unknown>;
}

function buildWhere(filters: AdminV2AuditLogFilters): Prisma.AdminAuditLogWhereInput {
  const where: Prisma.AdminAuditLogWhereInput = {};
  if (filters.action) where.action = filters.action;
  if (filters.targetId) where.targetId = filters.targetId;
  if (filters.adminEmail) where.adminEmail = filters.adminEmail;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }
  return where;
}

export async function getAdminV2AuditLogs(
  filters: AdminV2AuditLogFilters = {},
  page = 0
): Promise<AdminV2AuditLogRow[]> {
  const rows = await client.adminAuditLog.findMany({
    take: AUDIT_LIMIT,
    skip: page * AUDIT_LIMIT,
    orderBy: { createdAt: "desc" },
    where: buildWhere(filters),
    select: {
      id: true,
      createdAt: true,
      action: true,
      targetType: true,
      targetId: true,
      targetLabel: true,
      adminEmail: true,
      reason: true,
      status: true,
      error: true,
      before: true,
      after: true,
      metadata: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    targetLabel: row.targetLabel,
    adminEmail: row.adminEmail,
    reason: row.reason,
    status: row.status,
    error: row.error,
    before: toSafeRecord(row.before),
    after: toSafeRecord(row.after),
    metadata: toSafeRecord(row.metadata),
  }));
}

export async function getAdminV2AuditLogCount(
  filters: AdminV2AuditLogFilters = {}
): Promise<number> {
  return client.adminAuditLog.count({ where: buildWhere(filters) });
}

export async function getAdminV2UserRecentAuditLogs(
  userId: string
): Promise<AdminV2AuditLogRow[]> {
  const rows = await client.adminAuditLog.findMany({
    take: RECENT_LIMIT,
    orderBy: { createdAt: "desc" },
    where: { targetId: userId },
    select: {
      id: true,
      createdAt: true,
      action: true,
      targetType: true,
      targetId: true,
      targetLabel: true,
      adminEmail: true,
      reason: true,
      status: true,
      error: true,
      before: true,
      after: true,
      metadata: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    targetLabel: row.targetLabel,
    adminEmail: row.adminEmail,
    reason: row.reason,
    status: row.status,
    error: row.error,
    before: toSafeRecord(row.before),
    after: toSafeRecord(row.after),
    metadata: toSafeRecord(row.metadata),
  }));
}

export function summarizeAuditValue(value: Record<string, unknown> | null): string {
  if (!value) return "—";
  const entries = Object.entries(value)
    .filter(([, entry]) => entry !== null && entry !== undefined)
    .slice(0, 2)
    .map(([key, entry]) => {
      const label = key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
      return `${label}: ${String(entry)}`;
    });
  return entries.join(", ") || "—";
}

export function auditActionTone(
  action: string
): "green" | "amber" | "red" | "blue" | "pink" | "slate" {
  if (action === "ADMIN_USER_DELETED" || action === "ADMIN_USER_SUSPENDED") return "red";
  if (action === "ADMIN_USER_REACTIVATED") return "green";
  if (action === "ADMIN_PLAN_CHANGED") return "blue";
  if (action === "ADMIN_USER_USAGE_RESET") return "amber";
  if (action === "ADMIN_BILLING_OVERRIDES_UPDATED") return "pink";
  if (action === "ADMIN_PAUSE_CAMPAIGN") return "amber";
  if (action === "ADMIN_RESUME_CAMPAIGN") return "green";
  return "slate";
}

export function auditStatusTone(
  status: string
): "green" | "amber" | "red" | "slate" {
  if (status === "SUCCESS") return "green";
  if (status === "BLOCKED") return "amber";
  if (status === "FAILED") return "red";
  return "slate";
}
