import Link from "next/link";
import {
  AUDIT_LIMIT,
  getAdminV2AuditLogs,
  getAdminV2AuditLogCount,
  summarizeAuditValue,
  auditActionTone,
  auditStatusTone,
  type AdminV2AuditLogFilters,
  type AdminV2AuditLogRow,
} from "@/lib/admin-v2/audit-queries";
import { V2Badge } from "@/components/admin-v2/v2-badge";
import { V2Table } from "@/components/admin-v2/v2-table";
import { AdvancedPanel } from "@/components/admin-v2/advanced-panel";
import { AdminPageHeader } from "@/components/admin-v2/page-header";
import LocalTime from "@/components/global/local-time";

type SearchParams = {
  page?: string;
  action?: string;
  targetId?: string;
  adminEmail?: string;
  dateFrom?: string;
  dateTo?: string;
};

type Props = { searchParams?: Promise<SearchParams> };

const ACTION_OPTIONS = [
  { value: "ADMIN_USER_DELETED", label: "Account deleted" },
  { value: "ADMIN_USER_SUSPENDED", label: "User suspended" },
  { value: "ADMIN_USER_REACTIVATED", label: "User reactivated" },
  { value: "ADMIN_PLAN_CHANGED", label: "Plan changed" },
  { value: "ADMIN_USER_USAGE_RESET", label: "Usage reset" },
  { value: "ADMIN_BILLING_OVERRIDES_UPDATED", label: "Billing overrides updated" },
  { value: "ADMIN_PAUSE_CAMPAIGN", label: "Automation paused" },
  { value: "ADMIN_RESUME_CAMPAIGN", label: "Automation resumed" },
  { value: "ADMIN_REFRESH_PROFILE_SNAPSHOT", label: "Profile snapshot refresh" },
  { value: "ADMIN_MARK_RECONNECT_REQUIRED", label: "Mark reconnect required" },
];

