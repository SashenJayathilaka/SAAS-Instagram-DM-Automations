import { Fragment, type ReactNode } from "react";
import Link from "next/link";

export function AdminShell({
  header,
  sidebar,
  children,
}: {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="ap3k-page min-w-0 overflow-x-hidden">
      {header}
      <div className="mx-auto grid w-full max-w-[1500px] gap-6 px-4 py-6 sm:px-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">{sidebar}</aside>
        <section className="min-w-0 space-y-5 overflow-hidden">{children}</section>
      </div>
    </main>
  );
}

export function AdminSectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#101827]/90">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{title}</h2>
          {description && <p className="mt-1.5 max-w-3xl text-sm font-semibold text-slate-700 dark:text-slate-200">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="min-w-0 p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function AdminDataTable({
  headers,
  rows,
  details,
  empty,
  maxHeight = "max-h-[680px]",
}: {
  headers: string[];
  rows: ReactNode[][];
  details?: (index: number) => ReactNode;
  empty: string;
  maxHeight?: string;
}) {
  if (rows.length === 0) return <AdminEmptyState message={empty} />;
  return (
    <div className={`min-w-0 overflow-auto rounded-xl border border-slate-200 dark:border-white/10 ${maxHeight}`}>
      <table className="w-full min-w-[760px] table-fixed text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
            {headers.map((header) => (
              <th key={header} className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <Fragment key={`rowgroup-${index}`}>
              <tr
                key={`row-${index}`}
                className="border-b border-slate-100 align-top transition-colors hover:bg-slate-50/60 dark:border-white/10 dark:hover:bg-white/[0.02]"
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="min-w-0 overflow-hidden px-3 py-3 text-slate-700 dark:text-slate-300">
                    {cell}
                  </td>
                ))}
              </tr>
              {details && (
                <tr key={`details-${index}`} className="border-b border-slate-100 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.03]">
                  <td colSpan={headers.length}>{details(index)}</td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminFilterPills({ items }: { items: Array<[string, string, boolean?]> }) {
  return (
    <div className="mb-4 flex max-w-full flex-wrap gap-2">
      {items.map(([label, href, active]) => (
        <Link
          key={label}
          href={href}
          className={[
            "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
            active
              ? "border-rf-pink/30 bg-ap3k-gradient-soft text-rf-magenta dark:border-rf-pink/40 dark:text-rf-pink"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-rf-pink/20 hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]",
          ].join(" ")}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function AdminEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
      {message}
    </div>
  );
}
