"use client";

import { useUi } from "@/components/i18n/use-ui";
import { AP3K_HELP_ARTICLES } from "@/lib/ap3k-help";
import { HELP_CATEGORIES, searchHelpArticles } from "@/lib/help-navigation";
import { ArrowRight, BookOpen, ChevronRight, CreditCard, Inbox, Instagram, Search, ShieldCheck, Sparkles, Workflow, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";
import { localizePublicPath } from "@/lib/i18n/config";

const icons = [BookOpen, Instagram, Workflow, Sparkles, Inbox, CreditCard, ShieldCheck];

export default function HelpCenter() {
  const tr = useUi();
  const { locale } = useI18n();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => searchHelpArticles(query, tr), [query, tr]);
  const path = (href: string) => localizePublicPath(href, locale);

  useEffect(() => {
    // Keep old bookmarked /help#article links working after articles get their own URLs.
    const followLegacyLink = () => {
      const slug = window.location.hash.slice(1);
      if (AP3K_HELP_ARTICLES.some(article => article.slug === slug)) {
        window.location.replace(localizePublicPath(`/help/${slug}`, locale));
      }
    };
    followLegacyLink();
    window.addEventListener("hashchange", followLegacyLink);
    return () => window.removeEventListener("hashchange", followLegacyLink);
  }, [locale]);

  return <div className="mx-auto max-w-6xl">
    <header className="mx-auto max-w-2xl text-center">
      <p className="ap3k-kicker">{tr("AP3K Documentation")}</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{tr("How can we help?")}</h1>
      <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">{tr("Find an answer, follow the steps, and get back to your work.")}</p>
      <div role="search" className="mt-7 flex items-center gap-3 rounded-2xl border border-slate-300 bg-white p-2 ps-4 shadow-lg shadow-violet-950/5 focus-within:ring-2 focus-within:ring-violet-500 dark:border-white/15 dark:bg-[#101827]">
        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-violet-500" />
        <label htmlFor="help-search" className="sr-only">{tr("Search help")}</label>
        <input id="help-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={tr("Search AP3K help…")} className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:hidden" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label={tr("Clear search")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-slate-100 focus-visible:outline-violet-500 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>}
      </div>
    </header>

    {!query.trim() && <nav aria-label={tr("Browse by topic")} className="mt-8 flex flex-wrap justify-center gap-2">
      {HELP_CATEGORIES.map(category => <a key={category.id} href={`#topic-${category.id}`} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white/70 px-4 text-xs font-semibold text-slate-600 transition-colors hover:border-violet-400 hover:text-violet-700 focus-visible:outline-violet-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-violet-300">{tr(category.title)}</a>)}
    </nav>}

    <div className="mb-5 mt-12 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{tr(query.trim() ? "Search results" : "Browse by topic")}</h2>
      <span role="status" aria-live="polite" aria-atomic="true" className="text-sm tabular-nums text-slate-500 dark:text-slate-400">{filtered.length} / {AP3K_HELP_ARTICLES.length}</span>
    </div>
    <div className="grid items-start gap-5 md:grid-cols-2" data-help-directory>
      {HELP_CATEGORIES.map((category, index) => {
        const articles = filtered.filter(article => article.category === category.title);
        const Icon = icons[index];
        if (!articles.length) return null;
        return <section key={category.id} id={`topic-${category.id}`} aria-labelledby={`heading-${category.id}`} className="min-w-0 scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101827]">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5 dark:border-white/5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"><Icon aria-hidden="true" className="h-5 w-5" /></span>
            <h3 id={`heading-${category.id}`} className="flex-1 font-bold">{tr(category.title)}</h3>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{articles.length}</span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {articles.map(article => <li key={article.slug}><Link href={path(`/help/${article.slug}`)} className="group flex min-h-16 items-center gap-4 px-5 py-4 text-sm font-medium leading-6 transition-colors hover:bg-violet-50 focus-visible:outline-violet-500 focus-visible:outline-offset-[-3px] dark:hover:bg-violet-500/10">
              <span className="min-w-0 flex-1">{tr(article.title)}</span><ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 transition-transform motion-safe:group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0" />
            </Link></li>)}
          </ul>
        </section>;
      })}
    </div>
    {!filtered.length && <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-white/15"><p className="text-slate-600 dark:text-slate-400">{tr("Try another search or browse all topics.")}</p><button onClick={() => setQuery("")} className="mt-4 min-h-11 rounded-lg px-4 font-semibold text-violet-700 underline underline-offset-4 dark:text-violet-300">{tr("All topics")}</button></div>}
    <div className="mt-10 flex flex-col items-start justify-between gap-3 rounded-2xl bg-violet-50 p-6 dark:bg-violet-500/10 sm:flex-row sm:items-center">
      <p className="font-semibold">{tr("Still need help?")}</p>
      <Link href={path("/contact")} className="inline-flex min-h-11 items-center gap-2 font-semibold text-violet-700 dark:text-violet-300">{tr("Email support")}<ArrowRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" /></Link>
    </div>
  </div>;
}
