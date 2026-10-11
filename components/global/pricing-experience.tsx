"use client";
import { useI18n } from "@/providers/i18n-provider";
import type { Locale } from "@/lib/i18n/config";
import { UiText } from "@/components/i18n/localized-copy";


import {
  PLAN_CARDS,
  PLAN_COMPARISON,
  annualMonthlyEquivalent,
  checkoutHref,
  type BillingInterval,
  type CustomerPlan,
  type PaidPlan,
} from "@/lib/billing-plans";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import LocalizedCopy from "@/components/i18n/localized-copy";

const BILLING_LABELS: Record<Locale, { annual: string; monthly: string; equivalent: string }> = {
  en: { annual: "per year, billed annually", monthly: "per month, billed monthly", equivalent: "Monthly equivalent" },
  fr: { annual: "par an, facturé annuellement", monthly: "par mois, facturé mensuellement", equivalent: "Équivalent mensuel" },
  es: { annual: "al año, con facturación anual", monthly: "al mes, con facturación mensual", equivalent: "Equivalente mensual" },
  de: { annual: "pro Jahr, jährlich abgerechnet", monthly: "pro Monat, monatlich abgerechnet", equivalent: "Monatlicher Gegenwert" },
  pt: { annual: "por ano, com cobrança anual", monthly: "por mês, com cobrança mensal", equivalent: "Equivalente mensal" },
};

type Props = {
  compact?: boolean;
  dashboardCompact?: boolean;
  currentPlan?: CustomerPlan;
  existingPaid?: boolean;
  internalPlanAccess?: boolean;
};

