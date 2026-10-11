import { UiText } from "@/components/i18n/localized-copy";

export default function DashboardLoading() {
  return <div className="mx-auto w-full max-w-7xl py-6" role="status" aria-live="polite">
    <p className="mb-5 text-sm text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Loading…"}</UiText></p>
    <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
      <div className="h-8 w-1/3 rounded-xl bg-slate-200 dark:bg-white/10" />
      <div className="h-24 rounded-2xl bg-slate-200 dark:bg-white/10" />
      <div className="h-64 rounded-2xl bg-slate-200 dark:bg-white/10" />
    </div>
  </div>;
}
