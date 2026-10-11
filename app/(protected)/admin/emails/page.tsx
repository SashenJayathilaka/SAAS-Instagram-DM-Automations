import Link from "next/link";
import { MailCheck, Send, ShieldCheck, TriangleAlert } from "lucide-react";
import { adminSendEmailTestAction, adminSendOwnerAlertTestAction, adminRetryOwnerAlertsAction } from "@/actions/admin/email";
import { AdminPageHeader, AdminSectionHeader, AdminSurface } from "@/components/admin-v2/page-header";
import { V2Badge } from "@/components/admin-v2/v2-badge";
import { EMAIL_TEMPLATE_LIST, EMAIL_TEMPLATES, isEmailTemplateId } from "@/lib/email/catalog";
import { getEmailAdminOverview } from "@/lib/email/admin";
import LocalTime from "@/components/global/local-time";

export default async function EmailCenterPage(
  props: { searchParams?: Promise<{ template?: string; test?: string; ownerTest?: string }> }
) {
  const searchParams = await props.searchParams;
  const selectedId = isEmailTemplateId(searchParams?.template) ? searchParams.template : "welcome";
  const selected = EMAIL_TEMPLATES[selectedId];
  const overview = await getEmailAdminOverview();
  const sentCount = (overview.counts.SENT || 0) + (overview.counts.DELIVERED || 0) + (overview.counts.OPENED || 0) + (overview.counts.CLICKED || 0);
  const failureCount = (overview.counts.FAILED || 0) + (overview.counts.BOUNCED || 0) + (overview.counts.COMPLAINED || 0) + (overview.counts.SUPPRESSED || 0);

  return (
    <div className="flex flex-col gap-7 sm:gap-8">
      <AdminPageHeader
        eyebrow="Email system"
        title="AP3K Email Center"
        description="Preview every customer email, verify delivery health, and send a protected test to the owner inbox. Critical facts stay deterministic; optional AI copy can only personalize non-sensitive lifecycle messages."
        actions={<V2Badge tone={overview.configuration.configured ? "green" : "amber"}>{overview.configuration.configured ? "Delivery connected" : "Connection required"}</V2Badge>}
      />

      {searchParams?.test ? (
        <div className={`rounded-xl border px-4 py-3 text-xs font-bold ${searchParams.test === "sent" ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-200" : "border-amber-500/20 bg-amber-500/[0.08] text-amber-800 dark:text-amber-200"}`}>
          {searchParams.test === "sent" ? "Test email sent to the AP3K owner inbox." : searchParams.test === "not-configured" ? "Connect Resend and verify the AP3K sending domain before sending tests." : `Test email was not sent (${searchParams.test}).`}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard label="Templates" value={EMAIL_TEMPLATE_LIST.length} detail="Transactional + lifecycle" icon={<MailCheck className="h-4 w-4" />} />
        <StatusCard label="Successful" value={sentCount} detail="Sent or confirmed by Resend" icon={<Send className="h-4 w-4" />} />
        <StatusCard label="Delivery issues" value={failureCount} detail="Failed, bounced, or suppressed" icon={<TriangleAlert className="h-4 w-4" />} />
        <StatusCard label="Webhook" value={overview.configuration.webhookConfigured ? "Ready" : "Missing"} detail="Signed delivery events" icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <AdminSurface className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Owner alerts</h2>
          <V2Badge tone={overview.ownerAlerts.enabled && overview.configuration.configured ? "green" : "amber"}>{overview.ownerAlerts.enabled && overview.configuration.configured ? "Enabled" : "Not sending"}</V2Badge>
        </div>
        <p className="mt-3 break-all text-sm text-slate-800 dark:text-slate-300">Destination: <strong>{overview.ownerAlerts.recipient}</strong></p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground dark:text-slate-400">New registrations, successful payments and renewals, payment failures, ended subscriptions, refunds, and disputes. Routine logins, comments, DMs, and automation activity stay out of your inbox.</p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">Repeated webhook deliveries are deduplicated. Payment failures are reported once per invoice. Preview deployments and Stripe test payments never send owner alerts.</p>
        {!overview.ownerAlerts.retryConfigured && <p className="mt-3 text-xs text-amber-800 dark:text-amber-300">Automatic retries require CRON_SECRET in production. Immediate alerts still send when delivery is connected.</p>}
        {searchParams?.ownerTest && <p role="status" className="mt-3 text-sm text-violet-700 dark:text-violet-200">{searchParams.ownerTest === "sent" ? "Owner test accepted by the email provider. Check the delivery status below." : searchParams.ownerTest === "disabled" ? "Owner alerts are disabled in this environment." : searchParams.ownerTest === "checked" ? "Eligible queued alerts checked. See the delivery activity below." : "Test queued or already processed. Check the delivery activity below."}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={adminSendOwnerAlertTestAction}><button disabled={!overview.ownerAlerts.enabled || !overview.configuration.configured} className="min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-40">Send owner alert test</button></form>
          <form action={adminRetryOwnerAlertsAction}><button disabled={!overview.ownerAlerts.enabled || !overview.configuration.configured} className="min-h-11 rounded-xl border border-slate-200 dark:border-white/15 px-4 text-sm font-semibold disabled:opacity-40">Retry queued owner alerts</button></form>
        </div>
      </AdminSurface>

      <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div>
          <AdminSectionHeader title="Template library" description="Choose any customer event to inspect its real email." />
          <AdminSurface className="max-h-[760px] overflow-y-auto p-2">
            <div className="space-y-1">
              {EMAIL_TEMPLATE_LIST.map((template) => (
                <Link key={template.id} href={`/admin/emails?template=${template.id}`} className={`block rounded-xl border px-3 py-3 transition ${template.id === selectedId ? "border-pink-400/20 bg-pink-400/[0.08]" : "border-transparent hover:border-slate-200 dark:hover:border-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.03]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100">{template.label}</p>
                    <span className="rounded-full border border-slate-200 dark:border-white/[0.07] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-muted-foreground">{template.category}</span>
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{template.description}</p>
                </Link>
              ))}
            </div>
          </AdminSurface>
        </div>

        <div>
          <AdminSectionHeader
            title={selected.label}
            description={`${selected.description} ${selected.aiPersonalization ? "Safe AI personalization is available for this lifecycle message." : "Account facts and wording remain deterministic."}`}
            action={
              <form action={adminSendEmailTestAction.bind(null, selected.id)}>
                <button disabled={!overview.configuration.configured} className="rounded-lg border border-pink-400/20 bg-pink-400/[0.08] px-3 py-2 text-[11px] font-black text-pink-700 dark:text-pink-200 transition hover:bg-pink-400/[0.14] disabled:cursor-not-allowed disabled:opacity-40">Send owner test</button>
              </form>
            }
          />
          <AdminSurface className="overflow-hidden p-2 sm:p-3">
            <iframe title={`${selected.label} email preview`} src={`/api/admin/email-preview?template=${selected.id}`} className="h-[760px] w-full rounded-xl border-0 bg-[#F6F5FB]" />
          </AdminSurface>
        </div>
      </section>

      <section>
        <AdminSectionHeader title="Recent delivery activity" description="Provider IDs and failure states are stored for support and deliverability diagnostics." />
        <AdminSurface className="overflow-hidden">
          {overview.recent.length ? (
            <div className="divide-y divide-slate-200 dark:divide-white/[0.05]">
              {overview.recent.map((delivery) => (
                <div key={delivery.id} className="grid gap-2 px-4 py-3 text-[11px] sm:grid-cols-[150px_minmax(0,1fr)_130px_110px] sm:items-center">
                  <V2Badge tone={["FAILED", "BOUNCED", "COMPLAINED", "SUPPRESSED"].includes(delivery.status) ? "red" : delivery.status === "SKIPPED" ? "amber" : "green"}>{delivery.status}</V2Badge>
                  <div className="min-w-0"><p className="truncate font-bold text-slate-800 dark:text-slate-200">{delivery.subject}</p><p className="truncate text-muted-foreground">{delivery.templateId} · {delivery.recipient}</p>{delivery.errorMessage ? <p className="mt-1 text-rose-700 dark:text-rose-300">{delivery.errorMessage}</p> : null}</div>
                  <p className="truncate font-mono text-[9px] text-muted-foreground">{delivery.providerMessageId || "No provider ID"}</p>
                  <p className="text-muted-foreground"><LocalTime value={delivery.createdAt} /></p>
                </div>
              ))}
            </div>
          ) : <div className="px-5 py-12 text-center text-sm text-muted-foreground">No AP3K application emails have been sent yet.</div>}
        </AdminSurface>
      </section>
    </div>
  );
}

function StatusCard({ label, value, detail, icon }: { label: string; value: string | number; detail: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.025] p-4"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</p><span className="text-pink-700 dark:text-pink-300">{icon}</span></div><p className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p><p className="mt-1 text-[10px] text-muted-foreground">{detail}</p></div>;
}
