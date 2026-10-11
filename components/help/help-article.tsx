"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, List } from "lucide-react";
import { useUi } from "@/components/i18n/use-ui";
import { useI18n } from "@/providers/i18n-provider";
import { localizePublicPath } from "@/lib/i18n/config";
import { AP3K_HELP_ARTICLES, type HelpArticle } from "@/lib/ap3k-help";
import { helpCategory, relatedHelpArticles } from "@/lib/help-navigation";
import type { BlogSection } from "@/lib/blog";
import TutorialScreenshot from "@/components/website/tutorial-screenshot";
import { TUTORIAL_LABELS } from "@/lib/tutorial-content";

export default function HelpArticleView({ article, sections }: { article: HelpArticle; sections: BlogSection[] }) {
  const tr = useUi();
  const { locale } = useI18n();
  const path = (href: string) => localizePublicPath(href, locale);
  const category = helpCategory(article);
  const related = relatedHelpArticles(article.slug);
  const siblings = AP3K_HELP_ARTICLES.filter(item => item.category === article.category);

  return <div className="mx-auto max-w-6xl">
    <nav aria-label={tr("Back to help")} className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
      <Link href={path("/help")} className="inline-flex min-h-11 items-center gap-2 font-medium hover:text-violet-600 dark:hover:text-violet-300"><ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />{tr("Back to help")}</Link>
      <ChevronRight aria-hidden="true" className="h-3 w-3 rtl:rotate-180" />
      <Link href={path(`/help#topic-${category.id}`)} className="inline-flex min-h-11 items-center hover:text-violet-600 dark:hover:text-violet-300">{tr(article.category)}</Link>
    </nav>
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
      <article className="min-w-0" data-help-article={article.slug}>
        <header>
          <p className="text-xs font-bold text-violet-600 dark:text-violet-300">{tr(article.category)}</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl sm:leading-tight">{tr(article.title)}</h1>
          <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">{tr(article.summary)}</p>
        </header>
        <details className="group mt-7 rounded-2xl border border-slate-200 bg-white px-5 dark:border-white/10 dark:bg-[#101827]">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden"><List aria-hidden="true" className="h-4 w-4 text-violet-500" /><span className="flex-1">{tr("In this article")}</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
          <nav aria-label={tr("In this article")} className="border-t border-slate-100 pb-3 pt-2 dark:border-white/10"><a href="#steps" className="block py-2 text-sm leading-6 text-slate-600 hover:text-violet-600 dark:text-slate-300">{tr("Step by step")}</a>{sections.map((section, index) => <a key={section.heading} href={`#section-${index + 1}`} className="block py-2 text-sm leading-6 text-slate-600 hover:text-violet-600 dark:text-slate-300">{tr(section.heading)}</a>)}<a href="#related" className="block py-2 text-sm leading-6 text-slate-600 hover:text-violet-600 dark:text-slate-300">{tr("Related questions")}</a></nav>
        </details>
        <section id="steps" className="mt-10 scroll-mt-28">
          <h2 className="text-xl font-bold">{tr("Step by step")}</h2>
          <ol className="mt-5 space-y-4">{article.steps.map((step, index) => <li key={step} className="flex gap-3 text-base leading-7 text-slate-700 dark:text-slate-300"><span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">{index + 1}</span><span>{tr(step)}</span></li>)}</ol>
        </section>
        <p className="mt-9 rounded-xl border-s-2 border-violet-400 bg-violet-50 px-4 py-3 text-xs leading-6 text-slate-600 dark:bg-violet-500/10 dark:text-slate-400">{tr(TUTORIAL_LABELS.hint)}</p>
        {sections.map((section, index) => <section key={section.heading} id={`section-${index + 1}`} className="mt-10 scroll-mt-28 border-t border-slate-200 pt-8 dark:border-white/10">
          <h2 className="text-xl font-bold leading-8 sm:text-2xl">{tr(section.heading)}</h2>
          <div className="mt-4 space-y-4 text-base leading-8 text-slate-700 dark:text-slate-300">{section.paragraphs.map(paragraph => <p key={paragraph}>{tr(paragraph)}</p>)}</div>
          {section.bullets && <ul className="mt-4 list-disc space-y-2 ps-5 text-base leading-8 text-slate-700 marker:text-violet-500 dark:text-slate-300">{section.bullets.map(bullet => <li key={bullet}>{tr(bullet)}</li>)}</ul>}
          {section.steps && <ol className="mt-4 list-decimal space-y-3 ps-5 text-base leading-8 text-slate-700 dark:text-slate-300">{section.steps.map(step => <li key={step.title}><strong>{tr(step.title)}</strong><p>{tr(step.body)}</p></li>)}</ol>}
          {section.screenshot && <TutorialScreenshot id={section.screenshot} />}
        </section>)}
        <section id="related" className="mt-12 scroll-mt-28 border-t border-slate-200 pt-8 dark:border-white/10">
          <h2 className="text-xl font-bold">{tr("Related questions")}</h2>
          <ul className="mt-4 divide-y divide-slate-200 dark:divide-white/10">{related.map(item => <li key={item.slug}><Link href={path(`/help/${item.slug}`)} className="group flex min-h-16 items-center gap-4 py-4 text-sm font-semibold leading-6 hover:text-violet-600 dark:hover:text-violet-300"><span className="flex-1">{tr(item.title)}</span><ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-violet-500 rtl:rotate-180" /></Link></li>)}</ul>
        </section>
      </article>
      <aside className="min-w-0 lg:sticky lg:top-28">
        <nav aria-label={tr("More in this topic")} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#101827]">
          <h2 className="px-2 pb-3 pt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{tr("More in this topic")}</h2>
          <ul className="space-y-1">{siblings.map(item => <li key={item.slug}><Link href={path(`/help/${item.slug}`)} aria-current={item.slug === article.slug ? "page" : undefined} className={`block rounded-xl px-3 py-3 text-sm leading-6 transition-colors ${item.slug === article.slug ? "bg-violet-50 font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>{tr(item.title)}</Link></li>)}</ul>
          <Link href={path("/help")} className="mt-3 block border-t border-slate-100 px-2 pb-1 pt-4 text-sm font-semibold text-violet-700 dark:border-white/10 dark:text-violet-300">{tr("All topics")}</Link>
        </nav>
        <div className="mt-5 rounded-2xl bg-violet-50 p-5 dark:bg-violet-500/10"><h2 className="text-sm font-bold">{tr("Still need help?")}</h2><Link href={path("/contact")} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">{tr("Email support")}<ArrowRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" /></Link></div>
      </aside>
    </div>
  </div>;
}
