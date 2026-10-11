"use client";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, MessageCircle, Send, RotateCcw, Sparkles } from "lucide-react";
import { UiText } from "@/components/i18n/localized-copy";
import { contentTransition } from "@/lib/motion";

export default function ConversationPreview() {
  const [step, setStep] = useState(0);
  const reduced = useReducedMotion();
  return <div className="relative mx-auto w-full max-w-lg text-start">
    <div className="pointer-events-none absolute -inset-5 rounded-[3rem] bg-violet-400/10 blur-3xl" aria-hidden="true" />
    <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_80px_-32px_rgba(76,29,149,0.3)] dark:border-white/10 dark:bg-[#111320]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white"><Sparkles className="h-5 w-5" /></span><div><p className="text-sm font-bold">AP3K</p><p className="text-xs text-slate-500 dark:text-slate-400"><UiText>Interactive preview</UiText></p></div></div><MessageCircle className="h-5 w-5 text-violet-500" /></div>
      <div className="px-5 pt-5 sm:px-7"><div className="flex gap-2">{["Comment", "Reply", "DM"].map((label, index) => <button type="button" key={label} aria-pressed={step === index} onClick={() => setStep(index)} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-xs font-bold transition-colors ${step === index ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-violet-50 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"}`}><span className="opacity-65">0{index + 1}</span><UiText>{label}</UiText></button>)}</div>
        <div className="mt-5 min-h-[275px] rounded-2xl bg-slate-50 p-4 dark:bg-[#090b14] sm:p-5"><div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><MessageCircle className="h-4 w-4" /><UiText>When someone comments</UiText></div><div className="mt-3 max-w-[85%] rounded-2xl rounded-ss-sm border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5"><UiText>Send me the guide!</UiText></div>
          <motion.div key={step} initial={reduced ? false : {opacity:0,y:8}} animate={{opacity:1,y:0}} transition={contentTransition(reduced)} className="mt-5" aria-live="polite" aria-atomic="true">
            {step === 0 ? <div className="mt-7 rounded-xl border border-dashed border-violet-200 p-4 text-sm leading-6 text-slate-600 dark:border-violet-400/25 dark:text-slate-300"><UiText>A comment starts the conversation. AP3K takes it from here.</UiText></div> : step === 1 ? <div className="ms-auto max-w-[90%] rounded-2xl rounded-se-sm bg-violet-600 px-4 py-3 text-sm leading-6 text-white"><UiText>Thanks! Check your DMs.</UiText></div> : <div className="ms-auto max-w-[90%] rounded-2xl rounded-se-sm border border-violet-200 bg-white p-4 text-sm dark:border-violet-400/20 dark:bg-[#19172b]"><p className="font-bold"><UiText>Here’s the guide you asked for.</UiText></p><div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-violet-50 px-3 py-2 font-semibold text-violet-700 dark:bg-violet-400/15 dark:text-violet-200"><UiText>Get the Link</UiText><ArrowRight className="h-3 w-3" /></div></div>}
          </motion.div>
        </div>
      </div><div className="px-5 pb-5 pt-4 sm:px-7"><button type="button" onClick={() => setStep((step + 1) % 3)} className="ap3k-gradient-button w-full py-3 text-sm">{step === 2 ? <RotateCcw className="h-4 w-4" /> : <Send className="h-4 w-4" />}<UiText>{step === 2 ? "Try again" : step === 0 ? "See the reply" : "See the DM"}</UiText></button><p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400"><UiText>Demo only. No Instagram messages are sent.</UiText></p></div>
    </div>
  </div>;
}
