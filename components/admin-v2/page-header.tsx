import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  count,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  count?: number;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex min-w-0 flex-col gap-4 border-b border-slate-200 dark:border-white/[0.06] pb-5 sm:pb-6 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
            {eyebrow}
          </p>
          {typeof count === "number" && (
            <span className="rounded-full border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground dark:text-slate-400">
              {count.toLocaleString()}
            </span>
          )}
        </div>
        <h1 className="mt-2 break-words [overflow-wrap:anywhere] text-[1.65rem] font-semibold leading-tight tracking-[-0.035em] text-slate-950 dark:text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <div className="mt-2 max-w-3xl text-[13px] leading-6 text-muted-foreground dark:text-slate-400 sm:text-sm">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function AdminSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex min-w-0 flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-slate-800 dark:text-slate-300 sm:text-[13px]">
          {title}
        </h2>
        {description && (
          <div className="mt-1 text-[11px] leading-5 text-muted-foreground sm:text-xs">{description}</div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function AdminSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#10141e]",
        className
      )}
    >
      {children}
    </div>
  );
}
