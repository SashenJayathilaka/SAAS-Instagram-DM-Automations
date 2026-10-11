import Link from "next/link";
import { requireOwnerAdmin } from "@/lib/admin";
import { client } from "@/lib/prisma";
import { AdminPageHeader, AdminSurface } from "@/components/admin-v2/page-header";
import { marketingReady } from "@/lib/marketing/delivery";
import { LAUNCH_KIT_PATH, marketingEmail } from "@/lib/marketing/content";
import { processMarketingEmailsAction } from "@/actions/admin/marketing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export default async function AcquisitionPage(props: { searchParams?: Promise<{ run?: string }> }) {
  const searchParams = await props.searchParams;
  await requireOwnerAdmin();
  const since = new Date(Date.now() - 30 * 86400000);
  const realLead = { NOT: { email: { endsWith: "@resend.dev" } } };
  const [requested, confirmed, unsubscribed, suppressed, completed, sources, deliveries, cohort, connected, active] = await Promise.all([
    client.marketingLead.count({ where: realLead }),
    client.marketingLead.count({ where: { ...realLead, confirmedAt: { not: null } } }),
    client.marketingLead.count({ where: { ...realLead, unsubscribedAt: { not: null } } }),
    client.marketingLead.count({ where: { ...realLead, suppressedAt: { not: null } } }),
    client.marketingLead.count({ where: { ...realLead, completedAt: { not: null } } }),
    client.marketingLead.groupBy({ by: ["source"], where: realLead, _count: true }),
    client.emailDelivery.groupBy({ by: ["status"], where: { category: "lead_nurture" }, _count: true }),
    client.user.count({ where: { createdAt: { gte: since } } }),
    client.user.count({ where: { createdAt: { gte: since }, integrations: { some: { status: "CONNECTED" } } } }),
    client.user.count({ where: { createdAt: { gte: since }, automations: { some: { active: true } } } }),
  ]);
  return (
    <div className="space-y-7">
      <AdminPageHeader eyebrow="Customer acquisition" title="Acquisition" description="Follow new email subscribers and the activation of accounts created in the last 30 days. These are database records; visits, ad attribution, and paid invoices are measured separately." />
      <AdminSurface className="p-6">
        <h2 className="text-lg font-bold">Launch-kit email series</h2>
        <p className="mt-2 text-sm text-muted-foreground">{marketingReady() ? "Ready for new confirmed subscribers. Sends only in production; at most 30 marketing attempts per day. Daily processing uses the dedicated signed GitHub workflow." : "Paused: production delivery and signed webhooks must be configured. The public kit remains available."}</p>
        {searchParams?.run ? <p role="status" className="mt-3 text-sm">{searchParams.run.startsWith("sent-") && /^sent-\d+$/.test(searchParams.run) ? `Queue processed: ${searchParams.run.slice(5)} emails accepted by the provider.` : "Queue could not run. Check delivery configuration and Email Center."}</p> : null}
        <form action={processMarketingEmailsAction} className="mt-4"><button className="min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent">Process due emails</button><p className="mt-2 text-xs text-muted-foreground">Sends only eligible queued messages and due lessons. Existing consent, suppression, pacing, and daily limits still apply.</p></form>
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">{[["Requested", requested], ["Confirmed", confirmed], ["Unsubscribed", unsubscribed], ["Suppressed", suppressed], ["Completed or customer exit", completed]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
        <p className="mt-4 text-sm text-muted-foreground">Requested and confirmed counts are cumulative, including subsequent opt-outs. Resend simulator addresses are excluded. No existing account or Instagram contact is automatically added.</p>
        <div className="mt-5 flex flex-wrap gap-5 text-sm font-semibold"><Link href={LAUNCH_KIT_PATH} className="text-violet-700 underline dark:text-violet-300">Open the public kit</Link><Link href="/admin/emails" className="text-violet-700 underline dark:text-violet-300">Inspect delivery records</Link></div>
      </AdminSurface>
      <AdminSurface className="p-6"><h2 className="text-lg font-bold">Last 30 days: signup cohort</h2><p className="mt-2 text-sm text-muted-foreground">Current state of accounts created during this period. Includes owner and test accounts; it is not a verified customer conversion rate.</p><dl className="mt-5 grid gap-4 sm:grid-cols-3">{[["Accounts created", cohort], ["Now connected", connected], ["Now have an active automation", active]].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-3xl font-bold">{value}</dd></div>)}</dl></AdminSurface>
      <div className="grid gap-5 lg:grid-cols-2"><AdminSurface className="p-6"><h2 className="font-bold">Signup pages</h2><ul className="mt-4 space-y-2 text-sm">{sources.length ? sources.map(row => <li key={row.source}>{row.source}: {row._count}</li>) : <li>No requests yet.</li>}</ul></AdminSurface><AdminSurface className="p-6"><h2 className="font-bold">Email delivery status</h2><ul className="mt-4 space-y-2 text-sm">{deliveries.length ? deliveries.map(row => <li key={row.status}>{row.status}: {row._count}</li>) : <li>No emails queued yet.</li>}</ul><p className="mt-3 text-xs text-muted-foreground">SENT means provider acceptance. DELIVERED means a delivery webhook was received. Neither proves that a person read the email.</p></AdminSurface></div>
      <AdminSurface className="p-6"><h2 className="font-bold">What subscribers receive</h2><div className="mt-4 space-y-4">{(["confirm", "kit", "test", "launch"] as const).map(stage => <details key={stage} className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-semibold">{stage}: {marketingEmail(stage, "creator", "[confirmation link]", "[unsubscribe link]").subject}</summary><pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-muted-foreground">{marketingEmail(stage, "creator", "[confirmation link]", "[unsubscribe link]").text}</pre></details>)}</div></AdminSurface>
    </div>
  );
}
