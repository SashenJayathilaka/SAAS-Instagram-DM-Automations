import Link from "next/link";
import { Activity, AlertTriangle, RadioTower, ShieldCheck, UserRoundCog, Workflow } from "lucide-react";
import { getAdminV2SystemSnapshot } from "@/lib/admin-v2/operations-queries";
import {
  adminDangerZoneStatus,
  adminEnvironmentLabel,
} from "@/lib/admin-control-center";
import { isAppReviewMode } from "@/lib/app-review-mode";
import { StatCard } from "@/components/admin-v2/stat-card";
import { V2Badge } from "@/components/admin-v2/v2-badge";
import { AdminPageHeader, AdminSurface } from "@/components/admin-v2/page-header";
import LocalTime from "@/components/global/local-time";
import { AiProviderSettings } from "@/components/admin-v2/ai-provider-settings";
import { getAiProviderPublicConfigs } from "@/lib/ai-reply";
import { aiProviderEncryptionReady } from "@/lib/ai-provider-crypto";

function configTone(value: boolean) {
  return value ? "green" as const : "amber" as const;
}

export default async function AdminSystemPage() {
  const [snapshot, aiProviders] = await Promise.all([
    getAdminV2SystemSnapshot(),
    getAiProviderPublicConfigs(),
  ]);
  const guardrails = adminDangerZoneStatus();
  const environment = adminEnvironmentLabel();
  const emailAllowlistConfigured = Boolean(process.env.ADMIN_EMAILS?.trim());
  const clerkAllowlistConfigured = Boolean(process.env.ADMIN_CLERK_USER_IDS?.trim());
  const explicitAdminAllowlist = emailAllowlistConfigured || clerkAllowlistConfigured;
  const instagramLoginEnabled = process.env.INSTAGRAM_LOGIN_ENABLED === "true";
  const appReviewMode = isAppReviewMode();

  return (
    <div className="flex flex-col gap-7 sm:gap-8">
      <AdminPageHeader
        eyebrow="System & safety"
        title="Operational control"
        description="High-level runtime health, deployment configuration, and owner guardrails. Secrets and raw Instagram access tokens are intentionally excluded."
        actions={<V2Badge tone={environment === "Production" ? "green" : "amber"}>{environment}</V2Badge>}
      />

      <AiProviderSettings
        encryptionReady={aiProviderEncryptionReady()}
        configs={aiProviders.map((provider) => ({
          ...provider,
          lastTestedAt: provider.lastTestedAt?.toISOString() ?? null,
        }))}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Meta events · 24h" value={snapshot.realMetaEvents24h} icon={<RadioTower className="h-4 w-4" />} tone="blue" />
        <StatCard
          label="Signature failures"
          value={snapshot.signatureFailures24h}
          tone={snapshot.signatureFailures24h > 0 ? "red" : "green"}
          icon={snapshot.signatureFailures24h > 0 ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Failed sends"
          value={snapshot.failedMessages24h}
          tone={snapshot.failedMessages24h > 0 ? "amber" : "green"}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Loop guard · 24h"
          value={snapshot.loopGuardEvents24h}
          tone={snapshot.loopGuardEvents24h > 0 ? "red" : "green"}
          icon={<Workflow className="h-4 w-4" />}
        />
        <StatCard
          label="Accounts to review"
          value={snapshot.reconnectRequired}
          tone={snapshot.reconnectRequired > 0 ? "amber" : "green"}
          icon={<UserRoundCog className="h-4 w-4" />}
        />
        <StatCard label="Admin actions · 24h" value={snapshot.adminActions24h} tone="pink" icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <AdminSurface className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Configuration</p>
              <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">Runtime state</h2>
            </div>
            <V2Badge tone={environment === "Production" ? "green" : "amber"}>{environment}</V2Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ConfigItem
              label="Admin allowlist"
              value={explicitAdminAllowlist ? "Explicitly configured" : "Legacy fallback active"}
              ok={explicitAdminAllowlist}
            />
            <ConfigItem
              label="Clerk-ID allowlist"
              value={clerkAllowlistConfigured ? "Configured" : "Optional / not set"}
              ok={explicitAdminAllowlist}
            />
            <ConfigItem label="Instagram Login" value={instagramLoginEnabled ? "Enabled" : "Disabled"} ok={instagramLoginEnabled} />
            <ConfigItem label="App Review mode" value={appReviewMode ? "Enabled" : "Disabled"} ok />
          </div>

          {!explicitAdminAllowlist && (
            <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-4 py-3 text-xs leading-5 text-amber-800 dark:text-amber-200/85">
              Configure <span className="font-mono">ADMIN_EMAILS</span> and/or <span className="font-mono">ADMIN_CLERK_USER_IDS</span> before removing the legacy authorization fallback.
            </div>
          )}

          <div className="mt-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-100/80 dark:bg-black/10 px-4 py-3 text-xs text-muted-foreground dark:text-slate-400">
            Last real Meta webhook:{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {snapshot.lastRealWebhook ? <LocalTime value={snapshot.lastRealWebhook.createdAt} /> : "None recorded"}
            </span>
          </div>
        </AdminSurface>

        <AdminSurface className="p-5 sm:p-6">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Guardrails</p>
          <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">Sensitive admin operations</h2>
          <div className="mt-5 divide-y divide-slate-200 dark:divide-white/[0.06]">
            {Object.entries(guardrails).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span className="text-xs font-bold text-muted-foreground dark:text-slate-400">
                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}
                </span>
                <V2Badge tone={value === "Disabled" ? "slate" : "green"}>{value}</V2Badge>
              </div>
            ))}
          </div>
        </AdminSurface>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <QuickLink href="/admin/diagnostics" title="Diagnostics" detail="Inspect webhook and delivery failures." />
        <QuickLink href="/admin/accounts" title="Accounts" detail="Review connection and webhook health." />
        <QuickLink href="/admin/audit" title="Audit log" detail="Review every sensitive admin action." />
      </section>
    </div>
  );
}

function ConfigItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.065] bg-slate-50 dark:bg-white/[0.025] p-3.5">
      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <div className="mt-2"><V2Badge tone={configTone(ok)}>{value}</V2Badge></div>
    </div>
  );
}

function QuickLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 dark:border-white/[0.075] bg-slate-50 dark:bg-white/[0.025] p-4 transition hover:-translate-y-0.5 hover:border-pink-500/25 hover:bg-slate-100 dark:hover:bg-white/[0.045] sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-950 dark:text-white">{title}</span>
        <span className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-pink-700 dark:group-hover:text-pink-300">→</span>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>
    </Link>
  );
}
