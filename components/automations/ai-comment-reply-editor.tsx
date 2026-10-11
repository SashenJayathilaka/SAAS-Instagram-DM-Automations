"use client";
import { useUi } from "@/components/i18n/use-ui";
import { UiMessage } from "@/components/i18n/dashboard-values";
import { UiText } from "@/components/i18n/localized-copy";
import type { AiProtectionRules, AiReplyTone } from "@/lib/ai-reply-config";
import { LockKeyhole, Settings2, Sparkles } from "lucide-react";
import Link from "next/link";

type Props = {
  enabled: boolean;
  available: boolean;
  workspaceReady: boolean;
  planLabel: string;
  tone: AiReplyTone;
  instructions: string;
  protections: AiProtectionRules;
  settingsHref?: string;
  onChange: (next: Partial<{ enabled: boolean; tone: AiReplyTone; instructions: string; protections: AiProtectionRules }>) => void;
};

export default function AiCommentReplyEditor({ enabled, available, workspaceReady, planLabel, instructions, settingsHref = "#", onChange }: Props) {
  const tr = useUi();
  const locked = !available && !enabled;
  return (
    <section className={`overflow-hidden rounded-2xl border transition-colors ${enabled ? "border-violet-400/35 bg-violet-500/[0.06]" : "border-slate-200 light:border-slate-300 bg-white dark:border-white/10 dark:bg-white/[0.03]"}`}>
      <button type="button" role="switch" aria-checked={enabled} disabled={locked} onClick={() => onChange({ enabled: !enabled })} className="flex w-full items-center justify-between gap-4 p-5 text-start disabled:cursor-not-allowed">
        <span className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/12 text-violet-500 light:text-violet-700 dark:text-violet-300">{locked ? <LockKeyhole className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}</span>
          <span><span className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-950 dark:text-white"><UiText>{"AI comment"}</UiText><span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-300"><UiText>{"Pro"}</UiText></span></span><span className="mt-1 block text-xs leading-relaxed text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"AI replies to safe comments in your voice. This replaces saved variations for this automation."}</UiText></span></span>
        </span>
        <Toggle enabled={enabled} locked={locked} />
      </button>
      {locked ? <div className="border-t border-slate-200 light:border-slate-300 px-5 py-3 text-xs text-slate-500 light:text-slate-600 dark:border-white/10 dark:text-slate-400">{planLabel === "Free" ? <UiMessage source="Your Free plan includes saved replies. {upgrade} for AP3K AI." values={{ upgrade: <Link href={settingsHref.replace(/\/ai$/, "/billing")} className="font-black text-violet-600 dark:text-violet-300"><UiText>{"Upgrade to Pro"}</UiText></Link> }} /> : !workspaceReady ? <UiMessage source="Enable the AI Comments master switch in {settings} before using it here." values={{ settings: <Link href={settingsHref} className="font-black text-violet-600 dark:text-violet-300"><UiText>{"AP3K AI"}</UiText></Link> }} /> : <UiText>{"AP3K AI is unavailable right now."}</UiText>}</div> : null}
      {enabled ? <div className="space-y-4 border-t border-violet-500/15 p-5"><div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.05] p-4"><p className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-300"><UiText>{"Uses AP3K AI settings"}</UiText></p><p className="mt-1 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Tone, knowledge, brand voice, guardrails, and comment protection are managed once in AP3K AI."}</UiText></p><Link href={settingsHref} className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-violet-600 dark:text-violet-300"><Settings2 className="h-3.5 w-3.5" /> <UiText>{"Open AP3K AI"}</UiText></Link></div><label className="block"><span className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wider text-slate-500 light:text-slate-600"><span><UiText>{"Automation focus"}</UiText>{" "}<span className="font-semibold normal-case tracking-normal text-slate-400 light:text-slate-600"><UiText>{"(optional)"}</UiText></span></span><span>{instructions.length}/1600</span></span><textarea value={instructions} onChange={(event) => onChange({ instructions: event.target.value })} maxLength={1600} rows={4} dir="auto" placeholder={tr("Example: Focus on this product launch. Mention the launch date only when asked.")} className="ap3k-textarea mt-2 w-full resize-y rounded-xl px-4 py-3 text-sm" /></label></div> : null}
    </section>
  );
}

function Toggle({ enabled, locked }: { enabled: boolean; locked: boolean }) { return <span aria-hidden="true" className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-700"}`}><span className={`absolute start-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-base ${enabled ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"}`} />{locked ? <LockKeyhole className="absolute -end-1 -top-1 h-3 w-3 text-slate-500 light:text-slate-600" /> : null}</span>; }
