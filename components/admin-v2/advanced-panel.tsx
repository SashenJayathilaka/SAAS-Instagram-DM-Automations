"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdvancedPanel({
  children,
  label = "Advanced",
  compact = false,
}: {
  children: React.ReactNode;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-white/[0.065] bg-slate-50 dark:bg-white/[0.02]",
        compact ? "mt-0" : "mt-3"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2 font-black text-muted-foreground transition hover:text-slate-800 dark:hover:text-slate-200",
          compact
            ? "px-2.5 py-1.5 text-[10px] normal-case tracking-normal"
            : "px-4 py-2.5 text-xs uppercase tracking-wide"
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("shrink-0 transition-transform", compact ? "h-3 w-3" : "h-3.5 w-3.5", open && "rotate-180")} />
      </button>
      {open && (
        <div className={cn("border-t border-slate-200 dark:border-white/[0.06]", compact ? "px-3 py-2.5" : "px-4 py-3")}>{children}</div>
      )}
    </div>
  );
}
