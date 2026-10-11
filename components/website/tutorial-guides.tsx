"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { localizePublicPath } from "@/lib/i18n/config";
import { useUi } from "@/components/i18n/use-ui";
import { ILLUSTRATED_POSTS, TUTORIAL_LABELS } from "@/lib/tutorial-content";

export default function TutorialGuides() {
  const { locale } = useI18n();
  const tr = useUi();
  return <aside className="mx-auto mt-10 max-w-6xl rounded-3xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-500/20 dark:bg-violet-500/[0.06] sm:p-7">
    <h2 className="flex items-center gap-2 text-lg font-black"><BookOpen className="h-5 w-5 text-violet-500" />{tr(TUTORIAL_LABELS.guides)}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{tr(TUTORIAL_LABELS.hint)}</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{[{ slug: "connect-instagram-to-ap3k", title: "How to Connect Instagram to AP3K" }, ...ILLUSTRATED_POSTS].map((post, index) => <Link key={post.slug} href={localizePublicPath(`/blog/${post.slug}`, locale)} className="group flex items-start gap-3 rounded-2xl border border-violet-200/70 bg-white p-4 transition-colors hover:border-violet-400 dark:border-white/10 dark:bg-[#101827]">
      <span className="text-sm font-black text-violet-500">0{index + 1}</span><span className="min-w-0 flex-1 text-sm font-bold leading-6">{tr(post.title)}</span><ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-violet-500" />
    </Link>)}</div>
  </aside>;
}
