"use client";

import { type FormEvent, useState, useTransition } from "react";
import { MessageSquareText, Save, X } from "lucide-react";
import { adminUpdateCampaignRepliesAction } from "@/actions/admin/campaign-replies";

type Props = {
  campaignId: string;
  campaignName: string;
  initialReplies: {
    commentReply: string | null;
    commentReply2: string | null;
    commentReply3: string | null;
  };
  onSuccess?: () => void;
};

export function ReplyEditModal({ campaignId, campaignName, initialReplies, onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [replies, setReplies] = useState({
    commentReply: initialReplies.commentReply ?? "",
    commentReply2: initialReplies.commentReply2 ?? "",
    commentReply3: initialReplies.commentReply3 ?? "",
  });
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetReplies() {
    setReplies({
      commentReply: initialReplies.commentReply ?? "",
      commentReply2: initialReplies.commentReply2 ?? "",
      commentReply3: initialReplies.commentReply3 ?? "",
    });
  }

  function closeModal() {
    if (isPending) return;
    setIsOpen(false);
    setReason("");
    setError(null);
    resetReplies();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!replies.commentReply.trim() && !replies.commentReply2.trim() && !replies.commentReply3.trim()) {
      setError("At least one reply variant must be provided.");
      return;
    }

    if (replies.commentReply.length > 500 || replies.commentReply2.length > 500 || replies.commentReply3.length > 500) {
      setError("Reply variants cannot exceed 500 characters.");
      return;
    }

    if (reason.trim().length < 5) {
      setError("Reason must be at least 5 characters.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("campaignId", campaignId);
      formData.set("reason", reason);
      formData.set("reply1", replies.commentReply);
      formData.set("reply2", replies.commentReply2);
      formData.set("reply3", replies.commentReply3);

      const result = await adminUpdateCampaignRepliesAction(formData);
      if (result.status === 200) {
        onSuccess?.();
        setIsOpen(false);
        setReason("");
        setError(null);
      } else {
        setError(typeof result.data === "string" ? result.data : "An unexpected error occurred.");
      }
    });
  }

  const variants = [
    { label: "Variant 1", key: "commentReply", optional: false },
    { label: "Variant 2", key: "commentReply2", optional: true },
    { label: "Variant 3", key: "commentReply3", optional: true },
  ] as const;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/18 bg-sky-500/[0.06] px-2.5 py-1.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 transition hover:bg-sky-500/[0.11] hover:text-sky-700 dark:hover:text-sky-200"
      >
        <MessageSquareText className="h-3.5 w-3.5" />
        Edit replies
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit replies for ${campaignName}`}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/72 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="flex max-h-[96dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0b101a] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/[0.07] px-5 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-700 dark:text-pink-400">Reply editor</p>
                <h2 className="mt-1 truncate text-lg font-black tracking-tight text-slate-950 dark:text-white sm:text-xl">{campaignName}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Update public comment reply variants. Every saved change is audited.</p>
              </div>
              <button
                type="button"
                aria-label="Close reply editor"
                onClick={closeModal}
                disabled={isPending}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.035] text-muted-foreground transition hover:text-slate-950 dark:hover:text-white disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                <div className="space-y-4">
                  {variants.map(({ label, key, optional }) => {
                    const value = replies[key];
                    return (
                      <label key={key} className="block">
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                            {label}{optional ? " · optional" : ""}
                          </span>
                          <span className={`text-[10px] tabular-nums ${value.length > 450 ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground"}`}>
                            {value.length}/500
                          </span>
                        </div>
                        <textarea
                          rows={4}
                          dir="auto"
                          placeholder={`${label} text…`}
                          value={value}
                          onChange={(event) => {
                            setReplies((previous) => ({ ...previous, [key]: event.target.value }));
                            if (error) setError(null);
                          }}
                          disabled={isPending}
                          className="w-full resize-y rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-3.5 py-3 text-sm leading-6 text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-600 focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10 disabled:opacity-50"
                        />
                      </label>
                    );
                  })}
                </div>

                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Live preview</p>
                  <div className="space-y-3 lg:sticky lg:top-0">
                    {variants.map(({ label, key }) => {
                      const value = replies[key];
                      return (
                        <div key={key} className="min-h-[92px] rounded-2xl border border-slate-200 dark:border-white/[0.065] bg-slate-50 dark:bg-white/[0.025] p-4">
                          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-muted-foreground">{label}</p>
                          {value ? (
                            <p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 dark:text-slate-300">{value}</p>
                          ) : (
                            <p className="mt-2 text-xs italic text-muted-foreground">No text provided.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#090e17] p-4 sm:p-6">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Audit reason</span>
                  <textarea
                    rows={2}
                    required
                    placeholder="Why are you updating these replies?"
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      if (error) setError(null);
                    }}
                    disabled={isPending}
                    className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-3.5 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-600 focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10 disabled:opacity-50"
                  />
                </label>

                {error && (
                  <p role="alert" className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-3 text-xs text-red-700 dark:text-red-200">{error}</p>
                )}

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isPending}
                    className="rounded-xl border border-slate-200 dark:border-white/[0.09] px-4 py-2.5 text-sm font-bold text-muted-foreground dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-950 dark:hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_30px_rgba(236,72,153,0.16)] transition hover:brightness-110 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isPending ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
