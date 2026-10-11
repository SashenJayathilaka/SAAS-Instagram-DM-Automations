"use client";

import { useI18n } from "@/providers/i18n-provider";
import { translatePublicShell as translateUi } from "@/lib/i18n/public-shell";
import { cn } from "@/lib/utils";
import { nextThemeMode } from "@/lib/theme-mode";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

type Props = {
  compact?: boolean;
  className?: string;
};

export default function ThemeToggle({ compact = false, className }: Props) {
  const { locale } = useI18n();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !theme || theme === "light" || theme === "dark") return;
    setTheme(resolvedTheme === "dark" ? "dark" : "light");
  }, [mounted, resolvedTheme, setTheme, theme]);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "h-11 rounded-full border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.05]",
          compact ? "w-10" : "w-full sm:w-[190px]",
          className
        )}
      />
    );
  }

  const activeTheme =
    theme === "light" || theme === "dark"
      ? theme
      : resolvedTheme === "dark"
        ? "dark"
        : "light";

  if (compact) {
    const active = THEMES.find((item) => item.value === activeTheme) ?? THEMES[0];
    const Icon = active.icon;
    return (
      <button
        type="button"
        aria-label={translateUi("Theme: {theme}. Switch theme.", locale).replace("{theme}", translateUi(active.label, locale))}
        onClick={() => setTheme(nextThemeMode(activeTheme))}
        className={cn(
          "grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/85 text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:border-violet-400/40 dark:hover:text-white",
          className
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "grid w-full grid-cols-2 rounded-full border border-slate-200 bg-slate-100/80 p-1 shadow-inner dark:border-white/10 dark:bg-white/[0.05] sm:w-[190px]",
        className
      )}
      aria-label={translateUi("Theme selector", locale)}
    >
      {THEMES.map((item) => {
        const Icon = item.icon;
        const active = activeTheme === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(item.value)}
            className={cn(
              "inline-flex min-w-0 items-center justify-center gap-2 min-h-11 rounded-full px-3 py-2 text-sm font-bold transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 motion-reduce:transition-none",
              active
                ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200 dark:bg-violet-500/15 dark:text-white dark:ring-violet-400/25"
                : "text-slate-500 light:text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{translateUi(item.label, locale)}</span>
          </button>
        );
      })}
    </div>
  );
}
