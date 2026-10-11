"use client";

import { useState, useTransition } from "react";
import { Pause, Play, X } from "lucide-react";
import {
  adminPauseCampaignAction,
  adminResumeCampaignAction,
} from "@/actions/admin/campaign-actions";

type Props = {
  campaignId: string;
  campaignName: string;
  active: boolean;
  needsReview: boolean;
  archivedAt: Date | null;
};

export function CampaignActionsCell({
  campaignId,
  campaignName,
  active,
  needsReview,
  archivedAt,
}: Props) {
  const [modal, setModal] = useState<"pause" | "resume" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function closeModal() {
    if (isPending) return;
    setModal(null);
    setReason("");
    setError(null);
  }

  function openModal(type: "pause" | "resume") {
    setReason("");
    setError(null);
    setModal(type);
  }

  function handleSubmit() {
    if (!modal) return;
    if (reason.trim().length < 5) {
      setError("Reason must be at least 5 characters.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("campaignId", campaignId);
      formData.set("reason", reason);
      const result = modal === "pause"
        ? await adminPauseCampaignAction(formData)
        : await adminResumeCampaignAction(formData);

      if (result.status === 200) closeModal();
      else setError(typeof result.data === "string" ? result.data : "An unexpected error occurred.");
    });
  }

  if (archivedAt !== null) return <span className="text-[11px] text-muted-foreground">Archived</span>;

  if (needsReview) {
    return (
      <span className="inline-flex max-w-[180px] rounded-lg border border-amber-500/15 bg-amber-500/[0.05] px-2.5 py-1.5 text-[10px] font-bold leading-4 text-amber-800 dark:text-amber-200">
        Review required
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => openModal(active ? "pause" : "resume")}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${
          active
            ? "border-amber-500/18 bg-amber-500/[0.06] text-amber-800 dark:text-amber-300 hover:bg-amber-500/[0.11]"
            : "border-emerald-500/18 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/[0.11]"
        }`}
      >
        {active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {active ? "Pause" : "Resume"}
      </button>

      {modal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/72 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0b101a] shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/[0.07] px-5 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${modal === "pause" ? "text-amber-800 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  Automation control
                </p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
                  {modal === "pause" ? "Pause automation" : "Resume automation"}
                </h2>
                <p className="mt-1 truncate text-xs text-muted-foreground">{campaignName}</p>
              </div>
              <button type="button" onClick={closeModal} disabled={isPending} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.035] text-muted-foreground hover:text-slate-950 dark:hover:text-white disabled:opacity-40">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <p className={`rounded-xl border px-3.5 py-3 text-xs leading-5 ${modal === "pause" ? "border-amber-500/18 bg-amber-500/[0.06] text-amber-800 dark:text-amber-200" : "border-emerald-500/18 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-200"}`}>
                {modal === "pause"
                  ? "The automation will stop processing new events. Review state and historical activity are preserved."
                  : "The automation will become active again. This is allowed only when the automation does not require review."}
              </p>

              <label className="mt-4 block">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Audit reason</span>
                <textarea
                  autoFocus
                  rows={3}
                  placeholder="Explain why this state change is necessary"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isPending}
                  className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-3.5 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-600 focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10 disabled:opacity-50"
                />
              </label>

              {error && <p role="alert" className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-3 text-xs text-red-700 dark:text-red-200">{error}</p>}

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeModal} disabled={isPending} className="rounded-xl border border-slate-200 dark:border-white/[0.09] px-4 py-2.5 text-sm font-bold text-muted-foreground dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-950 dark:hover:text-white disabled:opacity-50">Cancel</button>
                <button type="button" onClick={handleSubmit} disabled={isPending} className={`rounded-xl px-5 py-2.5 text-sm font-black text-white transition disabled:opacity-50 ${modal === "pause" ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
                  {isPending ? "Working…" : modal === "pause" ? "Pause automation" : "Resume automation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