export default function PricingExperience({
  compact = false,
  dashboardCompact = false,
  currentPlan,
  existingPaid = false,
  internalPlanAccess = false,
}: Props) {
  const { locale } = useI18n();
  const billingLabel = BILLING_LABELS[locale];
  const [interval, setInterval] = useState<BillingInterval>("year");

  return (
    <LocalizedCopy><div className="w-full">
      <div className={`mx-auto flex w-fit max-w-full items-stretch rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05] ${dashboardCompact ? "mb-3" : "mb-8"}`}>
        <button
          type="button"
          aria-pressed={interval === "month"}
          onClick={() => setInterval("month")}
          className={`min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition-colors duration-fast sm:px-4 ${
            interval === "month"
              ? "bg-slate-950 text-white shadow dark:bg-white dark:text-slate-950"
              : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
          }`}
        ><UiText>{" Monthly "}</UiText></button>
        <button
          type="button"
          aria-pressed={interval === "year"}
          onClick={() => setInterval("year")}
          className={`flex flex-wrap items-center justify-center gap-2 min-h-11 rounded-xl px-3 py-2 text-sm font-bold transition-colors duration-fast sm:px-4 ${
            interval === "year"
              ? "bg-slate-950 text-white shadow dark:bg-white dark:text-slate-950"
              : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
          }`}
        ><UiText>{" Annual "}</UiText><span className={`rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black ${interval === "year" ? "text-emerald-300 dark:text-emerald-800" : "text-emerald-800 dark:text-emerald-300"}`}><UiText>{" Save up to 33% "}</UiText></span>
        </button>
      </div>

      {existingPaid && !dashboardCompact ? (
        <p className={`mx-auto max-w-3xl rounded-2xl border border-blue-200 bg-blue-50 px-4 text-center font-bold text-blue-800 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200 ${dashboardCompact ? "mb-5 py-2.5 text-xs sm:text-sm" : "mb-6 py-3 text-sm"}`}><UiText>{" You already have a paid subscription. Use "}</UiText><strong><UiText>{"Manage billing"}</UiText></strong><UiText>{" to change plan, billing interval, payment method, or cancellation settings. "}</UiText></p>
      ) : null}

      <div className={`mx-auto grid w-full max-w-[1180px] gap-5 ${dashboardCompact ? "xl:grid-cols-3" : "lg:grid-cols-3"}`}>
        {PLAN_CARDS.map((plan) => {
          const isPaid = plan.id === "PRO" || plan.id === "BUSINESS";
          const paidPlan = isPaid ? (plan.id as PaidPlan) : null;
          const isCurrent = Boolean(currentPlan && plan.id === currentPlan);
          const price = interval === "year" ? plan.annualPrice : plan.monthlyPrice;

          let href = plan.id === "FREE" ? "/sign-up" : checkoutHref(paidPlan!, interval);
          let cta = plan.id === "FREE" ? "GET STARTED" : `Choose ${plan.name}`;

          if (isCurrent) {
            href = existingPaid ? "#manage-billing" : "/dashboard";
            cta = internalPlanAccess ? "Internal access" : "Current plan";
          } else if (existingPaid) {
            href = "#manage-billing";
            cta = "Manage in portal";
          }

          const visibleFeatures = plan.features;

          return (
            <article
              key={plan.id}
              className={`relative flex min-h-full flex-col overflow-visible border shadow-surface ${dashboardCompact || compact ? "rounded-2xl p-4" : "rounded-2xl p-6"} ${
                isCurrent ? "ring-2 ring-emerald-500/50" : ""
              } ${
                plan.featured
                  ? "border-violet-400 bg-violet-50/60 ring-1 ring-violet-400/20 dark:border-violet-400/50 dark:bg-violet-400/[0.06]"
                  : "border-slate-200 bg-white/90 dark:border-white/10 dark:bg-[#101217]"
              }`}
            >
              {plan.featured && (
                <div className={`absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-violet-700 font-black text-white shadow-lg ${dashboardCompact ? "px-3 py-1 text-[10px]" : "px-4 py-1.5 text-xs"}`}>
                  <Sparkles className="h-3.5 w-3.5" /><UiText>{" Recommended "}</UiText></div>
              )}
              {isCurrent && (
                <span className="absolute end-3 top-3 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300"><UiText>{" Current "}</UiText></span>
              )}

              <div className={dashboardCompact ? "pt-0.5" : compact ? "pt-1" : "pt-2"}>
                <h2 className={`${dashboardCompact || compact ? "text-xl" : "text-2xl"} font-black tracking-tight text-slate-950 dark:text-white`}>{plan.name}</h2>
                <p className={`${dashboardCompact || compact ? "mt-1 min-h-[2rem] text-xs leading-5" : "mt-2 min-h-[3rem] text-sm leading-relaxed"} text-slate-500 dark:text-slate-400`}>{plan.description}</p>
              </div>

              <div className={dashboardCompact || compact ? "mt-2 min-h-[3.4rem]" : "mt-6 min-h-[5rem]"}>
                {plan.id === "FREE" ? (
                  <div>
                    <p className={`${dashboardCompact || compact ? "text-3xl" : "text-4xl"} font-black tracking-tight text-slate-950 dark:text-white`}>
                      $0
                    </p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground"><UiText>{"No credit card required"}</UiText></p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className={`${dashboardCompact || compact ? "text-3xl" : "text-4xl"} font-black tracking-tight text-slate-950 dark:text-white`}>${price}</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{interval === "year" ? billingLabel.annual : billingLabel.monthly}</span>
                    </div>
                    {interval === "year" && paidPlan && (
                      <p className="mt-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                        {billingLabel.equivalent}: ${annualMonthlyEquivalent(paidPlan).toFixed(2)}</p>
                    )}
                  </>
                )}
              </div>

              <div className={`${dashboardCompact || compact ? "mt-2 gap-1 border-t pt-2" : "mt-5 gap-3 border-t pt-5"} flex flex-1 flex-col border-slate-100 dark:border-white/[0.08]`}>
                {visibleFeatures.map((feature, featureIndex) => (
                  <div
                    key={feature}
                    className={`flex items-start gap-2 rounded-xl ${dashboardCompact || compact ? "px-1 py-1 text-xs" : "px-2 py-1.5 text-sm"} ${
                      featureIndex === 0 && plan.id !== "FREE"
                        ? "font-bold text-slate-900 dark:text-white"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-300" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Link
                href={href}
                aria-disabled={isCurrent}
                tabIndex={isCurrent ? -1 : undefined}
                onClick={isCurrent ? (event) => event.preventDefault() : undefined}
                className={`${dashboardCompact || compact ? "mt-3 min-h-11 rounded-xl px-3 text-xs" : "mt-7 min-h-12 rounded-2xl px-5 text-sm"} inline-flex items-center justify-center font-black transition-colors duration-fast ${
                  isCurrent
                    ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : plan.featured
                      ? "bg-violet-700 text-white shadow-sm hover:bg-violet-800"
                      : "border border-slate-200 bg-slate-50 text-slate-900 hover:border-violet-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                }`}
              >
                {cta}
              </Link>
            </article>
          );
        })}
      </div>

      <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-6 text-slate-600 dark:text-slate-300"><UiText>{"One public reply + one DM = 2 actions. Additional messages use additional actions. Prices are in USD."}</UiText></p>

      {!compact && (
        <section className="mt-20">
          <div className="mb-8 text-center">
            <p className="ap3k-kicker"><UiText>{"Compare plans"}</UiText></p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl"><UiText>{"Plans, side by side"}</UiText></h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400"><UiText>{"Real AP3K features and limits, with every successful comment reply and DM counted as one automated action."}</UiText></p>
          </div>
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/90 shadow-sm dark:border-white/10 dark:bg-[#0f1012]">
            <table className="w-full min-w-[720px] border-collapse text-start text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="px-6 py-5 font-black text-slate-500"><UiText>{"Feature"}</UiText></th>
                  <th scope="col" className="px-6 py-5 font-black text-slate-950 dark:text-white"><UiText>{"Free"}</UiText></th>
                  <th className="bg-orange-500/[0.06] px-6 py-5 font-black text-violet-600 dark:text-violet-300"><UiText>{"Pro"}</UiText></th>
                  <th className="px-6 py-5 font-black text-slate-950 dark:text-white"><UiText>{"Business"}</UiText></th>
                </tr>
              </thead>
              <tbody>
                {PLAN_COMPARISON.map((row) => (
                  <tr key={row.feature} className="border-b border-slate-100 last:border-b-0 dark:border-white/[0.07]">
                    <td className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">{row.feature}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{row.free}</td>
                    <td className="bg-orange-500/[0.04] px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{row.pro}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div></LocalizedCopy>
  );
}
