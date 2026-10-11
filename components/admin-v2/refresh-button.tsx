"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
export function AdminRefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button onClick={() => startTransition(() => router.refresh())} disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 text-sm font-semibold text-slate-800 dark:text-slate-200 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />{pending ? "Refreshing…" : "Refresh"}</button>;
}
