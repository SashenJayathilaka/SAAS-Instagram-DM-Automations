// UI-focused read-only queries for the owner admin.
// These keep high-volume screens intentionally compact without changing runtime product logic.
import { client } from "@/lib/prisma";
import type { AdminV2ActivityEvent, AdminV2ReplyTemplate } from "@/lib/admin-v2/queries";

export const ADMIN_ACTIVITY_PAGE_SIZE = 40;
export const ADMIN_REPLY_PAGE_SIZE = 25;

export async function getAdminUiActivity(page = 0): Promise<AdminV2ActivityEvent[]> {
  const rows = await client.automationEvent.findMany({
    take: ADMIN_ACTIVITY_PAGE_SIZE,
    skip: page * ADMIN_ACTIVITY_PAGE_SIZE,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      eventType: true,
      keyword: true,
      createdAt: true,
      automation: {
        select: {
          name: true,
          User: { select: { email: true } },
        },
      },
    },
  });

  return rows.map((event) => ({
    id: event.id,
    eventType: event.eventType,
    keyword: event.keyword,
    createdAt: event.createdAt,
    campaignName: event.automation?.name ?? null,
    ownerEmail: event.automation?.User?.email ?? null,
  }));
}

export async function getAdminUiActivityCount(): Promise<number> {
  return client.automationEvent.count();
}

export async function getAdminUiReplyTemplates(page = 0): Promise<AdminV2ReplyTemplate[]> {
  const rows = await client.automation.findMany({
    take: ADMIN_REPLY_PAGE_SIZE,
    skip: page * ADMIN_REPLY_PAGE_SIZE,
    orderBy: { createdAt: "desc" },
    where: {
      listener: {
        commentReply: { not: null },
      },
    },
    select: {
      id: true,
      name: true,
      active: true,
      User: { select: { email: true } },
      listener: { select: { commentReply: true, commentReply2: true, commentReply3: true } },
    },
  });

  return rows.map((row) => ({
    campaignId: row.id,
    campaignName: row.name,
    ownerEmail: row.User?.email ?? null,
    reply1: row.listener?.commentReply ?? null,
    reply2: row.listener?.commentReply2 ?? null,
    reply3: row.listener?.commentReply3 ?? null,
    active: row.active,
  }));
}

export async function getAdminUiReplyTemplateCount(): Promise<number> {
  return client.automation.count({
    where: {
      listener: {
        commentReply: { not: null },
      },
    },
  });
}
