import { getAdminV2Campaigns, getAdminV2CampaignCount } from "@/lib/admin-v2/queries";
import { V2Table, V2Pagination } from "@/components/admin-v2/v2-table";
import { V2Badge } from "@/components/admin-v2/v2-badge";
import { AdminPageHeader } from "@/components/admin-v2/page-header";
import type { AdminV2Campaign } from "@/lib/admin-v2/queries";
import LocalTime from "@/components/global/local-time";
import { CampaignActionsCell } from "@/components/admin-v2/campaign-action-modal";

type Props = { searchParams?: Promise<{ page?: string }> };

function campaignHealth(campaign: AdminV2Campaign): { label: string; tone: "green" | "amber" | "red" | "slate" } {
  if (campaign.archivedAt) return { label: "Archived", tone: "slate" };
  if (campaign.needsReview) return { label: "Needs review", tone: "amber" };
  if (campaign.active) return { label: "Active", tone: "green" };
  return { label: "Paused", tone: "red" };
}

export default async function AdminV2CampaignsPage(props: Props) {
  const searchParams = await props.searchParams;
  const page = Math.max(0, parseInt(searchParams?.page ?? "0", 10) || 0);
  const [campaigns, total] = await Promise.all([
    getAdminV2Campaigns(page),
    getAdminV2CampaignCount(),
  ]);

  const rows = campaigns.map((campaign) => {
    const health = campaignHealth(campaign);
    const keyword =
      campaign.triggerMode === "ANY_COMMENT" ? (
        <span key="kw" className="text-[11px] font-medium italic text-muted-foreground dark:text-slate-400">Any comment</span>
      ) : campaign.keywords.length > 0 ? (
        <span key="kw" className="block max-w-[180px] truncate text-[11px] text-slate-800 dark:text-slate-300">
          {campaign.keywords.slice(0, 2).join(", ")}{campaign.keywords.length > 2 ? "…" : ""}
        </span>
      ) : (
        <span key="kw" className="text-[11px] text-muted-foreground">No keyword</span>
      );

    return [
      <div key="name" className="min-w-0">
        <p className="max-w-[220px] truncate font-bold text-slate-800 dark:text-slate-100" title={campaign.name}>{campaign.name}</p>
        <p className="mt-0.5 break-all text-[11px] text-muted-foreground sm:break-normal sm:truncate">{campaign.ownerEmail ?? "—"}</p>
        <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">{campaign.instagramUsername ? `@${campaign.instagramUsername}` : "No Instagram connection"}</p>
      </div>,
      <V2Badge key="status" tone={health.tone}>{health.label}</V2Badge>,
      keyword,
      <span key="scope" className="text-[11px] text-muted-foreground dark:text-slate-400">{campaign.postScope}</span>,
      <V2Badge key="reply" tone={campaign.hasPublicReply ? "blue" : "slate"}>
        {campaign.hasPublicReply ? "Enabled" : "Off"}
      </V2Badge>,
      <span key="replies" className="font-semibold tabular-nums text-slate-800 dark:text-slate-300">{campaign.replyCount.toLocaleString()}</span>,
      <span key="leads" className="font-semibold tabular-nums text-slate-800 dark:text-slate-300">{campaign.leadCount.toLocaleString()}</span>,
      campaign.lastActivity ? (
        <span key="last" className="whitespace-nowrap text-[11px] text-muted-foreground dark:text-slate-400"><LocalTime value={campaign.lastActivity} /></span>
      ) : (
        <span key="last" className="text-[11px] text-muted-foreground">No activity</span>
      ),
      campaign.needsReview && campaign.reviewReason ? (
        <span key="reason" title={campaign.reviewReason} className="block max-w-[180px] truncate text-[11px] text-amber-800 dark:text-amber-300">{campaign.reviewReason}</span>
      ) : (
        <span key="reason" className="text-[11px] text-muted-foreground">—</span>
      ),
      <CampaignActionsCell
        key="actions"
        campaignId={campaign.id}
        campaignName={campaign.name}
        active={campaign.active}
        needsReview={campaign.needsReview}
        archivedAt={campaign.archivedAt}
      />,
    ];
  });

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      <AdminPageHeader
        eyebrow="Automations"
        title="All automations"
        count={total}
        description="Review automation health, triggers, scope, delivery volume, and pause state without leaving the owner console."
      />

      <V2Table
        headers={["Automation", "Health", "Trigger", "Post scope", "Public reply", "Replies", "Leads", "Last activity", "Pause reason", "Actions"]}
        rows={rows}
        empty="No automations found."
      />
      <V2Pagination page={page} total={total} base="/admin/campaigns" />
    </div>
  );
}
