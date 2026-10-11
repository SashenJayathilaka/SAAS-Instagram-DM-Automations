import Link from "next/link";
import { BadgeDollarSign, BriefcaseBusiness, CreditCard, Sparkles, Users } from "lucide-react";
import { getAdminV2BillingOverview } from "@/lib/admin-v2/operations-queries";
import { stripeCustomerDashboardUrl } from "@/lib/admin-control-center";
import { StatCard } from "@/components/admin-v2/stat-card";
import { V2Badge, statusTone } from "@/components/admin-v2/v2-badge";
import { V2Table } from "@/components/admin-v2/v2-table";
import { AdminPageHeader, AdminSectionHeader } from "@/components/admin-v2/page-header";
import LocalTime from "@/components/global/local-time";

function planBadge(plan: string) {
  if (plan === "BUSINESS") return <V2Badge tone="blue">Business</V2Badge>;
  if (plan === "PRO") return <V2Badge tone="pink">Pro</V2Badge>;
  return <V2Badge tone="slate">Free</V2Badge>;
}

export default async function AdminBillingPage() {
  const { stats, rows: subscriptions } = await getAdminV2BillingOverview();
  const rows = subscriptions.map((subscription) => {
    const stripeUrl = stripeCustomerDashboardUrl(subscription.customerId);
    const overrideExpired = Boolean(subscription.overrideExpiresAt && subscription.overrideExpiresAt.getTime() <= Date.now());

    return [
      <div key="user" className="min-w-0">{subscription.userId ? <Link href={`/admin/users/${subscription.userId}`} className="break-all font-bold text-slate-800 dark:text-slate-100 transition hover:text-pink-700 dark:hover:text-pink-300 sm:break-normal">{subscription.email ?? "Unknown user"}</Link> : <span className="font-bold text-muted-foreground dark:text-slate-400">{subscription.email ?? "Unlinked subscription"}</span>}</div>,
      <span key="plan">{planBadge(subscription.plan)}</span>,
      stripeUrl ? <a key="stripe" href={stripeUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-sky-500/15 bg-sky-500/[0.05] px-2.5 py-1.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 transition hover:bg-sky-500/[0.1]">Open Stripe ↗</a> : <span key="stripe" className="text-[11px] text-muted-foreground">Not linked</span>,
      subscription.hasOverrides ? <div key="override" className="flex flex-col items-start gap-1"><V2Badge tone={overrideExpired ? "slate" : "amber"}>{overrideExpired ? "Expired override" : "Custom limits"}</V2Badge>{subscription.overrideReason && <span className="max-w-[220px] truncate text-[10px] text-muted-foreground" title={subscription.overrideReason}>{subscription.overrideReason}</span>}</div> : <span key="override" className="text-[11px] text-muted-foreground">Plan defaults</span>,
      <V2Badge key="status" tone={statusTone(subscription.userStatus ?? "UNKNOWN")}>{subscription.userStatus ?? "Unknown"}</V2Badge>,
      <span key="updated" className="whitespace-nowrap text-[11px] text-muted-foreground"><LocalTime value={subscription.updatedAt} /></span>,
    ];
  });

  return (
    <div className="flex flex-col gap-7 sm:gap-8">
      <AdminPageHeader eyebrow="Billing" title="Plans & subscription access" description="Free, Pro, Business, Stripe linkage, overrides, and auditable owner controls in one operational view." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Subscriptions" value={stats.total} sub="Internal subscription records" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Pro" value={stats.pro} tone="pink" icon={<Sparkles className="h-4 w-4" />} />
        <StatCard label="Business" value={stats.business} tone="blue" icon={<BriefcaseBusiness className="h-4 w-4" />} />
        <StatCard label="Free" value={stats.free} icon={<BadgeDollarSign className="h-4 w-4" />} />
        <StatCard label="Stripe linked" value={stats.stripeLinked} tone="blue" icon={<CreditCard className="h-4 w-4" />} />
      </div>
      <section>
        <AdminSectionHeader title="Recent subscriptions" description="Most recently updated subscription records, with direct Stripe access only when a customer ID exists." />
        <V2Table headers={["User", "Plan", "Stripe", "Limits", "User status", "Updated"]} rows={rows} empty="No subscription records found." />
      </section>
    </div>
  );
}
