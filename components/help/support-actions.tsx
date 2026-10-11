"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CreditCard, ShieldCheck } from "lucide-react";
import { ManageBillingButton } from "@/components/global/billing/manage-billing-button";
import { UiText } from "@/components/i18n/localized-copy";
import type { SupportAction } from "@/lib/support-assistance";

export function SupportActions({ actions, workspace }: { actions: SupportAction[]; workspace: string }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!actions.length) return null;
  return <div className="mt-4 space-y-3 border-t border-slate-200 pt-3 text-start dark:border-white/10" aria-label="Available account actions">
    {actions.includes("cancel") && <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#101827]">
      <p className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 shrink-0 text-violet-500" /><UiText>Review cancellation</UiText></p>
      <p className="mt-1 whitespace-normal text-xs leading-5 text-slate-600 dark:text-slate-300"><UiText>Nothing is canceled in this chat. Review the effective date and confirm your choice in Stripe.</UiText></p>
      {confirmCancel ? <div className="mt-3 space-y-2">
        <ManageBillingButton intent="cancel" label="Continue to Stripe" />
        <button type="button" onClick={() => setConfirmCancel(false)} className="min-h-10 w-full rounded-lg text-xs font-semibold"><UiText>Go back</UiText></button>
      </div> : <button type="button" onClick={() => setConfirmCancel(true)} className="mt-3 min-h-11 w-full rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white hover:bg-violet-700"><UiText>Review cancellation options</UiText></button>}
    </div>}
    {actions.includes("payment") && <ManageBillingButton intent="payment" label="Update payment method" />}
    {actions.includes("billing") && <Link href={`/dashboard/${encodeURIComponent(workspace)}/billing`} className="flex min-h-11 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-700 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200"><CreditCard className="h-4 w-4 shrink-0" /><span className="flex-1"><UiText>View plans, usage and invoices</UiText></span><ArrowUpRight className="h-4 w-4 shrink-0" /></Link>}
  </div>;
}
