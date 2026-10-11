import { cn } from "@/lib/utils";

const TONES = {
  slate: {
    shell: "border-slate-200 dark:border-white/[0.075] from-white dark:from-white/[0.048] to-white dark:to-white/[0.018]",
    accent: "bg-slate-300/70",
    icon: "border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.045] text-slate-800 dark:text-slate-300",
  },
  green: {
    shell: "border-emerald-500/15 from-emerald-500/[0.08] to-white dark:to-white/[0.018]",
    accent: "bg-emerald-400/80",
    icon: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    shell: "border-amber-500/15 from-amber-500/[0.08] to-white dark:to-white/[0.018]",
    accent: "bg-amber-400/85",
    icon: "border-amber-500/20 bg-amber-500/[0.08] text-amber-800 dark:text-amber-300",
  },
  red: {
    shell: "border-red-500/15 from-red-500/[0.08] to-white dark:to-white/[0.018]",
    accent: "bg-red-400/85",
    icon: "border-red-500/20 bg-red-500/[0.08] text-red-700 dark:text-red-300",
  },
  pink: {
    shell: "border-pink-500/15 from-pink-500/[0.09] to-white dark:to-white/[0.018]",
    accent: "bg-pink-400/85",
    icon: "border-pink-500/20 bg-pink-500/[0.08] text-pink-700 dark:text-pink-300",
  },
  blue: {
    shell: "border-sky-500/15 from-sky-500/[0.08] to-white dark:to-white/[0.018]",
    accent: "bg-sky-400/85",
    icon: "border-sky-500/20 bg-sky-500/[0.08] text-sky-700 dark:text-sky-300",
  },
} as const;

export function StatCard({
  label,
  value,
  sub,
  tone = "slate",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: keyof typeof TONES;
  icon?: React.ReactNode;
  className?: string;
}) {
  const styles = TONES[tone];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-surface sm:p-5",
        styles.shell,
        className
      )}
    >
      <span className={cn("absolute inset-x-5 top-0 h-px opacity-70", styles.accent)} />
      <div className="flex items-start justify-between gap-3">
        <p className="pt-0.5 text-[9px] font-black uppercase tracking-[0.17em] text-muted-foreground sm:text-[10px]">
          {label}
        </p>
        {icon && (
          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl border", styles.icon)}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-[1.75rem] font-black leading-none tracking-[-0.035em] text-slate-950 dark:text-white sm:text-[2rem]">
        {value}
      </p>
      {sub && <p className="mt-2 text-[11px] font-medium leading-5 text-muted-foreground">{sub}</p>}
    </div>
  );
}
