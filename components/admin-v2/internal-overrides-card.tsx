"use client";

import { useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { V2Badge } from "@/components/admin-v2/v2-badge";
import LocalTime from "@/components/global/local-time";
import { adminUpdateUserBillingOverridesAction } from "@/actions/admin/user-actions";
import type { AdminV2UserDetail } from "@/lib/admin-v2/queries";
import type { UsageSummary } from "@/lib/plan-limits";
import { getPlanLimits, type ProductPlan } from "@/lib/plan-limits";

type Props = {
  user: AdminV2UserDetail;
  usage: UsageSummary | null;
};

export function InternalOverridesCard({ user, usage }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [monthlyReply, setMonthlyReply] = useState(user.monthlyReplyLimitOverride?.toString() ?? "");
  const [aiReply, setAiReply] = useState(user.aiReplyLimitOverride?.toString() ?? "");
  const [activeCampaign, setActiveCampaign] = useState(user.activeCampaignLimitOverride?.toString() ?? "");
  const [connectedAccount, setConnectedAccount] = useState(user.connectedAccountLimitOverride?.toString() ?? "");
  const [expiresAt, setExpiresAt] = useState(user.overrideExpiresAt ? new Date(user.overrideExpiresAt).toISOString().split("T")[0] : "");
  const [reason, setReason] = useState(user.overrideReason ?? "");

  const isOverrideActive = Boolean(user.overrideReason && (!user.overrideExpiresAt || new Date(user.overrideExpiresAt) > new Date()));
  const isOverrideExpired = Boolean(user.overrideExpiresAt && new Date(user.overrideExpiresAt) <= new Date());
  const planLimits = getPlanLimits(user.plan as ProductPlan);

  function openModal() {
    setIsModalOpen(true);
    setError(null);
    setSuccessMsg(null);
  }

  function closeModal() {
    if (isPending) return;
    setIsModalOpen(false);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", user.id);
      formData.set("reason", reason);
      formData.set("monthlyReplyLimitOverride", monthlyReply);
      formData.set("aiReplyLimitOverride", aiReply);
      formData.set("activeCampaignLimitOverride", activeCampaign);
      formData.set("connectedAccountLimitOverride", connectedAccount);
      formData.set("overrideExpiresAt", expiresAt);

      const result = await adminUpdateUserBillingOverridesAction(formData);
      if (result.status === 200) {
        setSuccessMsg("Overrides updated successfully.");
        setTimeout(() => setIsModalOpen(false), 1200);
      } else {
        setError(String(result.data));
      }
    });
  }

  function handleClear() {
    setError(null);
    if (!reason.trim()) {
      setError("Reason is required to clear overrides.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", user.id);
      formData.set("reason", reason);
      formData.set("monthlyReplyLimitOverride", "");
      formData.set("aiReplyLimitOverride", "");
      formData.set("activeCampaignLimitOverride", "");
      formData.set("connectedAccountLimitOverride", "");
      formData.set("overrideExpiresAt", "");

      const result = await adminUpdateUserBillingOverridesAction(formData);
      if (result.status === 200) {
        setSuccessMsg("Overrides cleared.");
        setMonthlyReply("");
        setAiReply("");
        setActiveCampaign("");
        setConnectedAccount("");
        setExpiresAt("");
        setReason("");
        setTimeout(() => setIsModalOpen(false), 1200);
      } else {
        setError(String(result.data));
      }
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-white/[0.075] bg-white dark:bg-[#0c111d]/[0.88] p-5 shadow-surface sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground">Internal access overrides</p>
          <h2 className="mt-1 text-base font-black text-slate-950 dark:text-white">Custom usage limits</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Owner-only AP3K limits. Stripe billing is never modified by this control.</p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-pink-500/15 bg-pink-500/[0.055] px-3.5 py-2 text-[11px] font-bold text-pink-700 dark:text-pink-300 transition hover:bg-pink-500/[0.1]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Edit overrides
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <OverrideField
          label="Status"
          value={isOverrideActive ? <V2Badge tone="pink">Override active</V2Badge> : isOverrideExpired ? <V2Badge tone="amber">Override expired</V2Badge> : <V2Badge tone="slate">Inactive</V2Badge>}
        />
        <OverrideField
          label="Static replies"
          value={usage?.staticReplies.limit.toLocaleString() ?? "—"}
          sub={isOverrideActive && user.monthlyReplyLimitOverride !== null ? `Plan: ${planLimits.staticRepliesPerMonth.toLocaleString()}` : undefined}
        />
        <OverrideField
          label="AI replies"
          value={usage?.aiReplies.limit.toLocaleString() ?? "—"}
          sub={isOverrideActive && user.aiReplyLimitOverride !== null ? `Plan: ${planLimits.aiRepliesPerMonth.toLocaleString()}` : undefined}
        />
        <OverrideField
          label="Active automations"
          value={usage?.activeCampaigns.limit.toLocaleString() ?? "—"}
          sub={isOverrideActive && user.activeCampaignLimitOverride !== null ? `Plan: ${planLimits.activeCampaigns.toLocaleString()}` : undefined}
        />
        <OverrideField
          label="Connected accounts"
          value={usage?.connectedAccounts.limit.toLocaleString() ?? "—"}
          sub={isOverrideActive && user.connectedAccountLimitOverride !== null ? `Plan: ${planLimits.connectedInstagramAccounts.toLocaleString()}` : undefined}
        />
      </div>

      {(user.overrideExpiresAt || user.overrideReason) && (
        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 dark:border-white/[0.055] bg-slate-100/80 dark:bg-black/10 p-3.5 sm:grid-cols-[auto_1fr] sm:items-start">
          {user.overrideExpiresAt && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">Expires</p>
              <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-300"><LocalTime value={user.overrideExpiresAt} /></p>
            </div>
          )}
          {user.overrideReason && (
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">Last reason</p>
              <p className="mt-1 break-words text-xs leading-5 text-muted-foreground dark:text-slate-400">{user.overrideReason}</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/72 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#0b101a] shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/[0.07] px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-700 dark:text-pink-400">Internal access</p>
                <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Edit custom limits</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">These limits affect AP3K only. Billing in Stripe remains unchanged.</p>
              </div>
              <button type="button" onClick={closeModal} disabled={isPending} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.035] text-muted-foreground hover:text-slate-950 dark:hover:text-white disabled:opacity-40">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              {successMsg ? (
                <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">{successMsg}</p>
              ) : (
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <LimitInput label="Monthly replies" value={monthlyReply} onChange={setMonthlyReply} />
                    <LimitInput label="AI replies" value={aiReply} onChange={setAiReply} />
                    <LimitInput label="Active automations" value={activeCampaign} onChange={setActiveCampaign} />
                    <LimitInput label="Connected accounts" value={connectedAccount} onChange={setConnectedAccount} />
                  </div>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Expiration date · optional</span>
                    <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-background dark:bg-[#080d17] px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10" />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Audit reason</span>
                    <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Why is this override necessary?" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-3.5 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-600 focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10" />
                  </label>

                  {!expiresAt && <p className="rounded-xl border border-amber-500/15 bg-amber-500/[0.055] px-3.5 py-3 text-[11px] leading-5 text-amber-800 dark:text-amber-200/85">No expiration is set. These overrides remain active indefinitely until they are explicitly changed or cleared.</p>}
                  {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-3 text-xs text-red-700 dark:text-red-200">{error}</p>}

                  <div className="flex flex-col-reverse gap-2 border-t border-slate-200 dark:border-white/[0.06] pt-4 sm:flex-row sm:justify-between">
                    <button type="button" onClick={handleClear} disabled={isPending} className="rounded-xl border border-amber-500/18 bg-amber-500/[0.04] px-4 py-2.5 text-sm font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/[0.08] disabled:opacity-50">Clear overrides</button>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                      <button type="button" onClick={closeModal} disabled={isPending} className="rounded-xl border border-slate-200 dark:border-white/[0.09] px-4 py-2.5 text-sm font-bold text-muted-foreground dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-950 dark:hover:text-white disabled:opacity-50">Cancel</button>
                      <button type="submit" disabled={isPending} className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2.5 text-sm font-black text-white hover:brightness-110 disabled:opacity-50">{isPending ? "Saving…" : "Save overrides"}</button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function LimitInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Plan default" className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.035] px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-600 focus:border-pink-400/40 focus:ring-2 focus:ring-pink-500/10" />
    </label>
  );
}

function OverrideField({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.055] bg-slate-50 dark:bg-white/[0.02] p-3.5">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm font-black text-slate-800 dark:text-slate-200">{value}</div>
      {sub && <p className="mt-1 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
