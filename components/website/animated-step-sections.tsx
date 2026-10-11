"use client";

import { useEffect, useRef, useState } from "react";
import { revealTransition } from "@/lib/motion";
import { motion, useReducedMotion } from "framer-motion";
import { CircleCheckBig, Instagram, MessageCircle, MessagesSquare, Reply, Send, Target, Users } from "lucide-react";
import { translateUi } from "@/lib/i18n/translate";
import { useI18n } from "@/providers/i18n-provider";

const WORKFLOW_STEPS = [
  { step: "01", icon: MessageCircle, title: "Choose the trigger", copy: "Use a specific keyword like GUIDE, or respond to any eligible comment on the post." },
  { step: "02", icon: Reply, title: "Reply publicly", copy: "AP3K posts one of your saved replies so the commenter knows to check their DMs." },
  { step: "03", icon: Send, title: "Send the DM", copy: "Deliver your message and optional link button automatically while interest is fresh." },
  { step: "04", icon: Users, title: "See what happened", copy: "Keep replies, DMs, automation activity, and captured leads together in AP3K." },
] as const;

const SETUP_STEPS = [
  { number: "01", icon: Instagram, title: "Connect Instagram", copy: "Authorize your professional Instagram account." },
  { number: "02", icon: Target, title: "Choose a post + trigger", copy: "Use a keyword or any eligible comment." },
  { number: "03", icon: MessagesSquare, title: "Choose Actions", copy: "Reply to comment, Send a DM, or enable both." },
  { number: "04", icon: CircleCheckBig, title: "Activate", copy: "AP3K starts listening and records the activity." },
] as const;

const SETUP_STEP_DIVIDERS = [
  "border-b border-violet-200/70 dark:border-white/[0.08] sm:border-r lg:border-b-0",
  "border-b border-violet-200/70 dark:border-white/[0.08] lg:border-b-0 lg:border-r",
  "border-b border-violet-200/70 dark:border-white/[0.08] sm:border-b-0 sm:border-r lg:border-r",
  "",
] as const;

function useActiveStep(length: number) {
  const root = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const node = root.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.2),
      { threshold: [0, 0.2] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || paused || reduceMotion || active >= length - 1) return;
    const timer = window.setTimeout(() => setActive((current) => Math.min(current + 1, length - 1)), 1800);
    return () => window.clearTimeout(timer);
  }, [active, length, paused, reduceMotion, visible]);

  return { root, active, setActive, setPaused, reduceMotion };
}

export function AnimatedWorkflowCards() {
  const { locale } = useI18n();
  const tr = (text: string) => translateUi(text, locale);
  const { root, active, setActive, setPaused, reduceMotion } = useActiveStep(WORKFLOW_STEPS.length);

  return (
    <div
      ref={root}
      className="relative mt-12"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div aria-hidden="true" className="pointer-events-none absolute left-[8%] right-[8%] top-6 hidden h-px overflow-hidden bg-violet-200 dark:bg-violet-400/15 lg:block">
        <span
          className="block h-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-500 origin-left transition-transform duration-content ease-ui-out rtl:origin-right"
          style={{ transform: `scaleX(${(active + 1) / WORKFLOW_STEPS.length})` }}
        />
      </div>
      <div className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4">
        {WORKFLOW_STEPS.map(({ step, icon: Icon, title, copy }, index) => {
          const isActive = active === index;
          return (
            <motion.button
              key={title}
              type="button"
              aria-current={isActive ? "step" : undefined}
              onClick={() => setActive(index)}
              onPointerEnter={() => setActive(index)}
              initial={reduceMotion ? false : { y: 12 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={revealTransition(reduceMotion, index * 0.055)}
              className={`group relative h-full overflow-hidden rounded-2xl border bg-white/90 p-6 text-start shadow-surface transition-[border-color,box-shadow] duration-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500 dark:bg-[#111320] dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.035))] ${isActive ? "border-violet-400 ring-1 ring-violet-400/20 dark:border-violet-300/45" : "border-slate-200/90 hover:border-violet-300 dark:border-violet-300/[0.14] dark:hover:border-violet-300/30"}`}
            >
              <span aria-hidden="true" className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent transition-opacity duration-base dark:via-violet-300 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
              <span className="flex items-center justify-between gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700 ring-1 ring-violet-200/80 dark:bg-violet-400/[0.12] dark:text-violet-200 dark:ring-violet-300/20">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.18em] transition-colors duration-base ${isActive ? "border-violet-600 bg-violet-600 text-white" : "border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-300/15 dark:bg-violet-300/[0.07] dark:text-violet-200"}`}>
                  {step}
                </span>
              </span>
              <span className="mt-5 block text-lg font-black text-slate-950 dark:text-white">{tr(title)}</span>
              <span className="mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-300/80">{tr(copy)}</span>
            </motion.button>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-5 flex justify-center gap-2 lg:hidden">
        {WORKFLOW_STEPS.map(({ step }, index) => <span key={step} className={`h-1.5 rounded-full transition-colors duration-base ${active === index ? "w-7 bg-violet-600" : "w-1.5 bg-violet-200 dark:bg-violet-400/25"}`} />)}
      </div>
    </div>
  );
}

export function AnimatedSetupSteps() {
  const { locale } = useI18n();
  const tr = (text: string) => translateUi(text, locale);
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative mt-10 sm:mt-12">
      <div aria-hidden="true" className="absolute -inset-5 rounded-[2.5rem] bg-violet-400/[0.08] blur-2xl dark:bg-violet-500/[0.06]" />
      <ol className="relative grid overflow-hidden rounded-[2rem] border border-violet-200/80 bg-white shadow-[0_22px_70px_rgba(76,29,149,0.1)] dark:border-white/[0.1] dark:bg-[#111320] dark:shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:grid-cols-2 lg:grid-cols-4">
        {SETUP_STEPS.map(({ number, icon: Icon, title, copy }, index) => (
          <motion.li
            key={number}
            initial={reduceMotion ? false : { y: 14 }}
            whileInView={reduceMotion ? undefined : { y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={revealTransition(reduceMotion, index * 0.065)}
            className={`group relative min-h-[190px] overflow-hidden p-5 transition-colors duration-base hover:bg-violet-50/55 dark:hover:bg-white/[0.025] sm:min-h-[228px] sm:p-6 lg:min-h-[252px] lg:p-7 ${SETUP_STEP_DIVIDERS[index]}`}
          >
            <span aria-hidden="true" className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-violet-400/[0.09] blur-2xl transition-opacity duration-base group-hover:opacity-100 dark:bg-violet-400/[0.07]" />
            <span className="flex items-center justify-between gap-4">
              <span className="relative z-10 inline-flex h-10 items-center rounded-full bg-violet-600 px-3.5 text-xs font-black tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(124,58,237,0.24)] dark:bg-violet-500">
                {number}
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-200/80 bg-violet-50 text-violet-700 transition-colors duration-base group-hover:border-violet-300 group-hover:bg-violet-100 dark:border-white/10 dark:bg-white/[0.055] dark:text-violet-200 dark:group-hover:bg-white/[0.08]">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
            </span>
            <h3 className="relative mt-7 text-xl font-black tracking-[-0.025em] text-slate-950 dark:text-white">{tr(title)}</h3>
            <p className="relative mt-2 max-w-[17rem] text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-[0.95rem]">{tr(copy)}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
