"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Search, Workflow, Zap, Plus } from "lucide-react";
import AutomationTable from "./automation-table";
import AutomationEmptyState from "./automation-empty-state";
import { matchesAutomationCategory, type AutomationCategory } from "@/lib/automation-category";
import { useUi } from "@/components/i18n/use-ui";

export default function AutomationLibrary({ slug, automations }: { slug: string; automations: any[] }) {
  const tr = useUi();
  const [category, setCategory] = useState<AutomationCategory>("all");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => automations.filter((automation) => {
    if (!matchesAutomationCategory(automation, category)) return false;
    const text = [automation.name, ...(automation.keywords ?? []).map((k: { word: string }) => k.word), ...(automation.posts ?? []).map((p: { caption?: string }) => p.caption)].join(" ").toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }), [automations, category, query]);
  return <section data-automation-library className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-5" aria-label={tr("Automations")}>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap sm:justify-between sm:gap-3">
      <div role="group" aria-label={tr("Automation category")} className="inline-flex max-w-full gap-1 rounded-xl bg-[#f2f2f4] p-1 dark:bg-[#1d2030]">
        {([{ id: "all", label: "All", Icon: Check }, { id: "basic", label: "Basic", Icon: Zap }, { id: "flow", label: "Flow", Icon: Workflow }] as const).map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)} className={`inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs sm:gap-2 sm:text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 sm:px-5 ${category === id ? "bg-white text-slate-950 shadow-sm dark:bg-[#303448] dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}><Icon size={16} aria-hidden="true" className={`hidden sm:block ${category === id ? "text-sky-600 dark:text-sky-300" : ""}`} />{tr(label)}</button>)}
      </div>
      <div className="contents sm:ml-auto sm:flex sm:w-auto sm:items-center sm:gap-2">
        <label className="relative col-span-2 row-start-2 min-w-0 flex-1 sm:w-60"><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} aria-label={tr("Search automations")} placeholder={tr("Search")} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:border-white/10 dark:bg-[#141622] dark:text-white" /></label>
        {automations.length > 0 && <Link href={`/dashboard/${slug}/automation/new`} aria-label={tr("New automation")} className="ap3k-gradient-button col-start-2 row-start-1 inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 px-3 text-sm font-semibold"><Plus size={17} aria-hidden="true" /><span className="sm:hidden">{tr("New")}</span><span className="hidden sm:inline">{tr("New automation")}</span></Link>}
      </div>
    </div>
    {automations.length === 0 ? <div className="grid min-h-[calc(100svh-220px)] place-items-center"><AutomationEmptyState slug={slug} /></div> : rows.length ? <AutomationTable key={`${category}:${query}`} slug={slug} automations={rows} showControls={false} /> : <div className="grid min-h-[320px] place-content-center gap-3 px-4 text-center"><h2 className="text-lg font-bold">{tr(query.trim() ? "No matching automations" : category === "flow" ? "No flow automations yet" : "No basic automations yet")}</h2><p className="text-sm text-slate-500 dark:text-slate-400">{tr("Choose another category or clear your search.")}</p><button type="button" className="mx-auto rounded-xl px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-400/10" onClick={() => { setCategory("all"); setQuery(""); }}>{tr("Show all automations")}</button></div>}
  </section>;
}
