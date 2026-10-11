import {
  ADMIN_ACTIVITY_PAGE_SIZE,
  getAdminUiActivity,
  getAdminUiActivityCount,
} from "@/lib/admin-v2/ui-queries";
import { V2Table, V2Pagination } from "@/components/admin-v2/v2-table";
import { V2Badge, eventTone } from "@/components/admin-v2/v2-badge";
import { AdminPageHeader } from "@/components/admin-v2/page-header";
import { humanEvent } from "@/lib/admin-v2/labels";
import LocalTime from "@/components/global/local-time";

type Props = { searchParams?: Promise<{ page?: string }> };

export default async function AdminV2ActivityPage(props: Props) {
  const searchParams = await props.searchParams;
  const page = Math.max(0, parseInt(searchParams?.page ?? "0", 10) || 0);
  const [events, total] = await Promise.all([
    getAdminUiActivity(page),
    getAdminUiActivityCount(),
  ]);

  const rows = events.map((event) => [
    <span key="time" className="whitespace-nowrap tabular-nums text-[11px] text-muted-foreground">
      <LocalTime value={event.createdAt} />
    </span>,
    <V2Badge key="type" tone={eventTone(event.eventType)}>
      {humanEvent(event.eventType)}
    </V2Badge>,
    <span key="campaign" title={event.campaignName ?? ""} className="block max-w-[220px] truncate text-[11px] font-medium text-slate-800 dark:text-slate-300">
      {event.campaignName ?? "—"}
    </span>,
    <span key="owner" className="break-all text-[11px] text-muted-foreground sm:break-normal">{event.ownerEmail ?? "—"}</span>,
    <span key="keyword" className="max-w-[180px] truncate text-[11px] text-muted-foreground dark:text-slate-400">{event.keyword ?? "—"}</span>,
  ]);

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      <AdminPageHeader
        eyebrow="Activity"
        title="Automation activity"
        count={total}
        description={`Human-readable event history, limited to ${ADMIN_ACTIVITY_PAGE_SIZE} records per page so the feed stays fast and scannable.`}
      />

      <V2Table
        headers={["Time", "Event", "Automation", "Owner", "Keyword"]}
        rows={rows}
        empty="No activity events found."
      />
      <V2Pagination
        page={page}
        total={total}
        limit={ADMIN_ACTIVITY_PAGE_SIZE}
        base="/admin/activity"
      />
    </div>
  );
}
