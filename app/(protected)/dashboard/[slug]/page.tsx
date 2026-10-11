import { planDisplayName } from "@/lib/billing-plans";
import { recentAutomations } from "@/lib/recent-automations";
import QuickStart from "@/components/dashboard/quick-start";
import { waitUntil } from "@vercel/functions";
import { MetricValue, FollowerSubtitle, DashboardPeriodLabel } from "@/components/i18n/dashboard-values";
import { UiText } from "@/components/i18n/localized-copy";
import AutomationTable from "@/components/dashboard/automation-table";
import AutomationEmptyState from "@/components/dashboard/automation-empty-state";
import InstagramAvatar from "@/components/dashboard/instagram-avatar";
import LocalTime from "@/components/global/local-time";
import { getAllAutomation } from "@/actions/automation";
import { getDashboardUser as onUserInfo } from "@/lib/dashboard-data";
import { getUserMonthlyUsage } from "@/actions/usage/queries";
import {
  type ChangeSummary,
  getCampaignTableMetrics,
  getDashboardGreeting,
  parseDashboardPeriod,
} from "@/lib/dashboard-metrics";
import { getInstagramSnapshotComparisonWithRefresh } from "@/lib/instagram-profile-snapshot";
import { getDashboardProfileStats } from "@/lib/instagram-account-ux";
import { getUserFacingStats } from "@/lib/user-facing-metrics";
import { getCanonicalInstagramIntegration, isCanonicalInstagramConnected } from "@/lib/instagram-integration-status";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ period?: string }> };

const onboardingSkippedCookie = (clerkId: string) => `ap3k_onboarding_skipped_${clerkId}`;

