import Link from "next/link";
import { Search } from "lucide-react";
import type { DirectoryFilters } from "@/lib/admin-v2/directory-filters";

const field = "min-h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101827] px-3 text-base text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-500 sm:text-sm";
export function DirectoryToolbar({ filters, kind }: { filters: DirectoryFilters; kind: "users" | "accounts" }) {
  return <form action={`/admin/${kind}`} className="grid gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c111d] p-4 sm:grid-cols-2 xl:flex xl:items-end">
    <label className="min-w-0 flex-1 space-y-2 text-xs font-semibold text-muted-foreground dark:text-slate-400">
      <span className="flex items-center gap-2"><Search className="h-4 w-4" />Search {kind}</span>
      <input name="q" defaultValue={filters.q} maxLength={120} placeholder="Email, name or @Instagram" className={field} />
    </label>
    {kind === "users" && <label className="space-y-2 text-xs font-semibold text-muted-foreground dark:text-slate-400"><span className="block">Plan</span><select name="plan" defaultValue={filters.plan || ""} className={field}><option value="">All plans</option><option value="FREE">Free</option><option value="PRO">Pro</option><option value="BUSINESS">Business</option></select></label>}
    <label className="space-y-2 text-xs font-semibold text-muted-foreground dark:text-slate-400"><span className="block">Status</span><select name="status" defaultValue={filters.status || ""} className={field}><option value="">All statuses</option>{kind === "users" ? <><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></> : <><option value="connected">Connected</option><option value="attention">Needs attention</option><option value="locked">Plan locked</option></>}</select></label>
    <button className="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-500">Apply filters</button>
    <Link href={`/admin/${kind}`} className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm text-muted-foreground dark:text-slate-400 hover:text-slate-950 dark:hover:text-white">Reset</Link>
  </form>;
}
