import Link from "next/link";
import { AdminPageHeader } from "@/components/admin-v2/page-header";
import { AnalyticsChart } from "@/components/admin-v2/analytics-chart";
import { getAdminAnalytics } from "@/lib/admin-v2/analytics";
import { getGoogleReports } from "@/lib/admin-v2/google-reports";
import { AdminRefreshButton } from "@/components/admin-v2/refresh-button";
import LocalTime from "@/components/global/local-time";

export default async function AnalyticsPage(
  props: {
    searchParams: Promise<{ days?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const days = searchParams.days === "7" ? 7 : 30;
  const [data, google] = await Promise.all([
    getAdminAnalytics(days),
    getGoogleReports(),
  ]);
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Growth intelligence"
        title="Analytics"
        description="Product activity, acquisition channels and search demand—with clear sources and reporting windows."
        actions={<AdminRefreshButton />}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-slate-200 dark:border-white/10 p-1">
          {[7, 30].map((n) => (
            <Link
              key={n}
              href={`/admin/analytics?days=${n}`}
              aria-current={days === n ? "page" : undefined}
              className={`rounded-md px-4 py-2 text-sm ${days === n ? "bg-violet-500/15 text-violet-700 dark:text-violet-200" : "text-muted-foreground dark:text-slate-400"}`}
            >
              {n} days
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground dark:text-slate-400">
          Product snapshot: <LocalTime value={data.updatedAt} />
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["New accounts", data.totals.signups],
          ["Successful sends", data.totals.sent],
          ["Captured leads", data.totals.leads],
          ["Failed attempts", data.totals.failed],
        ].map(([name, value]) => (
          <div key={name} className="admin-panel">
            <p className="text-sm text-muted-foreground dark:text-slate-400">{name}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {Number(value).toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Last {days} days · operational records
            </p>
          </div>
        ))}
      </div>
      <AnalyticsChart data={data.series} />
      <div className="admin-panel">
        <h2 className="font-semibold">Current plan mix</h2>
        <div className="mt-4 flex flex-wrap gap-6">
          {data.plans.map((p) => (
            <div key={p.plan}>
              <p className="text-xs text-muted-foreground dark:text-slate-400">{p.plan}</p>
              <p className="mt-1 text-2xl font-semibold">{p.count}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground dark:text-slate-400">
          Plan entitlements are not revenue or verified paying customers.
          Owner/test accounts are included. Deleted records are not
          reconstructed. Use Billing and Stripe for financial reconciliation.
        </p>
      </div>
      <Report
        title="Acquisition · Google Analytics"
        message={google.ga.message}
        connected={google.ga.connected}
        rows={google.ga.rows}
        columns={["Channel", "Sessions", "Active users", "Key events"]}
      />
      <Report
        title="Organic search · Google Search Console"
        message={google.gsc.message}
        connected={google.gsc.connected}
        rows={google.gsc.rows}
        columns={["Query", "Clicks", "Impressions", "CTR", "Average position"]}
      />
      <p className="text-xs text-muted-foreground">
        Google reports cache for up to 15 minutes. GA4 depends on cookie consent
        and configured key events; key events are not necessarily purchases.
        Search Console omits some queries and reports with a delay.
      </p>
      <div className="admin-panel space-y-4">
        <h2 className="font-semibold">Reporting connections</h2>
        <p className="text-sm leading-6 text-muted-foreground dark:text-slate-400">
          GA4 tracking is already installed. Reading reports requires separate,
          read-only access; tracking alone does not grant it.
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-violet-700 dark:text-violet-300">
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Google Analytics ↗
          </a>
          <a
            href="https://search.google.com/search-console?resource_id=https%3A%2F%2Fap3k.com%2F"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Search Console ↗
          </a>
          <Link href="/admin/seo">SEO workspace →</Link>
        </div>
        <details>
          <summary className="cursor-pointer text-sm text-slate-800 dark:text-slate-300">
            Connect embedded Google reports
          </summary>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-muted-foreground dark:text-slate-400">
            <li>
              Use a dedicated Google Cloud service account. Enable the Google
              Analytics Data API and Search Console API.
            </li>
            <li>
              Grant that service account read access to your GA4 property and
              AP3K Search Console property.
            </li>
            <li>
              Store its JSON credential only in Vercel’s encrypted production
              environment as <code>ADMIN_GOOGLE_SERVICE_ACCOUNT_JSON</code>.
              Never paste credentials into blog content or chat.
            </li>
            <li>
              Set <code>ADMIN_GA4_PROPERTY_ID</code> to the numeric property
              ID—not the G- measurement ID. Set <code>ADMIN_GSC_SITE_URL</code>{" "}
              to your verified URL-prefix or domain property.
            </li>
            <li>
              Redeploy. This page will show real reports or an explicit
              connection error.
            </li>
          </ol>
        </details>
      </div>
    </div>
  );
}
function Report({
  title,
  message,
  connected,
  rows,
  columns,
}: {
  title: string;
  message: string;
  connected: boolean;
  rows: { label: string; values: string[] }[];
  columns: string[];
}) {
  return (
    <section className="admin-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs ${connected ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-200"}`}
        >
          {connected ? "Connected" : "Setup required"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground dark:text-slate-400">{message}</p>
      {rows.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    className="whitespace-nowrap border-b border-slate-200 dark:border-white/10 p-3 text-xs font-medium text-muted-foreground dark:text-slate-400"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.label}-${i}`} className="border-b border-slate-200 dark:border-white/5">
                  <th className="p-3 font-normal">{r.label}</th>
                  {r.values.map((v, n) => (
                    <td className="p-3 tabular-nums" key={n}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : connected ? (
        <p className="mt-4 text-sm text-muted-foreground dark:text-slate-400">
          No report rows for this period.
        </p>
      ) : null}
    </section>
  );
}
