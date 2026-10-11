"use server";

import {
  requireAdminAction,
  adminFormString,
  createAdminAuditLog,
} from "@/actions/admin/safe-actions";
import { client } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const MIN_REASON = 5;
const V2_PATHS = [
  "/ap3k-admin-v2/campaigns",
  "/ap3k-admin-v2/overview",
  "/ap3k-admin-v2/activity",
] as const;

function safeError(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export async function adminPauseCampaignAction(formData: FormData) {
  const campaignId = adminFormString(formData, "campaignId");
  const reason = adminFormString(formData, "reason");

  if (reason.length < MIN_REASON) {
    return { status: 400 as const, data: "Reason must be at least 5 characters." };
  }

  let admin: Awaited<ReturnType<typeof requireAdminAction>>;
  try {
    admin = await requireAdminAction();
  } catch {
    return { status: 403 as const, data: "Unauthorized." };
  }

  const before = await client.automation.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, active: true, needsReview: true, archivedAt: true },
  });

  if (!before) {
    await createAdminAuditLog({
      admin,
      action: "ADMIN_PAUSE_CAMPAIGN",
      targetType: "Automation",
      targetId: campaignId,
      reason,
      status: "FAILED",
      error: "Automation not found.",
    });
    return { status: 404 as const, data: "Automation not found." };
  }

  if (before.archivedAt) {
    await createAdminAuditLog({
      admin,
      action: "ADMIN_PAUSE_CAMPAIGN",
      targetType: "Automation",
      targetId: campaignId,
      targetLabel: before.name,
      reason,
      before: { id: before.id, active: before.active, needsReview: before.needsReview },
      status: "BLOCKED",
      error: "Automation is archived.",
    });
    return { status: 400 as const, data: "Archived automations cannot be paused." };
  }

  try {
    const after = await client.automation.update({
      where: { id: campaignId },
      data: { active: false },
      select: { id: true, name: true, active: true, needsReview: true },
    });

    await createAdminAuditLog({
      admin,
      action: "ADMIN_PAUSE_CAMPAIGN",
      targetType: "Automation",
      targetId: campaignId,
      targetLabel: before.name,
      reason,
      before: { id: before.id, name: before.name, active: before.active, needsReview: before.needsReview },
      after: { id: after.id, name: after.name, active: after.active, needsReview: after.needsReview },
      status: "SUCCESS",
    });

    for (const path of V2_PATHS) {
      revalidatePath(path);
    }

    return { status: 200 as const, data: "Automation paused." };
  } catch (error) {
    await createAdminAuditLog({
      admin,
      action: "ADMIN_PAUSE_CAMPAIGN",
      targetType: "Automation",
      targetId: campaignId,
      targetLabel: before.name,
      reason,
      before: { id: before.id, active: before.active },
      status: "FAILED",
      error: safeError(error),
    });
    return { status: 500 as const, data: safeError(error) };
  }
}

export async function adminResumeCampaignAction(formData: FormData) {
  const campaignId = adminFormString(formData, "campaignId");
  const reason = adminFormString(formData, "reason");

  if (reason.length < MIN_REASON) {
    return { status: 400 as const, data: "Reason must be at least 5 characters." };
  }

  let admin: Awaited<ReturnType<typeof requireAdminAction>>;
  try {
    admin = await requireAdminAction();
  } catch {
    return { status: 403 as const, data: "Unauthorized." };
  }

  const before = await client.automation.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, active: true, needsReview: true, archivedAt: true },
  });

  if (!before) {
    await createAdminAuditLog({
      admin,
      action: "ADMIN_RESUME_CAMPAIGN",
      targetType: "Automation",
      targetId: campaignId,
      reason,
      status: "FAILED",
      error: "Automation not found.",
    });
    return { status: 404 as const, data: "Automation not found." };
  }

  if (before.archivedAt) {
    await createAdminAuditLog({
      admin,
      action: "ADMIN_RESUME_CAMPAIGN",
      targetType: "Automation",
      targetId: campaignId,
      targetLabel: before.name,
      reason,
      before: { id: before.id, active: before.active, needsReview: before.needsReview },
      status: "BLOCKED",
      error: "Automation is archived.",
    });
    return { status: 400 as const, data: "Archived automations cannot be resumed." };
  }

  if (before.needsReview) {
    await createAdminAuditLog({
      admin,
      action: "ADMIN_RESUME_CAMPAIGN",
      targetType: "Automation",
      targetId: campaignId,
      targetLabel: before.name,
      reason,
      before: { id: before.id, active: before.active, needsReview: before.needsReview },
      status: "BLOCKED",
      error: "Automation needs review before activation.",
    });
    return { status: 400 as const, data: "Automation needs review before activation." };
  }

  try {
    const after = await client.automation.update({
      where: { id: campaignId },
      data: { active: true },
      select: { id: true, name: true, active: true, needsReview: true },
    });

    await createAdminAuditLog({
      admin,
      action: "ADMIN_RESUME_CAMPAIGN",
      targetType: "Automation",
      targetId: campaignId,
      targetLabel: before.name,
      reason,
      before: { id: before.id, name: before.name, active: before.active, needsReview: before.needsReview },
      after: { id: after.id, name: after.name, active: after.active, needsReview: after.needsReview },
      status: "SUCCESS",
    });

    for (const path of V2_PATHS) {
      revalidatePath(path);
    }

    return { status: 200 as const, data: "Automation activated." };
  } catch (error) {
    await createAdminAuditLog({
      admin,
      action: "ADMIN_RESUME_CAMPAIGN",
      targetType: "Automation",
      targetId: campaignId,
      targetLabel: before.name,
      reason,
      before: { id: before.id, active: before.active },
      status: "FAILED",
      error: safeError(error),
    });
    return { status: 500 as const, data: safeError(error) };
  }
}
