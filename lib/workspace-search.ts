import { dashboardPath } from "@/lib/dashboard";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { client } from "@/lib/prisma";

export const MIN_WORKSPACE_SEARCH_LENGTH = 2;
export const MAX_WORKSPACE_SEARCH_LENGTH = 100;
export const WORKSPACE_SEARCH_RESULT_LIMIT = 5;

export type WorkspaceSearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type WorkspaceSearchResults = {
  campaigns: WorkspaceSearchItem[];
  keywords: WorkspaceSearchItem[];
  leads: WorkspaceSearchItem[];
};

export type NormalizedWorkspaceQuery =
  | { ok: true; query: string }
  | { ok: false; code: "query_too_short" | "query_too_long"; message: string };

export function normalizeWorkspaceSearchQuery(value: string | null | undefined): NormalizedWorkspaceQuery {
  const query = value?.trim() ?? "";

  if (query.length < MIN_WORKSPACE_SEARCH_LENGTH) {
    return { ok: false, code: "query_too_short", message: "Enter at least 2 characters." };
  }

  if (query.length > MAX_WORKSPACE_SEARCH_LENGTH) {
    return { ok: false, code: "query_too_long", message: "Search queries are limited to 100 characters." };
  }

  return { ok: true, query };
}

export async function searchWorkspaceForClerkUser(clerkId: string, query: string) {
  const user = await client.user.findUnique({
    where: { clerkId },
    select: { id: true, clerkId: true },
  });

  if (!user) return null;

  const integrationId = await currentInstagramAccountId(clerkId);
  const [campaignRows, keywordRows, leadRows] = await Promise.all([
    client.automation.findMany({
      where: {
        userId: user.id, integrationId,
        archivedAt: null,
        name: { contains: query, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: WORKSPACE_SEARCH_RESULT_LIMIT,
      select: {
        id: true,
        name: true,
        keywords: { take: 3, select: { word: true } },
      },
    }),
    client.keyword.findMany({
      where: {
        word: { contains: query, mode: "insensitive" },
        Automation: { userId: user.id, integrationId, archivedAt: null },
      },
      orderBy: { word: "asc" },
      take: WORKSPACE_SEARCH_RESULT_LIMIT,
      select: {
        id: true,
        word: true,
        Automation: { select: { id: true, name: true } },
      },
    }),
    client.lead.findMany({
      where: {
        automation: { userId: user.id, integrationId, archivedAt: null },
        OR: [
          { igUsername: { contains: query, mode: "insensitive" } },
          { commentText: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: WORKSPACE_SEARCH_RESULT_LIMIT,
      select: {
        id: true,
        igUsername: true,
        commentText: true,
        automation: { select: { id: true, name: true } },
      },
    }),
  ]);

  const basePath = dashboardPath(user.clerkId);
  const campaignHref = (automationId: string) => `${basePath}/automation/${encodeURIComponent(automationId)}/analytics`;

  return {
    campaigns: campaignRows.slice(0, WORKSPACE_SEARCH_RESULT_LIMIT).map((campaign) => ({
      id: `campaign-${campaign.id}`,
      title: campaign.name || "Untitled automation",
      subtitle: campaign.keywords.length > 0
        ? `Keywords: ${campaign.keywords.map((keyword) => keyword.word).join(", ")}`
        : "Automation",
      href: campaignHref(campaign.id),
    })),
    keywords: keywordRows.slice(0, WORKSPACE_SEARCH_RESULT_LIMIT).flatMap((keyword) =>
      keyword.Automation
        ? [{
            id: `keyword-${keyword.id}`,
            title: keyword.word,
            subtitle: keyword.Automation.name || "Untitled automation",
            href: campaignHref(keyword.Automation.id),
          }]
        : []
    ),
    leads: leadRows.slice(0, WORKSPACE_SEARCH_RESULT_LIMIT).map((lead) => ({
      id: `lead-${lead.id}`,
      title: lead.igUsername ? `@${lead.igUsername.replace(/^@/, "")}` : "Instagram lead",
      subtitle: lead.commentText?.trim()
        ? `${lead.commentText.trim().slice(0, 90)} · ${lead.automation.name || "Untitled automation"}`
        : lead.automation.name || "Untitled automation",
      href: campaignHref(lead.automation.id),
    })),
  } satisfies WorkspaceSearchResults;
}
