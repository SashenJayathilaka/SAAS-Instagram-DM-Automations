import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Instagram,
  Send,
  Users,
  Workflow,
  AlertTriangle,
  BookOpen,
  FileSearch,
} from "lucide-react";
import { requireOwnerAdmin } from "@/lib/admin";
import {
  getAdminV2Stats,
  getAdminV2SystemHealth,
  getAdminV2RecentActivity,
} from "@/lib/admin-v2/queries";
import { getLaunchMetrics } from "@/lib/admin-v2/launch-metrics";
import { getAdminAnalytics } from "@/lib/admin-v2/analytics";
import { AdminPageHeader } from "@/components/admin-v2/page-header";
import { AdminRefreshButton } from "@/components/admin-v2/refresh-button";
import { AnalyticsChart } from "@/components/admin-v2/analytics-chart";
import { humanEvent } from "@/lib/admin-v2/labels";
import { Button } from "@/components/ui/button";
import LocalTime from "@/components/global/local-time";

export default async function OverviewPage() {
  await requireOwnerAdmin();
  const [stats, health, activity, launch, analytics] = await Promise.all([
    getAdminV2Stats(),
    getAdminV2SystemHealth(),
    getAdminV2RecentActivity(),
    getLaunchMetrics(),
    getAdminAnalytics(7),
  ]);
  const issues = [
    {
      label: "Instagram connections need attention",
      count: health.attentionAccounts,
      href: "/admin/accounts",
      hint: "Review expired permissions and reconnect status.",
    },
    {
      label: "Automations need review",
      count: health.campaignsNeedingReview,
      href: "/admin/campaigns",
      hint: "Check paused or flagged campaigns before resuming.",
    },
    {
      label: "Failed send attempts today",
      count: stats.failedToday,
      href: "/admin/diagnostics",
      hint: "Inspect the actual error before taking action.",
    },
  ];
  const needsAttention = issues.some((i) => i.count > 0);
  const cards = [
    {
      label: "Customers",
      value: stats.totalUsers,
      sub: "All current AP3K accounts",
      icon: Users,
      href: "/admin/users",
    },
    {
      label: "Instagram connections",
      value: stats.connectedAccounts,
      sub: "Marked connected in AP3K",
      icon: Instagram,
      href: "/admin/accounts",
    },
    {
      label: "Live automations",
      value: stats.activeCampaigns,
      sub: "Active, non-archived campaigns",
      icon: Workflow,
      href: "/admin/campaigns",
    },
    {
      label: "Successful sends",
      value: stats.repliesToday,
      sub: "Today · comments and DMs",
      icon: Send,
      href: "/admin/activity",
    },
  ];
  const recent = activity
    .filter((e) => e.eventType !== "WEBHOOK_RECEIVED")
    .slice(0, 6);
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Command center"
        title="The business, in focus."
        description="Spot what needs attention, understand growth and move the next useful action forward."
        actions={
          <>
            <AdminRefreshButton />
            <Button asChild>
              <Link href="/admin/content/new">
                Create article
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${needsAttention ? "border-amber-500/20 bg-amber-500/[0.045]" : "border-emerald-500/20 bg-emerald-500/[0.045]"}`}
      >
        <p
          className={`flex items-center gap-2 text-sm ${needsAttention ? "text-amber-800 dark:text-amber-200" : "text-emerald-700 dark:text-emerald-200"}`}
        >
          {needsAttention ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {needsAttention
            ? "Some operations need your attention"
            : "No alerts in the checks below"}
        </p>
        <span className="text-xs text-muted-foreground dark:text-slate-400">
          Snapshot <LocalTime value={analytics.updatedAt} />
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="admin-panel group transition-colors hover:border-violet-400/40"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground dark:text-slate-400">{c.label}</p>
              <c.icon className="h-4 w-4 text-violet-700 dark:text-violet-300" />
            </div>
            <p className="mt-5 text-4xl font-semibold tracking-tight tabular-nums">
              {c.value.toLocaleString()}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{c.sub}</p>
          </Link>
        ))}
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <AnalyticsChart data={analytics.series} />
        <section className="admin-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Attention queue</h2>
            <span className="text-xs text-muted-foreground">Live checks</span>
          </div>
          <div className="mt-4 divide-y divide-slate-200 dark:divide-white/10">
            {issues.map((issue) => (
              <Link key={issue.href} href={issue.href} className="block py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-semibold ${issue.count ? "bg-amber-500/10 text-amber-800 dark:text-amber-200" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}
                  >
                    {issue.count}
                  </span>
                  <span className="flex-1 text-sm font-medium">
                    {issue.label}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="ml-12 mt-2 text-xs leading-5 text-muted-foreground dark:text-slate-400">
                  {issue.hint}
                </p>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Today resets at 00:00 UTC. Counters are not an uptime guarantee.
          </p>
        </section>
      </div>
      <section className="admin-panel">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="font-semibold">From signup to real usage</h2>
            <p className="mt-1 text-xs text-muted-foreground dark:text-slate-400">
              Accounts created in the last 30 days · current records, including
              owner/test accounts
            </p>
          </div>
          <Link className="text-sm text-violet-700 dark:text-violet-300" href="/admin/analytics">
            Explore analytics →
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Created an account", value: launch.signups },
            { label: "Connected Instagram", value: launch.connected },
            { label: "Had a successful send", value: launch.firstSend },
            { label: "Sent in the last 7 days", value: launch.usedThisWeek },
          ].map((s, i) => (
            <div key={s.label}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Stage 0{i + 1}
              </p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {s.value}
              </p>
              <p className="mt-2 text-xs text-muted-foreground dark:text-slate-400">{s.label}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-50 dark:bg-white/5">
                <div
                  className="h-full rounded-full bg-violet-400"
                  style={{
                    width: `${launch.signups ? Math.min(100, (s.value / launch.signups) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Separate cohort milestones, not a strictly nested funnel. API
          acceptance is not a read receipt or sale.
        </p>
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="admin-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Latest automation activity</h2>
            <Link className="text-xs text-violet-700 dark:text-violet-300" href="/admin/activity">
              View all →
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-200 dark:divide-white/10">
            {recent.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm">{humanEvent(e.eventType)}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {e.campaignName || "Automation"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground dark:text-slate-400">
                  <LocalTime value={e.createdAt} />
                </span>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground dark:text-slate-400">
                Activity will appear after the first automation interaction.
              </p>
            )}
          </div>
        </section>
        <div className="space-y-4">
          {[
            {
              icon: BookOpen,
              title: "Publish something useful",
              body: "Draft, preview and publish an article without a code deployment.",
              href: "/admin/content",
            },
            {
              icon: FileSearch,
              title: "Improve search visibility",
              body: "Review metadata and content gaps, then check actual search performance.",
              href: "/admin/seo",
            },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="admin-panel block hover:border-violet-400/40"
            >
              <c.icon className="h-5 w-5 text-violet-700 dark:text-violet-300" />
              <h2 className="mt-3 font-semibold">{c.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-slate-400">{c.body}</p>
            </Link>
          ))}
          <Link
            href="/admin/assistant"
            className="block rounded-xl border border-violet-400/20 bg-violet-500/5 px-5 py-4 text-sm text-violet-700 dark:text-violet-200"
          >
            Get an AI operations briefing →
          </Link>
        </div>
      </div>
    </div>
  );
}
