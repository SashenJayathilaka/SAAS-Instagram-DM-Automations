"use server";
import { requireAdminAction } from "@/actions/admin/safe-actions";
import { client } from "@/lib/prisma";
import { generateAdminAssistance } from "@/lib/ai-reply";
import { getAdminAnalytics } from "@/lib/admin-v2/analytics";
import {
  getAdminV2Stats,
  getAdminV2SystemHealth,
} from "@/lib/admin-v2/queries";

function assistantFailure(error: unknown) {
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number(error.status) : 0;
  if (status === 429) return { reason: "RATE_LIMIT", message: "Your AI provider has reached its quota or rate limit. Check the provider's usage and billing, then retry. No content or settings were changed." };
  if (status === 401 || status === 403) return { reason: "ACCESS", message: "The AI provider rejected access. Review the saved key and model permissions in System & Safety. No content or settings were changed." };
  if (status === 404) return { reason: "MODEL", message: "The configured AI model is unavailable. Review the model in System & Safety. No content or settings were changed." };
  if (error instanceof Error && /timeout|timed out/i.test(error.name + " " + error.message))
    return { reason: "TIMEOUT", message: "The AI provider did not respond in time. Try again shortly. No content or settings were changed." };
  return { reason: "UNAVAILABLE", message: "AI assistance is unavailable. Check the active provider in System & Safety, then retry. No content or settings were changed." };
}

export async function adminAssistantAction(
  mode: "operations" | "editorial",
  draft = "",
) {
  const admin = await requireAdminAction();
  if (
    !["operations", "editorial"].includes(mode) ||
    typeof draft !== "string" ||
    draft.length > 24000
  )
    return {
      ok: false,
      message:
        "Choose a supported task. Editorial reviews accept up to 24,000 characters.",
    };
  const reservation = await client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`admin-ai:${admin.clerkId}`}))`;
    const count = await tx.adminAuditLog.count({
      where: {
        adminUserId: admin.clerkId,
        action: "ADMIN_AI_REQUEST",
        createdAt: { gte: new Date(Date.now() - 3600000) },
      },
    });
    if (count >= 10) return null;
    return tx.adminAuditLog.create({
      data: {
        adminUserId: admin.clerkId,
        adminEmail: admin.email,
        action: "ADMIN_AI_REQUEST",
        targetType: "AdminAssistant",
        status: "PENDING",
        metadata: { mode },
      },
    });
  });
  if (!reservation)
    return {
      ok: false,
      message: "Hourly limit reached (10 reviews). Try again later.",
    };
  let stage = "metrics";
  try {
    const metrics =
      mode === "operations"
        ? await Promise.all([
            getAdminV2Stats(),
            getAdminV2SystemHealth(),
            getAdminAnalytics(7),
          ])
        : null;
    const context = metrics
      ? JSON.stringify({
          stats: metrics[0],
          health: metrics[1],
          analytics: metrics[2],
        })
      : draft;
    stage = "provider";
    const message = await generateAdminAssistance(mode, context);
    stage = "audit";
    await client.adminAuditLog.update({
      where: { id: reservation.id },
      data: {
        status: "SUCCESS",
        metadata: { mode, outputLength: message.length },
      },
    });
    return { ok: true, message };
  } catch (error) {
    const failure = assistantFailure(error);
    console.warn("Admin AI request failed", { stage, reason: failure.reason });
    await client.adminAuditLog.update({
      where: { id: reservation.id },
      data: {
        status: "FAILED",
        error: `${stage}: ${failure.reason}`,
      },
    });
    return {
      ok: false,
      message: failure.message,
    };
  }
}
