import {
  ADMIN_REPLY_PAGE_SIZE,
  getAdminUiReplyTemplateCount,
  getAdminUiReplyTemplates,
} from "@/lib/admin-v2/ui-queries";
import { V2Table, V2Pagination } from "@/components/admin-v2/v2-table";
import { V2Badge } from "@/components/admin-v2/v2-badge";
import { ReplyEditModal } from "@/components/admin-v2/reply-edit-modal";
import { AdminPageHeader } from "@/components/admin-v2/page-header";

type Props = { searchParams?: Promise<{ page?: string }> };

export default async function AdminV2RepliesPage(props: Props) {
  const searchParams = await props.searchParams;
  const page = Math.max(0, parseInt(searchParams?.page ?? "0", 10) || 0);
  const [templates, total] = await Promise.all([
    getAdminUiReplyTemplates(page),
    getAdminUiReplyTemplateCount(),
  ]);

  const rows = templates.map((template) => [
    <div key="campaign" className="min-w-0">
      <p className="max-w-[220px] truncate font-bold text-slate-800 dark:text-slate-100" title={template.campaignName}>{template.campaignName}</p>
      <p className="mt-0.5 break-all text-[11px] text-muted-foreground sm:break-normal sm:truncate">{template.ownerEmail ?? "—"}</p>
    </div>,
    <V2Badge key="status" tone={template.active ? "green" : "slate"}>
      {template.active ? "Active" : "Paused"}
    </V2Badge>,
    <ReplyPreview key="r1" value={template.reply1} />,
    <ReplyPreview key="r2" value={template.reply2} muted />,
    <ReplyPreview key="r3" value={template.reply3} muted />,
    <ReplyEditModal
      key="actions"
      campaignId={template.campaignId}
      campaignName={template.campaignName}
      initialReplies={{
        commentReply: template.reply1,
        commentReply2: template.reply2,
        commentReply3: template.reply3,
      }}
    />,
  ]);

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      <AdminPageHeader
        eyebrow="Replies"
        title="Reply templates"
        count={total}
        description="Automation-level public reply variants. The table is paginated to keep editing fast and readable on desktop and mobile."
      />

      <V2Table
        headers={["Automation", "Status", "Reply variant 1", "Reply variant 2", "Reply variant 3", "Actions"]}
        rows={rows}
        empty="No automations with public reply templates found."
      />
      <V2Pagination
        page={page}
        total={total}
        limit={ADMIN_REPLY_PAGE_SIZE}
        base="/admin/replies"
      />
    </div>
  );
}

function ReplyPreview({ value, muted = false }: { value: string | null; muted?: boolean }) {
  if (!value) return <span className="text-[11px] text-muted-foreground">—</span>;

  return (
    <p
      title={value}
      dir="auto"
      className={`max-w-[260px] truncate text-[11px] leading-5 ${muted ? "text-muted-foreground dark:text-slate-400" : "text-slate-800 dark:text-slate-300"}`}
    >
      {value}
    </p>
  );
}
