import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { localizePublicPath } from "@/lib/i18n/config";
import { CheckCircle2, Circle } from "lucide-react";
import { UiText } from "@/components/i18n/localized-copy";

export default function ActivationChecklist({ slug, connected, created, active, sent }: {
  slug: string; connected: boolean; created: boolean; active: boolean; sent: boolean;
}) {
  if (connected && created && active && sent) return null;
  const steps = [
    { label: "Connect this Instagram account", done: connected, href: `/dashboard/${slug}/account` },
    { label: "Create an automation", done: created, href: `/dashboard/${slug}/automation/new` },
    { label: "Activate an automation", done: active, href: `/dashboard/${slug}/automation` },
    { label: "Send the first automated reply", done: sent, href: `${localizePublicPath("/help", getServerLocale())}#automation-troubleshooting` },
  ];
  return <section className="rounded-2xl border border-violet-200 bg-white p-5 dark:border-violet-400/20 dark:bg-white/[0.04]">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-bold"><UiText>Your first successful automation</UiText></h2>
      <span className="text-sm tabular-nums">{steps.filter(step => step.done).length}/4</span>
    </div>
    <ol className="mt-4 grid gap-3 sm:grid-cols-2">
      {steps.map(step => <li key={step.label} className="flex items-center gap-2 text-sm">
        {step.done ? <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0 text-emerald-600 light:text-emerald-700" /> : <Circle aria-hidden className="h-5 w-5 shrink-0 text-slate-400 light:text-slate-600" />}
        {step.done ? <span><UiText>{step.label}</UiText><span className="sr-only"> ✓</span></span> : <Link href={step.href} className="min-h-11 content-center font-semibold text-violet-700 underline underline-offset-4 dark:text-violet-300"><UiText>{step.label}</UiText></Link>}
      </li>)}
    </ol>
    <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300"><UiText>Test from another Instagram account, then refresh this page. A recorded send confirms API acceptance, not that the recipient read it.</UiText></p>
  </section>;
}
