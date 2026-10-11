import { UiText } from "@/components/i18n/localized-copy";
import AutomationLibrary from "@/components/dashboard/automation-library";
import { getAllAutomation } from "@/actions/automation";
import { getDashboardUser as onUserInfo } from "@/lib/dashboard-data";
import { getCampaignTableMetrics } from "@/lib/dashboard-metrics";
import { buildCampaignBindingDiagnostics } from "@/lib/account-webhook-diagnostics";
import { getCanonicalInstagramIntegration } from "@/lib/instagram-integration-status";

type Props = { params: Promise<{ slug: string }> };

export default async function AutomationsPage(props: Props) {
  const params = await props.params;
  const [result, userResult] = await Promise.all([
    getAllAutomation(),
    onUserInfo(),
  ]);
  const automations =
    result.status === 200 && Array.isArray(result.data) ? result.data : [];
  const metrics =
    userResult.status === 200 && userResult.data?.id
      ? await getCampaignTableMetrics(userResult.data.id, userResult.data.integrations[0]?.id ?? "00000000-0000-0000-0000-000000000000")
      : {};
  const currentIntegration =
    userResult.status === 200
      ? getCanonicalInstagramIntegration(userResult.data?.integrations)
      : null;
  const bindingDiagnostics = buildCampaignBindingDiagnostics({
    integration: currentIntegration,
    campaigns: automations as any[],
  });
  const automationsWithMetrics = automations.map((automation: any) => ({
    ...automation,
    metrics: metrics[automation.id] ?? {
      runs: 0,
      leads: automation._count?.leads ?? 0,
    },
    currentAccountLabel: currentIntegration?.instagramUsername
      ? `@${currentIntegration.instagramUsername}`
      : "Current account",
    stalePost:
      bindingDiagnostics.find((item) => item.campaignId === automation.id)
        ?.stale ?? false,
  }));

  return (
    <div className="relative flex min-w-0 flex-1 flex-col px-1 py-2 text-slate-950 dark:text-slate-50 sm:px-2">
      <h1 className="sr-only">Automations</h1>
      {result.status === 200 ? <AutomationLibrary slug={params.slug} automations={automationsWithMetrics as any[]} /> : <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200"><UiText>Could not load your automations. Refresh the page to try again.</UiText></p>}
    </div>
  );
}
