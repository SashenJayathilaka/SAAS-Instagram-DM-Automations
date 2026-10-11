import { DeleteUserButton } from "@/components/admin-v2/delete-user-button";
import { AccountActionsCell } from "@/components/admin-v2/account-actions-cell";
import { accountHealth } from "@/components/admin-v2/v2-badge";
import { isOwnerAdminIdentity } from "@/lib/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CircleUserRound, Clock3, CreditCard, Gauge, ShieldCheck } from "lucide-react";
import { getAdminV2UserDetail } from "@/lib/admin-v2/queries";
import { getUserMonthlyUsage } from "@/actions/usage/queries";
import { V2Badge, statusTone } from "@/components/admin-v2/v2-badge";
import { UsageBar } from "@/components/admin-v2/usage-bar";
import { UserActionsPanel } from "@/components/admin-v2/user-actions-panel";
import { InternalOverridesCard } from "@/components/admin-v2/internal-overrides-card";
import { AdminPageHeader, AdminSurface, AdminSectionHeader } from "@/components/admin-v2/page-header";
import {
  usageTone,
  formatUsageMetricValue,
  isUnlimited,
  getPlanLabel,
  type ProductPlan,
} from "@/lib/plan-limits";
import { stripe } from "@/lib/stripe";
import {
  getAdminV2UserRecentAuditLogs,
  auditActionTone,
  auditStatusTone,
} from "@/lib/admin-v2/audit-queries";
import LocalTime from "@/components/global/local-time";

type Props = { params: Promise<{ userId: string }> };

