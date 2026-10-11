import { getLaunchMetrics } from "@/lib/admin-v2/launch-metrics";
import { AdminRefreshButton } from "@/components/admin-v2/refresh-button";
import Link from "next/link";
import {
  AlertTriangle,
  Instagram,
  Megaphone,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  getAdminV2Stats,
  getAdminV2SystemHealth,
  getAdminV2RecentActivity,
} from "@/lib/admin-v2/queries";
import { StatCard } from "@/components/admin-v2/stat-card";
import { V2Badge, eventTone } from "@/components/admin-v2/v2-badge";
import {
  AdminPageHeader,
  AdminSectionHeader,
  AdminSurface,
} from "@/components/admin-v2/page-header";
import { humanEvent } from "@/lib/admin-v2/labels";
import LocalTime from "@/components/global/local-time";

export default async function AdminV2OverviewPage() {
  const [stats, health, activity, launch] = await Promise.all([
    getAdminV2Stats(),
    getAdminV2SystemHealth(),
    getAdminV2RecentActivity(),
    getLaunchMetrics(),
  ]);

  const needsAttention = health.attentionAccounts > 0 || health.campaignsNeedingReview > 0 || stats.failedToday > 0;
  const liveActivity = activity
    .filter((event) => event.eventType !== "WEBHOOK_RECEIVED")
    .slice(0, 12);

  return (
    <div className="flex flex-col gap-7 sm:gap-8">
      <AdminPageHeader
        eyebrow="Overview"
        title="AP3K at a glance"
        description="Customers, Instagram connections and delivery activity. Today’s counters reset at 00:00 UTC."
        actions={
          <><AdminRefreshButton /><div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black ${
              needsAttention
                ? "border-amber-500/20 bg-amber-500/[0.08] text-amber-800 dark:text-amber-200"
                : "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {needsAttention ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {needsAttention ? "Review recommended" : "No current alerts"}
          </div></>
        }
      />

      <form action="/admin/users" className="flex flex-col gap-3 rounded-2xl border border-violet-400/15 bg-gradient-to-r from-violet-500/10 to-transparent p-5 sm:flex-row">
        <label htmlFor="admin-customer-search" className="flex items-center text-sm font-bold text-slate-950 dark:text-white">Find a customer</label>
        <input id="admin-customer-search" name="q" maxLength={120} placeholder="Search email, name or Instagram username" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101827] px-4 text-base text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-violet-400 sm:text-sm" />
        <button className="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-500">Search users →</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total users" value={stats.totalUsers} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Connected accounts" value={stats.connectedAccounts} icon={<Instagram className="h-4 w-4" />} tone="pink" />
        <StatCard label="Active automations" value={stats.activeCampaigns} icon={<Megaphone className="h-4 w-4" />} tone="blue" />
        <StatCard label="Sends today" value={stats.repliesToday} sub="Successful comments and direct messages" tone="blue" />
        <StatCard label="Leads today" value={stats.leadsToday} sub="Across all connected Instagram accounts" tone="pink" />
        <StatCard
          label="Failed today"
          value={stats.failedToday}
          sub={stats.failedToday > 0 ? "Open diagnostics for details" : "No failed sends today"}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={stats.failedToday > 0 ? "red" : "slate"}
        />
      </div>

      <section>
        <AdminSectionHeader title="Activation · accounts created in the last 30 days"
          description="Current operational records, counted once per AP3K user across their Instagram accounts. Includes owner/test accounts; deleted records cannot be reconstructed." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="New AP3K accounts" value={launch.signups} />
          <StatCard label="Have a connected Instagram" value={launch.connected} />
          <StatCard label="Have a successful send" value={launch.firstSend} sub="Comment or DM accepted by the API" />
          <StatCard label="Sent in the last 7 days" value={launch.usedThisWeek} sub="Activity indicator, not a retention rate" />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground dark:text-slate-400">Connection counts reflect current status. Successful sends do not prove a message was read or a sale occurred. Revenue and paid conversion must be reconciled with Stripe invoices, not plan labels.</p>
      </section>

      <section>
          <AdminSectionHeader
            title="Requires attention"
            action={
              <Link href="/admin/diagnostics" className="text-[11px] font-bold text-pink-700 dark:text-pink-300 hover:text-pink-700 dark:hover:text-pink-200">
                Open diagnostics →
              </Link>
            }
          />
          <div className="grid gap-2 lg:grid-cols-3">
            {!needsAttention && <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.045] px-4 py-4 text-xs text-emerald-700 dark:text-emerald-200 lg:col-span-3">No accounts, automations, or failed sends need attention.</div>}
            {health.attentionAccounts > 0 && (
              <AttentionRow
                message={`${health.attentionAccounts} Instagram account${health.attentionAccounts !== 1 ? "s" : ""} disconnected, expired, or require reconnection.`}
                href="/admin/accounts?status=attention"
                linkLabel="Review accounts"
              />
            )}
            {health.campaignsNeedingReview > 0 && (
              <AttentionRow
                message={`${health.campaignsNeedingReview} automation${health.campaignsNeedingReview !== 1 ? "s" : ""} require owner review before reactivation.`}
                href="/admin/campaigns"
                linkLabel="Review automations"
              />
            )}
            {stats.failedToday > 0 && (
              <AttentionRow
                message={`${stats.failedToday} failed action${stats.failedToday !== 1 ? "s" : ""} recorded today.`}
                href="/admin/diagnostics"
                linkLabel="Inspect failures"
              />
            )}
          </div>
      </section>

      <section>
        <AdminSectionHeader
          title="Live activity"
          description="The latest meaningful automation events. Webhook receipt noise is intentionally hidden here."
          action={
            <Link href="/admin/activity" className="text-[11px] font-bold text-pink-700 dark:text-pink-300 hover:text-pink-700 dark:hover:text-pink-200">
              View full activity →
            </Link>
          }
        />

        <AdminSurface className="overflow-hidden">
          {liveActivity.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-white/[0.05]">
              {liveActivity.map((event) => (
                <div
                  key={event.id}
                  className="flex min-w-0 flex-col gap-2 px-4 py-3 transition hover:bg-slate-100 dark:hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-3 sm:px-5"
                >
                  <V2Badge tone={eventTone(event.eventType)}>{humanEvent(event.eventType)}</V2Badge>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-300">{event.campaignName ?? "Unknown automation"}</span>
                    {event.keyword ? (
                      <>
                        {" · "}
                        <span className="text-muted-foreground">keyword “{event.keyword}”</span>
                      </>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground sm:text-[11px]">
                    <LocalTime value={event.createdAt} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminSurface>
      </section>
    </div>
  );
}

function AttentionRow({
  message,
  href,
  linkLabel,
}: {
  message: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-amber-500/18 bg-amber-500/[0.045] px-4 py-3 sm:flex-row sm:items-center">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-amber-500/20 bg-amber-500/[0.08] text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-xs leading-5 text-slate-800 dark:text-slate-300">{message}</span>
      <Link href={href} className="shrink-0 text-[11px] font-bold text-amber-800 dark:text-amber-200 hover:text-slate-950 dark:hover:text-white">
        {linkLabel} →
      </Link>
    </div>
  );
}
