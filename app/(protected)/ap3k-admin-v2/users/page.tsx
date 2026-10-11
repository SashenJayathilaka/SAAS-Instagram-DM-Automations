import { getAdminV2Users, getAdminV2UserCount } from "@/lib/admin-v2/queries";
import { V2Table, V2Pagination } from "@/components/admin-v2/v2-table";
import { V2Badge, statusTone } from "@/components/admin-v2/v2-badge";
import { AdminPageHeader } from "@/components/admin-v2/page-header";
import { DirectoryToolbar } from "@/components/admin-v2/directory-toolbar";
import type { DirectoryFilters } from "@/lib/admin-v2/directory-filters";
import LocalTime from "@/components/global/local-time";
import Link from "next/link";

type Props = { searchParams?: Promise<DirectoryFilters & { page?: string; deleted?: string }> };
export default async function AdminV2UsersPage(props: Props) {
  const searchParams = (await props.searchParams) ?? {};
  const page = Math.min(100000, Math.max(0, parseInt(searchParams.page ?? "0", 10) || 0));
  const [users, total] = await Promise.all([getAdminV2Users(page, searchParams), getAdminV2UserCount(searchParams)]);
  const rows = users.map(user => [
    <Link key="user" href={`/admin/users/${user.id}`} className="block min-w-0 space-y-1 py-1">
      <p className="break-all font-bold text-slate-950 dark:text-white hover:text-violet-700 dark:hover:text-violet-300">{user.email}</p>
      <p className="text-xs text-muted-foreground dark:text-slate-400">{[user.firstname, user.lastname].filter(Boolean).join(" ") || "AP3K user"}</p>
      <p className="text-[11px] text-muted-foreground">Joined <LocalTime value={user.createdAt} mode="date" /></p>
    </Link>,
    <div key="plan" className="flex flex-wrap gap-2"><V2Badge tone={user.plan === "BUSINESS" ? "blue" : user.plan === "PRO" ? "pink" : "slate"}>{user.plan === "BUSINESS" ? "Business" : user.plan === "PRO" ? "Pro" : "Free"}</V2Badge><V2Badge tone={statusTone(user.status)}>{user.status}</V2Badge></div>,
    <div key="accounts" className="min-w-0 space-y-2">
      <p className="text-xs font-bold text-muted-foreground dark:text-slate-400">{user.accounts.length} Instagram {user.accounts.length === 1 ? "account" : "accounts"}</p>
      {user.accounts.map(account => <div key={account.id} className="flex flex-wrap items-center gap-2 text-xs">
        <span className="break-all text-slate-800 dark:text-slate-200">{account.instagramUsername ? `@${account.instagramUsername}` : "Unnamed account"}</span>
        {(account.planLocked || account.reconnectRequired || account.status !== "CONNECTED" || (account.expiresAt && account.expiresAt < new Date())) && <V2Badge tone="amber">{account.planLocked ? "Plan locked" : "Needs attention"}</V2Badge>}
      </div>)}
    </div>,
    <div key="usage" className="space-y-1 text-xs text-muted-foreground dark:text-slate-400"><p><strong className="text-slate-950 dark:text-white">{user.automationCount}</strong> automations</p><p><strong className="text-slate-950 dark:text-white">{user.repliesToday}</strong> sends today</p><p><strong className="text-slate-950 dark:text-white">{user.leadsToday}</strong> leads today</p></div>,
    <span key="activity" className="text-xs text-muted-foreground dark:text-slate-400">{user.lastActivity ? <LocalTime value={user.lastActivity} /> : "No activity yet"}</span>,
    <Link key="actions" href={`/admin/users/${user.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 text-xs font-bold text-violet-700 dark:text-violet-200 hover:bg-violet-500/20">Manage user →</Link>,
  ]);
  return <div className="flex flex-col gap-6">
    <AdminPageHeader eyebrow="User management" title="Your customers, in one place" count={total} description="Find a customer, review every Instagram connection, and manage their plan, usage and account. Daily activity uses UTC." />
    {searchParams.deleted === "1" && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-200">Account deletion completed.</p>}
    <DirectoryToolbar filters={searchParams} kind="users" />
    <V2Table headers={["Customer", "Plan & status", "Instagram accounts", "Activity totals", "Last activity", "Actions"]} rows={rows} empty="No matching users. Try another search or reset the filters." />
    <V2Pagination page={page} total={total} base="/admin/users" filters={searchParams} />
  </div>;
}
