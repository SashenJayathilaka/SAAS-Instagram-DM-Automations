"use client";

import { type FormEvent, useState, useTransition } from "react";
import {
  Link2Off,
  MoreHorizontal,
  PauseCircle,
  RefreshCcw,
  RotateCcw,
  X,
} from "lucide-react";
import {
  adminRefreshProfileSnapshotAction,
  adminMarkReconnectRequiredAction,
  adminSoftDisconnectAction,
  adminPauseCampaignsForAccountAction,
} from "@/actions/admin/account-actions";

type Props = {
  integrationId: string;
  instagramUsername: string | null;
  status: string;
  reconnectRequired: boolean;
};

type ModalKey = "refresh" | "reconnect" | "disconnect" | "pause";

const ACTION_LABELS: Record<ModalKey, string> = {
  refresh: "Refresh profile snapshot",
  reconnect: "Mark reconnect required",
  disconnect: "Soft disconnect account",
  pause: "Pause all automations",
};

const ACTION_DESCRIPTIONS: Record<ModalKey, string> = {
  refresh: "Fetch a fresh profile snapshot without changing connection state.",
  reconnect: "Flag the account so the owner is prompted to reconnect it.",
  disconnect: "Disconnect AP3K without deleting the integration record.",
  pause: "Pause every active automation currently using this account.",
};

const ACTION_FNS: Record<ModalKey, (fd: FormData) => Promise<{ status: number; data: string }>> = {
  refresh: adminRefreshProfileSnapshotAction,
  reconnect: adminMarkReconnectRequiredAction,
  disconnect: adminSoftDisconnectAction,
  pause: adminPauseCampaignsForAccountAction,
};

export function AccountActionsCell({ integrationId, instagramUsername, status, reconnectRequired }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDisconnected = status === "DISCONNECTED";
  const label = instagramUsername ? `@${instagramUsername}` : integrationId.slice(0, 8);

  function resetForm() {
    setReason("");
    setConfirmation("");
    setError(null);
    setSuccessMsg(null);
  }

  function openPicker() {
    resetForm();
    setActiveModal(null);
    setPickerOpen(true);
  }

  function closeAll() {
    if (isPending) return;
    setPickerOpen(false);
    setActiveModal(null);
    resetForm();
  }

  function selectAction(action: ModalKey) {
    resetForm();
    setActiveModal(action);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeModal) return;
    if (reason.trim().length < 5) {
      setError("Reason must be at least 5 characters.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("integrationId", integrationId);
      fd.set("reason", reason);
      if (activeModal === "disconnect" || activeModal === "pause") fd.set("confirmation", confirmation);

      const result = await ACTION_FNS[activeModal](fd);
      if (result.status === 200) {
        setSuccessMsg(String(result.data));
      } else {
        setError(String(result.data));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-950 dark:hover:text-white"
      >
        Manage
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {pickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeAll();
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0b101a] shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/[0.07] px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-700 dark:text-pink-400">Account control</p>
                <h2 className="mt-1 truncate text-lg font-black tracking-tight text-slate-950 dark:text-white">
                  {activeModal ? ACTION_LABELS[activeModal] : `Manage ${label}`}
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {activeModal ? ACTION_DESCRIPTIONS[activeModal] : "Choose a contextual, audited action for this Instagram account."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close account actions"
                onClick={closeAll}
                disabled={isPending}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.035] text-muted-foreground transition hover:text-slate-950 dark:hover:text-white disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!activeModal ? (
              <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
                <ActionChoice
                  icon={<RefreshCcw className="h-4 w-4" />}
                  title="Refresh snapshot"
                  description="Pull fresh profile metadata."
                  onClick={() => selectAction("refresh")}
                />
                <ActionChoice
                  icon={<RotateCcw className="h-4 w-4" />}
                  title="Require reconnect"
                  description="Prompt the owner to reconnect."
                  disabled={reconnectRequired}
                  onClick={() => selectAction("reconnect")}
                />
                <ActionChoice
                  icon={<Link2Off className="h-4 w-4" />}
                  title="Soft disconnect"
                  description="Disconnect without hard deletion."
                  tone="amber"
                  disabled={isDisconnected}
                  onClick={() => selectAction("disconnect")}
                />
                <ActionChoice
                  icon={<PauseCircle className="h-4 w-4" />}
                  title="Pause automations"
                  description="Stop every automation for this account."
                  tone="amber"
                  onClick={() => selectAction("pause")}
                />
              </div>
            ) : successMsg ? (
              <div className="p-5 sm:p-6">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
                  {successMsg}
                </div>
                <button
                  type="button"
                  onClick={closeAll}
                  className="mt-4 w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-950 dark:hover:text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
                {activeModal === "disconnect" && (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3.5 py-3 text-xs leading-5 text-amber-800 dark:text-amber-200/90">
                    Disconnecting does not automatically pause automations. If they should stop immediately, use the pause-automations action as well.
                  </p>
                )}

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    Reason <span className="text-pink-700 dark:text-pink-400">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Explain why this admin action is necessary"
                    className="w-full resize-y rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-3.5 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-600 focus:border-pink-400/50 focus:outline-none focus:ring-2 focus:ring-pink-500/10"
                  />
                </div>

                {(activeModal === "disconnect" || activeModal === "pause") && (
                  <div>
                    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
                      {activeModal === "disconnect" ? "Type DISCONNECT to confirm" : "Type PAUSE to confirm"}
                    </label>
                    <input
                      type="text"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      placeholder={activeModal === "disconnect" ? "DISCONNECT" : "PAUSE"}
                      className="w-full rounded-xl border border-amber-500/20 bg-slate-50 dark:bg-white/[0.035] px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-600 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10"
                    />
                  </div>
                )}

                {error && (
                  <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-3 text-xs text-red-700 dark:text-red-200">
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveModal(null);
                    }}
                    disabled={isPending}
                    className="rounded-xl border border-slate-200 dark:border-white/[0.09] px-4 py-2.5 text-sm font-bold text-muted-foreground dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-950 dark:hover:text-white disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_30px_rgba(236,72,153,0.16)] transition hover:brightness-110 disabled:opacity-50"
                  >
                    {isPending ? "Processing…" : "Confirm action"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ActionChoice({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  tone = "slate",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "slate" | "amber";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
        tone === "amber"
          ? "border-amber-500/15 bg-amber-500/[0.035] hover:border-amber-500/30 hover:bg-amber-500/[0.07]"
          : "border-slate-200 dark:border-white/[0.075] bg-slate-50 dark:bg-white/[0.025] hover:border-pink-500/20 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
      }`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-xl border ${tone === "amber" ? "border-amber-500/20 bg-amber-500/[0.08] text-amber-800 dark:text-amber-300" : "border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] text-slate-800 dark:text-slate-300 group-hover:text-pink-700 dark:group-hover:text-pink-300"}`}>
        {icon}
      </span>
      <span className="mt-3 block text-sm font-black text-slate-950 dark:text-white">{title}</span>
      <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{description}</span>
    </button>
  );
}
