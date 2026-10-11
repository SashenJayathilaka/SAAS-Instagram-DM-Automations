"use client";

import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { contentTransition, revealTransition } from "@/lib/motion";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, ChevronRight, MessageCircle, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";
import { translateUi } from "@/lib/i18n/translate";
import { localizePublicPath } from "@/lib/i18n/config";
import VisibleProductVideo from "./visible-product-video";

type Demo = {
  kicker: string;
  title: string;
  body: string;
  bullets: readonly string[];
  src: string;
  poster?: string;
  label: string;
};

const icons = [MessageCircle, Users, Zap];

export default function FeatureDemos({ demos }: { demos: readonly Demo[] }) {
  const [selected, setSelected] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduceMotion = useReducedMotion();
  const { locale } = useI18n();
  const rtl = false;
  const tr = (text: string) => translateUi(text, locale);
  const demo = demos[selected];

  const select = (next: number, focus = false) => {
    const normalized = (next + demos.length) % demos.length;
    setDirection((next > selected ? 1 : -1) * (rtl ? -1 : 1));
    setSelected(normalized);
    if (focus) tabs.current[normalized]?.focus({ preventScroll: true });
  };

  const handleKeys = (event: KeyboardEvent<HTMLButtonElement>) => {
    const offsets: Record<string, number> = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 };
    if (event.key in offsets) {
      event.preventDefault();
      select(selected + offsets[event.key], true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      select(event.key === "Home" ? 0 : demos.length - 1, true);
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!touchStart.current) return;
    const dx = event.changedTouches[0].clientX - touchStart.current.x;
    const dy = event.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    // Scrolling vertically must never change the selected feature.
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      select(selected + (dx < 0 ? 1 : -1) * (rtl ? -1 : 1));
    }
  };

  const transition = contentTransition(reduceMotion);

  return (
    <section id="features" aria-label={tr("Automation demos")} className="ap3k-feature-section relative overflow-hidden bg-[#f7f7fb] px-3 py-10 dark:bg-[#080911] sm:px-8 sm:py-12 lg:px-12">
      <motion.div
        initial={reduceMotion ? false : { y: 12 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={revealTransition(reduceMotion)}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] border border-violet-400/20 bg-[linear-gradient(125deg,#40149c_0%,#6324d5_55%,#8040e6_100%)] p-4 text-white shadow-[0_24px_70px_-28px_rgba(89,33,180,0.45)] sm:rounded-[2rem] sm:p-7 lg:p-9"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -end-24 top-32 h-[420px] w-[420px] rounded-full border border-white/[0.08] bg-white/[0.025]" />
        <div aria-hidden="true" className="pointer-events-none absolute -end-10 top-48 h-72 w-72 rounded-full border border-white/[0.08]" />

        <div role="tablist" aria-label={tr("Automation demos")} className="relative mx-auto grid max-w-2xl grid-cols-3 gap-1 rounded-2xl border border-white/15 bg-[#23095c]/30 p-1.5 sm:gap-2">
          {demos.map((item, index) => {
            const Icon = icons[index % icons.length];
            return (
              <button
                key={item.src}
                ref={(node) => { tabs.current[index] = node; }}
                id={`feature-demo-tab-${index}`}
                role="tab"
                type="button"
                tabIndex={selected === index ? 0 : -1}
                aria-selected={selected === index}
                aria-controls={`feature-demo-panel-${index}`}
                onClick={() => select(index)}
                onKeyDown={handleKeys}
                className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-2 text-center text-[11px] font-bold leading-[1.3] transition-[background-color,color,box-shadow] duration-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-14 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${selected === index ? "bg-white text-[#5420b8] shadow-md" : "text-white/85 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="[overflow-wrap:anywhere]">{tr(item.kicker)}</span>
              </button>
            );
          })}
        </div>

        <div className="relative mt-7 sm:mt-9" onTouchStart={(event) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={handleTouchEnd} onTouchCancel={() => { touchStart.current = null; }}>
          {/* Reserve natural panel sizes to keep navigation steady across slides.
              Only the selected video mounts and downloads media. */}
          <div className="grid">
            {demos.map((item, index) => (
              <motion.div
                key={`${locale}-${item.src}`}
                id={`feature-demo-panel-${index}`}
                role="tabpanel"
                aria-labelledby={`feature-demo-tab-${index}`}
                aria-hidden={selected !== index}
                ref={(node) => { node?.toggleAttribute("inert", selected !== index); }}
                initial={false}
                animate={{ opacity: selected === index ? 1 : 0, x: reduceMotion || selected === index ? 0 : direction * -12 }}
                transition={transition}
                className={`ap3k-feature-panel col-start-1 row-start-1 ${selected === index ? "relative z-10" : "pointer-events-none"}`}
              >
                <div className="ap3k-feature-intro min-w-0 text-start">
                  <h2 className="text-[1.55rem] font-extrabold leading-[1.15] tracking-[-0.035em] sm:text-3xl lg:text-[2.65rem]">{tr(item.title)}</h2>
                  <p className="mt-3 text-sm leading-[1.7] text-white/80 sm:text-base">{tr(item.body)}</p>
                </div>

                <ul className="ap3k-feature-benefits min-w-0 space-y-3 self-center sm:space-y-4">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex min-w-0 items-start gap-2 text-xs font-medium leading-[1.55] text-white/95 sm:gap-3 sm:text-sm">
                      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/15 sm:h-5 sm:w-5"><Check aria-hidden="true" className="h-3 w-3" /></span>
                      <span>{tr(bullet)}</span>
                    </li>
                  ))}
                </ul>

                <div className="ap3k-feature-phone relative mx-auto self-center">
                  <div className="relative overflow-hidden rounded-[1.6rem] border border-white/30 bg-black p-1 shadow-[0_20px_40px_-12px_rgba(16,0,42,0.55)] sm:rounded-[2.1rem] sm:p-1.5 lg:rounded-[2.6rem]">
                    {selected === index ? <VisibleProductVideo src={item.src} poster={item.poster} label={item.label} className="block aspect-[240/426] w-full rounded-[1.3rem] bg-black object-contain sm:rounded-[1.7rem] lg:rounded-[2.2rem]" /> : <div className="aspect-[240/426] w-full" />}
                  </div>
                </div>

                <div className="ap3k-feature-cta flex items-center">
                  <Link href={localizePublicPath("/sign-up", locale)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-extrabold text-[#5521c8] transition duration-base motion-safe:hover:-translate-y-px hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:px-7 sm:text-sm">
                    {tr("GET STARTED")}<ArrowRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/15 pt-4 sm:mt-8">
            <div aria-hidden="true" className="flex items-center gap-3">
              <span dir="ltr" className="text-xs font-semibold tabular-nums text-white/65">{String(selected + 1).padStart(2, "0")} / {String(demos.length).padStart(2, "0")}</span>
              <div className="flex gap-1.5">{demos.map((item, index) => <span key={item.src} className={`h-1 rounded-full bg-white transition-colors duration-base ${selected === index ? "w-6" : "w-2 opacity-30"}`} />)}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => select(selected - 1)} aria-label={tr("Previous slide")} className="grid h-11 w-11 place-items-center rounded-full border border-white/25 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><ChevronLeft aria-hidden="true" className="h-5 w-5 rtl:rotate-180" /></button>
              <button type="button" onClick={() => select(selected + 1)} aria-label={tr("Next slide")} className="grid h-11 w-11 place-items-center rounded-full border border-white/25 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><ChevronRight aria-hidden="true" className="h-5 w-5 rtl:rotate-180" /></button>
            </div>
          </div>
          <span role="status" className="sr-only">{tr(demo.kicker)}</span>
        </div>
      </motion.div>
    </section>
  );
}
