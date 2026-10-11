"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { UiText } from "@/components/i18n/localized-copy";

export default function ConnectionSettings({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <section className="ap3k-card rounded-2xl">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-14 w-full touch-manipulation items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="pointer-events-none flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              <Settings2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-black text-slate-950 dark:text-white"><UiText>Connection settings</UiText></span>
              <span className="block text-xs font-normal text-slate-500 dark:text-slate-400"><UiText>Manage or remove this account</UiText></span>
            </span>
          </span>
          <ChevronDown aria-hidden="true" className={`pointer-events-none h-4 w-4 shrink-0 text-slate-400 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      <div id={contentId} hidden={!open}>{children}</div>
    </section>
  );
}