function sp(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildPageUrl(params: SearchParams, page: number): string {
  const entries = Object.entries({ ...params, page: String(page) })
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return `/admin/audit?${entries.join("&")}`;
}

export default async function AdminV2AuditPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = searchParams ?? {};
  const page = Math.max(0, parseInt(sp(params.page) ?? "0", 10) || 0);

  const filters: AdminV2AuditLogFilters = {
    action: sp(params.action) || undefined,
    targetId: sp(params.targetId) || undefined,
    adminEmail: sp(params.adminEmail) || undefined,
    dateFrom: sp(params.dateFrom) ? new Date(sp(params.dateFrom)!) : undefined,
    dateTo: sp(params.dateTo) ? new Date(`${sp(params.dateTo)}T23:59:59.999Z`) : undefined,
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const [logs, total] = await Promise.all([
    getAdminV2AuditLogs(filters, page),
    getAdminV2AuditLogCount(filters),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_LIMIT));

  const rows = logs.map((log) => makeAuditRow(log));

  return (
    <div className="flex flex-col gap-6 sm:gap-7">
      <AdminPageHeader
        eyebrow="Audit"
        title="Admin audit log"
        count={total}
        description="Immutable history of sensitive owner actions. Entries can be inspected, but never edited, replayed, or rolled back from this screen."
      />

      <form
        method="GET"
        action="/admin/audit"
        className="grid gap-3 rounded-2xl border border-slate-200 dark:border-white/[0.075] bg-white dark:bg-[#0b101b]/[0.72] p-4 sm:grid-cols-2 xl:grid-cols-6"
      >
        <FilterField label="Action">
          <select
            name="action"
            defaultValue={sp(params.action) ?? ""}
            className="w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-background dark:bg-[#080d17] px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none transition focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10"
          >
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Target user ID">
          <input
            name="targetId"
            type="text"
            defaultValue={sp(params.targetId) ?? ""}
            placeholder="User ID"
            className="w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-background dark:bg-[#080d17] px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-600 focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10"
          />
        </FilterField>

        <FilterField label="Admin email">
          <input
            name="adminEmail"
            type="text"
            defaultValue={sp(params.adminEmail) ?? ""}
            placeholder="admin@…"
            className="w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-background dark:bg-[#080d17] px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-600 focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10"
          />
        </FilterField>

        <FilterField label="From">
          <input
            name="dateFrom"
            type="date"
            defaultValue={sp(params.dateFrom) ?? ""}
            className="w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-background dark:bg-[#080d17] px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10"
          />
        </FilterField>

        <FilterField label="To">
          <input
            name="dateTo"
            type="date"
            defaultValue={sp(params.dateTo) ?? ""}
            className="w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-background dark:bg-[#080d17] px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10"
          />
        </FilterField>

        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-2.5 text-xs font-black text-white transition hover:brightness-110"
          >
            Apply filters
          </button>
          {activeFilterCount > 0 && (
            <Link
              href="/admin/audit"
              className="rounded-xl border border-slate-200 dark:border-white/[0.09] px-3 py-2.5 text-xs font-bold text-muted-foreground dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-950 dark:hover:text-white"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      <V2Table
        headers={["Time", "Action", "Target", "Admin", "Reason", "Before", "After", "Status", "Details"]}
        rows={rows}
        empty="No audit log entries match these filters."
      />

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-white/[0.055] bg-slate-50 dark:bg-white/[0.018] px-3 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
            <span className="font-bold tabular-nums text-slate-800 dark:text-slate-300">
              {Math.min(page * AUDIT_LIMIT + 1, total)}–{Math.min((page + 1) * AUDIT_LIMIT, total)} of {total}
            </span>
            <span>Page {page + 1} of {totalPages}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {page > 0 ? (
              <Link href={buildPageUrl(params, page - 1)} className="rounded-lg border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-3 py-2 text-center font-bold text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-950 dark:hover:text-white">
                ← Previous
              </Link>
            ) : <span className="rounded-lg border border-slate-200 dark:border-white/[0.04] px-3 py-2 text-center font-bold text-muted-foreground">← Previous</span>}
            {page < totalPages - 1 ? (
              <Link href={buildPageUrl(params, page + 1)} className="rounded-lg border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-3 py-2 text-center font-bold text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-950 dark:hover:text-white">
                Next →
              </Link>
            ) : <span className="rounded-lg border border-slate-200 dark:border-white/[0.04] px-3 py-2 text-center font-bold text-muted-foreground">Next →</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function makeAuditRow(log: AdminV2AuditLogRow): React.ReactNode[] {
  const actionLabel = log.action.replace(/^ADMIN_/, "").replace(/_/g, " ");

  return [
    <span key="time" className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground"><LocalTime value={log.createdAt} /></span>,
    <V2Badge key="action" tone={auditActionTone(log.action)}>{actionLabel}</V2Badge>,
    <div key="target" className="min-w-0">
      <p className="max-w-[180px] truncate text-xs font-medium text-slate-800 dark:text-slate-300">{log.targetLabel ?? log.targetType}</p>
      {log.targetId && <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{log.targetId.slice(0, 10)}…</p>}
    </div>,
    <span key="admin" className="break-all text-[11px] text-muted-foreground dark:text-slate-400 sm:break-normal">{log.adminEmail ?? "—"}</span>,
    <p key="reason" className="max-w-[200px] truncate text-[11px] text-muted-foreground dark:text-slate-400" title={log.reason ?? ""}>{log.reason ?? "—"}</p>,
    <p key="before" className="max-w-[160px] truncate text-[11px] text-muted-foreground">{summarizeAuditValue(log.before)}</p>,
    <p key="after" className="max-w-[160px] truncate text-[11px] text-muted-foreground">{summarizeAuditValue(log.after)}</p>,
    <V2Badge key="status" tone={auditStatusTone(log.status)}>{log.status}</V2Badge>,
    <AdvancedPanel key="details" label="Inspect" compact>
      <div className="grid min-w-[260px] gap-3 text-[11px] sm:min-w-[420px] sm:grid-cols-2">
        {log.reason && <DetailBlock label="Reason" value={log.reason} />}
        {log.before && <DetailBlock label="Before" value={JSON.stringify(log.before, null, 2)} mono />}
        {log.after && <DetailBlock label="After" value={JSON.stringify(log.after, null, 2)} mono />}
        {log.metadata && <DetailBlock label="Metadata" value={JSON.stringify(log.metadata, null, 2)} mono />}
        {log.error && <DetailBlock label="Error" value={log.error} tone="red" />}
        <DetailBlock label="Target type" value={log.targetType} />
        {log.targetId && <DetailBlock label="Target ID" value={log.targetId} mono />}
        <DetailBlock label="Timestamp" value={<LocalTime value={log.createdAt} />} />
      </div>
    </AdvancedPanel>,
  ];
}

function DetailBlock({
  label,
  value,
  mono = false,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  tone?: "red";
}) {
  return (
    <div className="min-w-0">
      <p className={`text-[9px] font-black uppercase tracking-[0.14em] ${tone === "red" ? "text-red-700 dark:text-red-400" : "text-muted-foreground"}`}>{label}</p>
      <div className={`mt-1 ${mono ? "max-h-40 overflow-auto whitespace-pre rounded-lg bg-black/25 p-2 font-mono" : "whitespace-pre-wrap"} ${tone === "red" ? "text-red-700 dark:text-red-200" : "text-slate-800 dark:text-slate-300"}`}>
        {value}
      </div>
    </div>
  );
}
