import { AlertTriangle, RadioTower, ShieldCheck } from "lucide-react";
import { getAdminV2WebhookEvents, getAdminV2LoopGuardEvents } from "@/lib/admin-v2/queries";
import { V2Table } from "@/components/admin-v2/v2-table";
import { V2Badge, statusTone, eventTone } from "@/components/admin-v2/v2-badge";
import { AdvancedPanel } from "@/components/admin-v2/advanced-panel";
import { StatCard } from "@/components/admin-v2/stat-card";
import { AdminPageHeader, AdminSectionHeader } from "@/components/admin-v2/page-header";
import { humanError, humanEvent } from "@/lib/admin-v2/labels";
import LocalTime from "@/components/global/local-time";

const LOOP_PREVIEW = 10;
const WEBHOOK_PREVIEW = 20;

export default async function AdminV2DiagnosticsPage() {
  const [webhooks, loopGuard] = await Promise.all([
    getAdminV2WebhookEvents(0),
    getAdminV2LoopGuardEvents(),
  ]);

  const failedWebhooks = webhooks.filter((event) => event.status === "FAILED").length;
  const loopGuardRows = makeLoopRows(loopGuard);
  const webhookRows = makeWebhookRows(webhooks);

  return (
    <div className="flex flex-col gap-7 sm:gap-8">
      <AdminPageHeader
        eyebrow="Diagnostics"
        title="System diagnostics"
        description="Operational signals for Meta webhooks, delivery failures, and loop protection. Raw codes stay behind explicit advanced disclosures."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Recent webhook events"
          value={webhooks.length}
          sub="Latest diagnostic sample"
          tone="blue"
          icon={<RadioTower className="h-4 w-4" />}
        />
        <StatCard
          label="Failed in sample"
          value={failedWebhooks}
          sub={failedWebhooks > 0 ? "Review failures below" : "No failures in recent sample"}
          tone={failedWebhooks > 0 ? "red" : "green"}
          icon={failedWebhooks > 0 ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Loop guard events"
          value={loopGuard.length}
          sub="Latest protected events"
          tone={loopGuard.length > 0 ? "amber" : "green"}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      {loopGuard.length > 0 && (
        <section>
          <AdminSectionHeader
            title="Loop guard events"
            description={`Showing the ${Math.min(LOOP_PREVIEW, loopGuard.length)} most recent events first. Older events remain available below.`}
          />
          <V2Table
            headers={["Time", "Event", "Automation", "Owner"]}
            rows={loopGuardRows.slice(0, LOOP_PREVIEW)}
            empty="No loop guard events."
          />
          {loopGuard.length > LOOP_PREVIEW && (
            <details className="mt-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.018]">
              <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-muted-foreground dark:text-slate-400 hover:text-slate-950 dark:hover:text-white">
                Show all {loopGuard.length} recent loop guard events
              </summary>
              <div className="border-t border-slate-200 dark:border-white/[0.05] p-3 sm:p-4">
                <V2Table
                  headers={["Time", "Event", "Automation", "Owner"]}
                  rows={loopGuardRows}
                  empty="No loop guard events."
                />
              </div>
            </details>
          )}
        </section>
      )}

      <section>
        <AdminSectionHeader
          title="Webhook events"
          description={`Showing ${Math.min(WEBHOOK_PREVIEW, webhooks.length)} of the latest ${webhooks.length} diagnostic events.`}
        />
        <V2Table
          headers={["Time", "Source", "Type", "Status", "Automation", "Error"]}
          rows={webhookRows.slice(0, WEBHOOK_PREVIEW)}
          empty="No webhook events found."
        />

        {webhooks.length > WEBHOOK_PREVIEW && (
          <details className="mt-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.018]">
            <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-muted-foreground dark:text-slate-400 hover:text-slate-950 dark:hover:text-white">
              Show all {webhooks.length} recent webhook events
            </summary>
            <div className="border-t border-slate-200 dark:border-white/[0.05] p-3 sm:p-4">
              <V2Table
                headers={["Time", "Source", "Type", "Status", "Automation", "Error"]}
                rows={webhookRows}
                empty="No webhook events found."
              />
            </div>
          </details>
        )}

        <AdvancedPanel label="App Review notes">
          <p className="text-xs leading-relaxed text-muted-foreground dark:text-slate-400">
            This screen is an owner-only debugging surface. It is not part of the public AP3K workflow or the Meta reviewer journey, and raw diagnostic codes remain hidden until explicitly expanded.
          </p>
        </AdvancedPanel>
      </section>
    </div>
  );
}

function makeLoopRows(loopGuard: Awaited<ReturnType<typeof getAdminV2LoopGuardEvents>>) {
  return loopGuard.map((event) => [
    <span key="time" className="whitespace-nowrap tabular-nums text-[11px] text-muted-foreground">
      <LocalTime value={event.createdAt} />
    </span>,
    <V2Badge key="type" tone={eventTone(event.eventType)}>{humanEvent(event.eventType)}</V2Badge>,
    <span key="campaign" className="block max-w-[220px] truncate text-[11px] text-slate-800 dark:text-slate-300">{event.campaignName ?? "—"}</span>,
    <span key="owner" className="break-all text-[11px] text-muted-foreground sm:break-normal">{event.ownerEmail ?? "—"}</span>,
  ]);
}

function makeWebhookRows(webhooks: Awaited<ReturnType<typeof getAdminV2WebhookEvents>>) {
  return webhooks.map((event) => [
    <span key="time" className="whitespace-nowrap tabular-nums text-[11px] text-muted-foreground">
      <LocalTime value={event.createdAt} />
    </span>,
    <V2Badge key="source" tone={event.eventSource === "META_REAL" ? "green" : "blue"}>
      {event.eventSource === "META_REAL" ? "Meta" : event.eventSource}
    </V2Badge>,
    <span key="type" className="text-[11px] text-slate-800 dark:text-slate-300">{humanEvent(event.eventType)}</span>,
    <V2Badge key="status" tone={statusTone(event.status)}>{event.status}</V2Badge>,
    <span key="campaign" className="block max-w-[200px] truncate text-[11px] text-muted-foreground dark:text-slate-400">{event.campaignName ?? "—"}</span>,
    <div key="error" className="max-w-[260px]">
      {event.errorMessage ? (
        <>
          <p className="truncate text-[11px] text-slate-800 dark:text-slate-300" title={humanError(event.errorMessage)}>{humanError(event.errorMessage)}</p>
          <AdvancedPanel label="Raw code">
            <p className="break-all font-mono text-[10px] text-muted-foreground">{event.errorMessage}</p>
          </AdvancedPanel>
        </>
      ) : (
        <span className="text-[11px] text-muted-foreground">None</span>
      )}
    </div>,
  ]);
}