export default async function AdminV2UserDetailPage({ params }: Props) {
  const { userId } = await params;

  const [user, usage, recentAudit] = await Promise.all([
    getAdminV2UserDetail(userId),
    getUserMonthlyUsage(userId).catch(() => null),
    getAdminV2UserRecentAuditLogs(userId),
  ]);

  if (!user) notFound();

  let stripeStatus: string | null = null;
  if (user.customerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.customerId,
        limit: 1,
      });
      stripeStatus = subscriptions.data[0]?.status ?? null;
    } catch {
      stripeStatus = "unknown";
    }
  }

  const planLabel = getPlanLabel(user.plan as ProductPlan);
  const displayName = [user.firstname, user.lastname].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-7 sm:gap-8">
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground transition hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All users
        </Link>
      </div>

      <AdminPageHeader
        eyebrow="User detail"
        title={user.email}
        description={displayName || "Owner-level account controls, usage, billing state, overrides, and audit history."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <V2Badge tone={user.plan === "PRO" ? "pink" : "slate"}>{planLabel}</V2Badge>
            <V2Badge tone={statusTone(user.status)}>{user.status}</V2Badge>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          icon={<CircleUserRound className="h-4 w-4" />}
          label="Account status"
          value={<V2Badge tone={statusTone(user.status)}>{user.status}</V2Badge>}
        />
        <SummaryTile
          icon={<CalendarDays className="h-4 w-4" />}
          label="Created"
          value={<LocalTime value={user.createdAt} mode="date" />}
        />
        <SummaryTile
          icon={<Clock3 className="h-4 w-4" />}
          label="Last activity"
          value={user.lastActivity ? <LocalTime value={user.lastActivity} /> : <span className="text-muted-foreground">No activity</span>}
        />
        <SummaryTile
          icon={<CreditCard className="h-4 w-4" />}
          label="Billing"
          value={user.customerId ? <V2Badge tone="green">Stripe linked</V2Badge> : <span className="text-muted-foreground">Not linked</span>}
        />
      </section>

      <AdminSurface className="p-5 sm:p-6">
        <AdminSectionHeader title="Identity & account state" description="Internal identifiers and the latest owner-side administrative context." />
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          <DetailField
            label="Clerk ID"
            value={<span className="break-all font-mono text-[11px] text-slate-800 dark:text-slate-300">{user.clerkId}</span>}
          />
          <DetailField label="Plan" value={<V2Badge tone={user.plan === "PRO" ? "pink" : "slate"}>{planLabel}</V2Badge>} />
          <DetailField label="Status" value={<V2Badge tone={statusTone(user.status)}>{user.status}</V2Badge>} />
          <DetailField label="Automations" value={`${user.activeCampaigns} active · ${user.totalCampaigns} total`} />
          {user.status === "SUSPENDED" && user.suspendedReason && (
            <DetailField label="Suspend reason" value={<span className="text-xs text-amber-800 dark:text-amber-300">{user.suspendedReason}</span>} />
          )}
          {recentAudit.length > 0 && (
            <DetailField
              label="Last admin action"
              value={
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                    {recentAudit[0].action.replace(/^ADMIN_/, "").replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] leading-4 text-muted-foreground">
                    {recentAudit[0].adminEmail ?? "unknown"} · <LocalTime value={recentAudit[0].createdAt} />
                  </span>
                </div>
              }
            />
          )}
        </dl>
      </AdminSurface>

      {usage ? (
        <AdminSurface className="p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Plan & billing</p>
              <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">Usage this period</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">{usage.periodLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <V2Badge tone={user.plan === "PRO" ? "pink" : "slate"}>{planLabel}</V2Badge>
              {user.customerId ? (
                <V2Badge tone="green">Stripe customer</V2Badge>
              ) : (
                <V2Badge tone="slate">No Stripe record</V2Badge>
              )}
              {stripeStatus && (
                <V2Badge tone={stripeStatus === "active" || stripeStatus === "trialing" ? "green" : stripeStatus === "past_due" ? "amber" : "slate"}>
                  {stripeStatus}
                </V2Badge>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricTile
              label="Static replies"
              value={formatUsageMetricValue(usage.staticReplies)}
              bar={<UsageBar percent={usage.staticReplies.percent} tone={usageTone(usage.staticReplies.percent, usage.staticReplies.blocked)} />}
              sub={`${usage.staticReplies.percent}% used`}
            />
            <MetricTile
              label="AI replies"
              value={formatUsageMetricValue(usage.aiReplies)}
              bar={isUnlimited(usage.aiReplies.limit) ? undefined : <UsageBar percent={usage.aiReplies.percent} tone={usageTone(usage.aiReplies.percent, usage.aiReplies.blocked)} />}
              sub={isUnlimited(usage.aiReplies.limit) ? "Unlimited on current limits" : `${usage.aiReplies.percent}% used`}
            />
            <MetricTile
              label="Connected accounts"
              value={formatUsageMetricValue(usage.connectedAccounts)}
              bar={<UsageBar percent={usage.connectedAccounts.percent} tone={usageTone(usage.connectedAccounts.percent, usage.connectedAccounts.blocked)} />}
            />
            <MetricTile label="Active automations" value={formatUsageMetricValue(usage.activeCampaigns)} />
            <MetricTile
              label="Automation health"
              value={`${user.activeCampaigns} active · ${user.campaignsNeedingReview} review`}
              sub={`${user.totalCampaigns} total automations`}
            />
            <MetricTile
              label="Billing state"
              value={user.customerId ? "Stripe customer linked" : "Internal plan only"}
              sub={stripeStatus ? `Stripe status: ${stripeStatus}` : undefined}
            />
          </div>
        </AdminSurface>
      ) : (
        <AdminSurface className="p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">Plan and billing usage data is temporarily unavailable.</p>
        </AdminSurface>
      )}

      <section>
        <AdminSectionHeader title={`Instagram accounts · ${user.accounts.length}`} description="Each connection has its own automations, contacts, inbox and AI knowledge. Plan usage is shared by this AP3K user." />
        {user.accounts.length === 0 ? <AdminSurface className="p-6 text-sm text-muted-foreground dark:text-slate-400">No Instagram accounts connected.</AdminSurface> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{user.accounts.map(account => {
            const health = accountHealth(account);
            return <AdminSurface key={account.id} className="flex min-w-0 flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="break-all text-base font-bold">{account.instagramUsername ? `@${account.instagramUsername}` : "Unnamed Instagram account"}</h3>
                <V2Badge tone={health.tone}>{health.label}</V2Badge>
              </div>
              {account.planLocked && <V2Badge tone="amber">Locked by plan limit</V2Badge>}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3"><p className="text-xl font-bold">{account._count.automations}</p><p className="text-xs text-muted-foreground dark:text-slate-400">Automations</p></div>
                <div className="rounded-xl bg-slate-50 dark:bg-white/5 p-3"><p className="text-xl font-bold">{account._count.conversations}</p><p className="text-xs text-muted-foreground dark:text-slate-400">Conversations</p></div>
              </div>
              <p className="text-xs text-muted-foreground dark:text-slate-400">Connection expiry: {account.expiresAt ? <LocalTime value={account.expiresAt} mode="date" /> : "Not provided"}</p>
              <AccountActionsCell integrationId={account.id} instagramUsername={account.instagramUsername} status={account.status} reconnectRequired={account.reconnectRequired} />
            </AdminSurface>;
          })}</div>}
      </section>

      <InternalOverridesCard user={user} usage={usage} />

      <UserActionsPanel
        userId={user.id}
        email={user.email}
        status={user.status}
        plan={user.plan}
        hasActiveOverrides={Boolean(user.overrideReason && (!user.overrideExpiresAt || new Date(user.overrideExpiresAt) > new Date()))}
      />

      {!isOwnerAdminIdentity({ clerkId: user.clerkId, email: user.email }) && <AdminSurface className="flex flex-col gap-4 border-red-400/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-bold text-red-700 dark:text-red-300">Delete customer account</h2><p className="mt-1 max-w-xl text-sm text-muted-foreground dark:text-slate-400">Permanently remove this AP3K user and every connected account. Use suspension above for temporary access restrictions.</p></div>
        <DeleteUserButton userId={user.id} email={user.email} accountCount={user.accounts.length} />
      </AdminSurface>}

      <section>
        <AdminSectionHeader
          title="Recent audit activity"
          description="The latest sensitive actions applied to this user."
          action={
            <Link href={`/admin/audit?targetId=${user.id}`} className="text-[11px] font-bold text-pink-700 dark:text-pink-300 hover:text-pink-700 dark:hover:text-pink-200">
              View all audit logs →
            </Link>
          }
        />

        <AdminSurface className="overflow-hidden">
          {recentAudit.length === 0 ? (
            <div className="px-5 py-10 text-center text-xs text-muted-foreground">No audit events for this user.</div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-white/[0.05]">
              {recentAudit.map((log) => {
                const actionLabel = log.action.replace(/^ADMIN_/, "").replace(/_/g, " ");
                return (
                  <li key={log.id} className="flex min-w-0 flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <V2Badge tone={auditActionTone(log.action)}>{actionLabel}</V2Badge>
                      <V2Badge tone={auditStatusTone(log.status)}>{log.status}</V2Badge>
                    </div>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                      {log.adminEmail ?? "unknown admin"}{log.reason ? ` · ${log.reason}` : ""}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground sm:text-[11px]"><LocalTime value={log.createdAt} /></span>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminSurface>
      </section>
    </div>
  );
}

function SummaryTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.035]">{icon}</span>
        <span className="text-[9px] font-black uppercase tracking-[0.15em]">{label}</span>
      </div>
      <div className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">{value}</div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 text-sm text-slate-800 dark:text-slate-300">{value}</dd>
    </div>
  );
}

function MetricTile({ label, value, bar, sub }: { label: string; value: string; bar?: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.065] bg-slate-50 dark:bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Gauge className="h-3.5 w-3.5" />
        <p className="text-[9px] font-black uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-black leading-5 text-slate-950 dark:text-white">{value}</p>
      {bar && <div className="mt-3">{bar}</div>}
      {sub && <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{sub}</p>}
    </div>
  );
}
