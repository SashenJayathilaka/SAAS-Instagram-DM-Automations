"use client";

import { useEffect, useState } from "react";
import { UiText } from "@/components/i18n/localized-copy";

/** Presentation only: the verified response is complete before it is revealed. */
export function SupportReply({ text, animate, onComplete }: { text: string; animate: boolean; onComplete: () => void }) {
  const [visible, setVisible] = useState(animate ? 0 : text.length);
  useEffect(() => {
    if (!animate) { setVisible(text.length); return; }
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let finished = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      setVisible(text.length);
      onComplete();
    };
    const onVisibility = () => { if (document.hidden) finish(); };
    if (preference.matches || document.hidden) { finish(); return; }
    const duration = Math.min(1800, Math.max(600, text.length * 3));
    const start = Date.now();
    timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - start) / duration);
      setVisible(Math.ceil(text.length * progress));
      if (progress === 1) finish();
    }, 35);
    preference.addEventListener("change", finish);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { finished = true; clearInterval(timer); preference.removeEventListener("change", finish); document.removeEventListener("visibilitychange", onVisibility); };
  }, [animate, text, onComplete]);
  const complete = !animate || visible >= text.length;
  return <>
    <span aria-hidden={!complete || undefined}>{complete ? text : text.slice(0, visible)}</span>
    {!complete && <button type="button" onClick={onComplete} className="mt-2 block min-h-9 text-xs font-semibold text-violet-700 underline underline-offset-4 dark:text-violet-300"><UiText>Show full answer</UiText></button>}
  </>;
}