export default async function DashboardPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const automationsPromise = getAllAutomation();
  const userResult = await onUserInfo();

  const onboardingSkipped =
    userResult.status === 200 &&
    userResult.data?.clerkId &&
    (await cookies()).get(onboardingSkippedCookie(userResult.data.clerkId))?.value === "true";

  const instagram = getCanonicalInstagramIntegration(userResult.status === 200 ? userResult.data?.integrations : null);
  if (userResult.status === 200 && !instagram && !onboardingSkipped) redirect("/onboarding");

  const instagramConnected = isCanonicalInstagramConnected(instagram);
  const tokenExpired = Boolean(instagram?.expiresAt && new Date(instagram.expiresAt).getTime() < Date.now());
  const displayName = getDashboardGreeting(userResult.data ?? {});
  const period = parseDashboardPeriod(searchParams?.period);

  const [automationsResult, usage, dashboardStats, campaignMetrics, snapshotState] = userResult.data?.id
    ? await Promise.all([
        automationsPromise,
        getUserMonthlyUsage(userResult.data.id),
        getUserFacingStats(userResult.data.id, period, new Date(), instagram?.id ?? "00000000-0000-0000-0000-000000000000"),
        getCampaignTableMetrics(userResult.data.id, instagram?.id ?? "00000000-0000-0000-0000-000000000000"),
        instagramConnected ? getInstagramSnapshotComparisonWithRefresh(userResult.data.clerkId, userResult.data.id, instagram?.id, period, new Date(), waitUntil) : Promise.resolve({ comparison: null, refresh: null }),
      ])
    : [await automationsPromise, null, null, {} as Record<string, any>, { comparison: null, refresh: null }];

  const automations =
    automationsResult.status === 200 && Array.isArray(automationsResult.data)
      ? (automationsResult.data as any[])
      : [];

  const isEmpty = automations.length === 0;

  const snapshotComparison = snapshotState.comparison;
  const profileSnapshot = snapshotComparison?.current;
  const displayInstagramUsername = profileSnapshot?.username ?? instagram?.instagramUsername;
  const displayProfilePictureUrl = profileSnapshot?.profilePictureUrl ?? instagram?.profilePictureUrl;
  const planLabel = usage?.planLabel ?? planDisplayName(userResult.data?.subscription?.plan ?? "FREE");
  const metrics = dashboardStats?.current ?? null;
  const changes = dashboardStats?.changes ?? null;

  const automationsWithMetrics = automations.map((automation) => ({
    ...automation,
    metrics: campaignMetrics[automation.id] ?? { runs: 0, leads: automation._count?.leads ?? 0 },
    currentAccountLabel: displayInstagramUsername ? `@${displayInstagramUsername}` : "Current account",
  }));

  const dashboardProfileStats = getDashboardProfileStats({ snapshotComparison, metrics, usage, connected: instagramConnected });

  return (
    <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-4 px-1 py-2 sm:gap-6 sm:py-4 text-slate-950 dark:text-slate-50 sm:px-2 lg:py-8">
      <div className="ap3k-content-enter">
        <p className="hidden text-xs font-black uppercase tracking-[0.18em] text-rf-pink sm:block"><UiText>{"AP3K"}</UiText></p>
        <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-xl"><UiText>{"Welcome back, "}</UiText><bdi dir="auto">{displayName}</bdi></h1>
        <p className="mt-1 hidden max-w-2xl text-sm sm:block text-slate-600 dark:text-slate-400">
          <UiText>{"See performance, manage automations, and keep Instagram conversations moving."}</UiText>
        </p>
      </div>

      {instagramConnected && instagram && (
        <div className={[
          "group ap3k-content-enter overflow-hidden rounded-2xl border p-3 sm:p-4 shadow-surface  dark:bg-white/[0.04]",
          tokenExpired
            ? "border-amber-200 bg-amber-50/80 dark:border-amber-500/35 dark:bg-amber-500/10"
            : "border-slate-200 light:border-slate-300 bg-white dark:bg-gradient-to-br dark:border-emerald-500/25 dark:from-emerald-500/[0.12] dark:via-white/[0.04] dark:to-rf-pink/[0.08]",
        ].join(" ")}>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <InstagramAvatar src={displayProfilePictureUrl} username={displayInstagramUsername} label={instagram.pageName} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-white sm:text-xl">
                    {displayInstagramUsername ? <bdi dir="ltr">@{displayInstagramUsername}</bdi> : <UiText>{"Instagram connected"}</UiText>}
                  </p>
                  <span className={tokenExpired ? "ap3k-badge ap3k-badge-amber" : "ap3k-badge ap3k-badge-green"}><UiText>{tokenExpired ? "Reconnect" : "Connected"}</UiText></span>
                </div>
                <p className={`${tokenExpired ? "" : "hidden sm:block"} mt-1 text-sm font-semibold text-slate-500 light:text-slate-600 dark:text-slate-400`}>
                  {tokenExpired
                    ? <UiText>{"Reconnect Instagram to resume automation activity."}</UiText>
                    : profileSnapshot?.fetchedAt
                      ? <LocalTime value={profileSnapshot.fetchedAt} prefix="Profile refreshed" />
                      : <UiText>{"Instagram is ready for automation activity."}</UiText>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="ap3k-badge ap3k-badge-slate hidden sm:inline-flex"><UiText>{planLabel}</UiText></span>
              <Link href={`/dashboard/${params.slug}/account`} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800 dark:border-rf-pink/20 dark:bg-rf-pink/10 dark:text-rf-pink transition-colors hover:bg-violet-100 dark:hover:bg-rf-pink/15 sm:min-h-0">
                {!tokenExpired && <Settings2 aria-hidden="true" className="h-4 w-4 sm:hidden" />}
                <span className={tokenExpired ? "" : "sr-only sm:not-sr-only"}><UiText>{tokenExpired ? "Reconnect Instagram" : "Manage account"}</UiText></span>
              </Link>
            </div>
          </div>
        </div>
      )}

      <QuickStart slug={params.slug} />

      <section className="ap3k-content-enter">
        <div className="mb-3">
          <p className="ap3k-kicker hidden sm:block"><UiText>{"Account analytics"}</UiText></p>
          <h2 className="text-base sm:text-xl font-black tracking-tight text-slate-950 dark:text-white"><UiText>{"Instagram performance"}</UiText></h2>
        </div>
        {instagramConnected && <div className="mb-3 flex ap3k-content-enter flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid w-full grid-cols-4 rounded-2xl border border-slate-200 light:border-slate-300 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:inline-flex sm:w-fit">
          {[
            ["24h", "Last 24h"],
            ["7d", "Last 7d"],
            ["month", "This month"],
            ["30d", "Last 30d"],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={`/dashboard/${params.slug}?period=${key}`}
              className={[
                "rounded-xl px-2 py-2 text-center text-[11px] font-black transition-all duration-200 sm:px-3 sm:py-1.5 sm:text-xs",
                period === key
                  ? "bg-violet-50 text-violet-800 ring-1 ring-violet-200 dark:bg-rf-pink/10 dark:text-rf-pink dark:ring-rf-pink/20"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.08]",
              ].join(" ")}
            >
              <UiText>{label}</UiText>
            </Link>
          ))}
          </div>
          <p className="text-xs font-bold text-slate-500 light:text-slate-600 dark:text-slate-400"><DashboardPeriodLabel period={period} start={dashboardStats?.period.currentStart} end={dashboardStats?.period.currentEnd} /></p>
        </div>}
        {!instagramConnected && <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/25 dark:bg-violet-500/10 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-700 dark:text-slate-300">Connect Instagram to see your account performance and start collecting leads.</p><Link href={`/dashboard/${params.slug}/integrations`} className="ap3k-gradient-button shrink-0 px-4 py-2.5 text-center text-sm">Add Instagram account</Link></div>}
        <div className={`grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 light:border-slate-300 bg-white shadow-surface dark:border-white/[0.12] dark:bg-[#111320] sm:grid-cols-3 ${dashboardProfileStats.length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-6"}`}>
          {dashboardProfileStats.map((stat) => (
            <AccountStatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              change={!instagramConnected ? undefined :
                stat.label === "Comments" ? changes?.commentsReceived :
                stat.label === "Leads" ? changes?.leadsCaptured :
                stat.change
              }
              subtitle={stat.label === "Followers" ? <FollowerSubtitle fallback={stat.subtitle} count={snapshotComparison?.previous?.followersCount != null ? snapshotComparison?.followerChange : null} percent={snapshotComparison?.followerChangePercent} /> : <UiText>{stat.subtitle}</UiText>}
            />
          ))}
        </div>
      </section>

      <section className="ap3k-content-enter">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="ap3k-kicker hidden sm:block"><UiText>{"Automations"}</UiText></p>
            <h2 className="font-black text-slate-950 dark:text-white"><UiText>{"Recent automations"}</UiText></h2>
          </div>
          <Link href={`/dashboard/${params.slug}/automation`} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800 dark:border-rf-pink/20 dark:bg-rf-pink/10 dark:text-rf-pink transition hover:-translate-y-0.5 hover:bg-violet-100 dark:hover:bg-rf-pink/15"><UiText>{"View all"}</UiText></Link>
        </div>

        {automationsResult.status !== 200 ? (
          <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"><UiText>Could not load your automations. Refresh the page to try again.</UiText></p>
        ) : isEmpty ? (
          <AutomationEmptyState slug={params.slug} />
        ) : (
          <AutomationTable slug={params.slug} automations={recentAutomations(automationsWithMetrics)} showControls={false} pageSize={5} />
        )}
      </section>
    </div>
  );
}

function AccountStatCard({ label, value, change, subtitle }: { label: string; value: string | number; change?: ChangeSummary; subtitle: React.ReactNode }) {
  const changeClass =
    change?.tone === "positive"
      ? "text-emerald-600 light:text-emerald-700 dark:text-emerald-300"
      : change?.tone === "negative"
        ? "text-red-500 dark:text-red-300"
        : "text-slate-500 light:text-slate-600 dark:text-slate-500";

  return (
    <div className={`${label === "Posts" ? "hidden sm:block" : ""} min-w-0 border-b border-r border-slate-200 light:border-slate-300 px-3 py-3 transition-colors duration-200 hover:bg-slate-50/80 dark:border-white/10 dark:hover:bg-white/[0.035] sm:px-5 sm:py-5 xl:border-b-0 xl:last:border-r-0`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{label}</UiText></p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5">
        <p className="min-w-0 break-words text-xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-2xl"><MetricValue value={value} /></p>
        <span className={`mb-0.5 shrink-0 text-[11px] font-black ${changeClass}`}><MetricValue value={change?.label ?? "—"} /></span>
      </div>
      <p className="mt-2 hidden text-[11px] leading-tight sm:block text-slate-500 light:text-slate-600 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}
