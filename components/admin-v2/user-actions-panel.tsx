"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Ban, RefreshCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import {
  adminSuspendUserAction,
  adminReactivateUserAction,
  adminChangeUserPlanAction,
  adminResetUserUsageAction,
} from "@/actions/admin/user-actions";

type Props = { userId: string; email: string; status: string; plan?: string; hasActiveOverrides?: boolean };
type ModalKey = "suspend" | "reactivate" | "change_plan" | "reset_usage";
type AdminPlan = "FREE" | "PRO" | "BUSINESS";

const TITLES: Record<ModalKey, string> = {
  suspend: "Suspend user",
  reactivate: "Reactivate user",
  change_plan: "Change user plan",
  reset_usage: "Reset monthly usage",
};

export function UserActionsPanel({ userId, email, status, plan, hasActiveOverrides }: Props) {
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<AdminPlan>("FREE");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSuspended = status === "SUSPENDED";

  function openModal(modal: ModalKey) {
    setActiveModal(modal);
    setReason("");
    setConfirmation("");
    if (modal === "change_plan") setSelectedPlan(plan === "BUSINESS" ? "BUSINESS" : plan === "PRO" ? "PRO" : "FREE");
    setError(null);
    setSuccessMsg(null);
  }

  function closeModal() {
    if (isPending) return;
    setActiveModal(null);
    setReason("");
    setConfirmation("");
    setError(null);
    setSuccessMsg(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeModal) return;
    if (reason.trim().length < 5) { setError("Reason must be at least 5 characters."); return; }
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", userId);
      formData.set("reason", reason);
      if (activeModal === "suspend" || activeModal === "reset_usage" || activeModal === "change_plan") formData.set("confirmation", confirmation);
      if (activeModal === "change_plan") formData.set("plan", selectedPlan);
      const action = activeModal === "suspend" ? adminSuspendUserAction : activeModal === "reactivate" ? adminReactivateUserAction : activeModal === "change_plan" ? adminChangeUserPlanAction : adminResetUserUsageAction;
      const result = await action(formData);
      if (result.status === 200) setSuccessMsg(String(result.data)); else setError(String(result.data));
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/[0.075] bg-white dark:bg-[#0c111d]/[0.88] p-5 shadow-surface sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Admin actions</p><h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">Account controls</h2><p className="mt-1 text-[11px] leading-5 text-muted-foreground">All mutations require a reason and are written to the audit log.</p></div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300 sm:self-auto"><ShieldCheck className="h-3 w-3" /> Audited</span>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {!isSuspended ? <ActionButton icon={<Ban className="h-4 w-4" />} title="Suspend user" detail="Pauses active automations" tone="red" onClick={() => openModal("suspend")} /> : <ActionButton icon={<ShieldCheck className="h-4 w-4" />} title="Reactivate user" detail="Restore account access" tone="green" onClick={() => openModal("reactivate")} />}
        <ActionButton icon={<Sparkles className="h-4 w-4" />} title="Change plan" detail="Internal access only" tone="pink" onClick={() => openModal("change_plan")} />
        <ActionButton icon={<RefreshCcw className="h-4 w-4" />} title="Reset usage" detail="Irreversible counter reset" tone="amber" onClick={() => openModal("reset_usage")} />
      </div>

      {activeModal && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[90] flex items-end justify-center bg-black/72 backdrop-blur-sm sm:items-center sm:p-4" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <div className="w-full max-w-lg overflow-hidden rounded-t-3xl border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0b101a] shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/[0.07] px-5 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-700 dark:text-pink-400">Admin action</p><h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">{TITLES[activeModal]}</h2><p className="mt-1 break-all text-xs text-muted-foreground">{email}</p></div>
              <button type="button" onClick={closeModal} disabled={isPending} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.035] text-muted-foreground hover:text-slate-950 dark:hover:text-white disabled:opacity-40"><X className="h-4 w-4" /></button>
            </div>
            {successMsg ? (
              <div className="p-5 sm:p-6"><p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">{successMsg}</p><button type="button" onClick={closeModal} className="mt-4 w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-950 dark:hover:text-white">Done</button></div>
            ) : (
              <form onSubmit={handleSubmit} className="max-h-[78dvh] overflow-y-auto p-5 sm:p-6">
                <ActionWarning activeModal={activeModal} hasActiveOverrides={hasActiveOverrides} selectedPlan={selectedPlan} plan={plan} />
                {activeModal === "change_plan" && (
                  <label className="mt-4 block"><span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Plan</span><select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value as AdminPlan)} className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-background dark:bg-[#080d17] px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10"><option value="FREE">Free</option><option value="PRO">Pro</option><option value="BUSINESS">Business</option></select></label>
                )}
                <label className="mt-4 block"><span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Audit reason</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Explain why this action is necessary" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-3.5 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-600 focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10" /></label>
                {activeModal !== "reactivate" && <label className="mt-4 block"><span className={`text-[10px] font-black uppercase tracking-[0.14em] ${activeModal === "change_plan" ? "text-pink-700 dark:text-pink-300" : "text-amber-800 dark:text-amber-300"}`}>Type {activeModal === "suspend" ? "SUSPEND" : activeModal === "change_plan" ? "CHANGE PLAN" : "RESET USAGE"} to confirm</span><input type="text" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={activeModal === "suspend" ? "SUSPEND" : activeModal === "change_plan" ? "CHANGE PLAN" : "RESET USAGE"} className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-600 focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10" /></label>}
                {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-3 text-xs text-red-700 dark:text-red-200">{error}</p>}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={closeModal} disabled={isPending} className="rounded-xl border border-slate-200 dark:border-white/[0.09] px-4 py-2.5 text-sm font-bold text-muted-foreground dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-950 dark:hover:text-white disabled:opacity-50">Cancel</button><button type="submit" disabled={isPending} className={`rounded-xl px-5 py-2.5 text-sm font-black text-white transition disabled:opacity-50 ${activeModal === "suspend" ? "bg-red-600 hover:bg-red-500" : activeModal === "reactivate" ? "bg-emerald-600 hover:bg-emerald-500" : activeModal === "change_plan" ? "bg-gradient-to-r from-pink-500 to-violet-600 hover:brightness-110" : "bg-amber-600 hover:bg-amber-500"}`}>{isPending ? "Processing…" : TITLES[activeModal]}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ActionButton({ icon, title, detail, tone, onClick }: { icon: React.ReactNode; title: string; detail: string; tone: "red" | "green" | "pink" | "amber"; onClick: () => void }) {
  const styles = { red: "border-red-500/15 bg-red-500/[0.035] text-red-700 dark:text-red-300 hover:border-red-500/30 hover:bg-red-500/[0.07]", green: "border-emerald-500/15 bg-emerald-500/[0.035] text-emerald-700 dark:text-emerald-300 hover:border-emerald-500/30 hover:bg-emerald-500/[0.07]", pink: "border-pink-500/15 bg-pink-500/[0.035] text-pink-700 dark:text-pink-300 hover:border-pink-500/30 hover:bg-pink-500/[0.07]", amber: "border-amber-500/15 bg-amber-500/[0.035] text-amber-800 dark:text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/[0.07]" }[tone];
  return <button type="button" onClick={onClick} className={`group rounded-2xl border p-4 text-left transition ${styles}`}><span className="grid h-9 w-9 place-items-center rounded-xl border border-current/15 bg-slate-100/80 dark:bg-black/10">{icon}</span><span className="mt-3 block text-sm font-black text-slate-950 dark:text-white">{title}</span><span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{detail}</span></button>;
}

function ActionWarning({ activeModal, hasActiveOverrides, selectedPlan, plan }: { activeModal: ModalKey; hasActiveOverrides?: boolean; selectedPlan: AdminPlan; plan?: string }) {
  if (activeModal === "suspend") return <p className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-3 text-xs leading-5 text-red-700 dark:text-red-200">Suspending pauses all active automations. Integrations, leads, records, and billing data are preserved.</p>;
  if (activeModal === "change_plan") return <div className="space-y-2"><p className="rounded-xl border border-pink-500/20 bg-pink-500/[0.07] px-3.5 py-3 text-xs leading-5 text-pink-700 dark:text-pink-200">Manual plan changes affect AP3K internal access only. Stripe billing is not modified.</p>{hasActiveOverrides && selectedPlan === "FREE" && plan !== "FREE" && <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3.5 py-3 text-xs leading-5 text-amber-800 dark:text-amber-200">This user has active internal overrides. Downgrading changes plan defaults, while explicit overrides remain until cleared separately.</p>}</div>;
  if (activeModal === "reset_usage") return <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3.5 py-3 text-xs leading-5 text-amber-800 dark:text-amber-200">Usage counters reset from this moment forward. Historical logs, automations, integrations, invoices, and Stripe data are not deleted.</p>;
  return <p className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3.5 py-3 text-xs leading-5 text-emerald-700 dark:text-emerald-200">Reactivation restores user access. Existing automation review states remain unchanged.</p>;
}
