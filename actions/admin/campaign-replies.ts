"use server";

import {
  requireAdminAction,
  adminFormString,
  createAdminAuditLog,
} from "@/actions/admin/safe-actions";
import { client } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const MIN_REASON = 5;
const MAX_REPLY_LENGTH = 500;
const V2_REPLY_PATHS = [
  "/ap3k-admin-v2/replies",
  "/ap3k-admin-v2/campaigns",
  "/ap3k-admin-v2/activity",
] as const;

function safeError(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export async function adminUpdateCampaignRepliesAction(formData: FormData) {
  // 1. Authorization first
  let admin: Awaited<ReturnType<typeof requireAdminAction>>;
  try {
    admin = await requireAdminAction();
  } catch {
    return { status: 403 as const, data: "Unauthorized." };
  }

  const campaignId = adminFormString(formData, "campaignId");
  const reason = adminFormString(formData, "reason");
  const reply1 = adminFormString(formData, "reply1");
  const reply2 = adminFormString(formData, "reply2");
  const reply3 = adminFormString(formData, "reply3");

  // 2. Validation
  if (reason.length < MIN_REASON) {
    return { status: 400 as const, data: "Reason must be at least 5 characters." };
  }

  const r1 = reply1.length > 0 ? reply1 : null;
  const r2 = reply2.length > 0 ? reply2 : null;
  const r3 = reply3.length > 0 ? reply3 : null;

  if (!r1 && !r2 && !r3) {
    return { status: 400 as const, data: "At least one reply variant must be provided." };
  }

  if ((r1?.length ?? 0) > MAX_REPLY_LENGTH || 
      (r2?.length ?? 0) > MAX_REPLY_LENGTH || 
      (r3?.length ?? 0) > MAX_REPLY_LENGTH) {
    return { status: 400 as const, data: `Reply variants cannot exceed ${MAX_REPLY_LENGTH} characters.` };
  }

  // 3. Check existence and archive status
  const campaign = await client.automation.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      archivedAt: true,
      listener: {
        select: {
          commentReply: true,
          commentReply2: true,
          commentReply3: true,
        },
      },
    },
  });

  if (!campaign || !campaign.listener) {
    await createAdminAuditLog({
      admin,
      action: "ADMIN_UPDATE_CAMPAIGN_REPLIES",
      targetType: "AUTOMATION",
      targetId: campaignId,
      reason,
      status: "FAILED",
      error: "Automation or response configuration not found.",
    });
    return { status: 404 as const, data: "Automation or response configuration not found." };
  }

  if (campaign.archivedAt) {
    await createAdminAuditLog({
      admin,
      action: "ADMIN_UPDATE_CAMPAIGN_REPLIES",
      targetType: "AUTOMATION",
      targetId: campaignId,
      targetLabel: campaign.name,
      reason,
      status: "BLOCKED",
      error: "Automation is archived.",
    });
    return { status: 400 as const, data: "Archived automations cannot be modified." };
  }

  // 4. Update and Audit
  const before = {
    reply1: campaign.listener.commentReply,
    reply2: campaign.listener.commentReply2,
    reply3: campaign.listener.commentReply3,
  };

  const after = {
    reply1: r1,
    reply2: r2,
    reply3: r3,
  };

  try {
    await client.listener.update({
      where: { automationId: campaignId },
      data: {
        commentReply: r1,
        commentReply2: r2,
        commentReply3: r3,
        commentReplies: [r1,r2,r3].filter((reply): reply is string => Boolean(reply)),
      },
    });

    await createAdminAuditLog({
      admin,
      action: "ADMIN_UPDATE_CAMPAIGN_REPLIES",
      targetType: "AUTOMATION",
      targetId: campaignId,
      targetLabel: campaign.name,
      reason,
      before,
      after,
      status: "SUCCESS",
    });

    for (const path of V2_REPLY_PATHS) {
      revalidatePath(path);
    }

    return { status: 200 as const, data: "Replies updated successfully." };
  } catch (error) {
    await createAdminAuditLog({
      admin,
      action: "ADMIN_UPDATE_CAMPAIGN_REPLIES",
      targetType: "AUTOMATION",
      targetId: campaignId,
      targetLabel: campaign.name,
      reason,
      before,
      status: "FAILED",
      error: safeError(error),
    });
    return { status: 500 as const, data: safeError(error) };
  }
}
