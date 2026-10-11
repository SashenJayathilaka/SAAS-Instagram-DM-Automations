"use client";

import { useState } from "react";
import { ManageBillingButton } from "./manage-billing-button";
import Link from "next/link";
import { ArrowUpRight, Check, Zap, Sparkles, Building2 } from "lucide-react";
import { UiText } from "@/components/i18n/localized-copy";
import { useI18n } from "@/providers/i18n-provider";
import {
  PLAN_CARDS,
  checkoutHref,
  type BillingInterval,
  type CustomerPlan,
  type PaidPlan,
} from "@/lib/billing-plans";
import { getPlanLimits, isUnlimited } from "@/lib/plan-limits";
import { localizePublicPath } from "@/lib/i18n/config";

type Props = {
  current: CustomerPlan;
  initialInterval: BillingInterval;
  existingPaid: boolean;
  internalAccess: boolean;
  disabled: boolean;
};

export default function BillingPlans({
  current,
  initialInterval,
  existingPaid,
  internalAccess,
  disabled,
}: Props) {
  const [interval, setInterval] = useState(initialInterval);
  const { locale } = useI18n();
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  return (
    <section
      aria-labelledby="billing-plans-title"
      className="border-t border-slate-200 light:border-slate-300 pt-6 dark:border-white/10"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="billing-plans-title"
            className="text-base font-semibold text-slate-950 dark:text-white"
          >
            <UiText>Plans</UiText>
          </h2>
          <p className="mt-1 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
            <UiText>Choose the capacity you need.</UiText>
          </p>
        </div>
        <div
          role="group"
          aria-label="Billing interval"
          className="flex w-fit rounded-xl border border-slate-200 light:border-slate-300 bg-slate-100/70 p-1 dark:border-white/10 dark:bg-white/5"
        >
          {(["month", "year"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={interval === value}
              onClick={() => setInterval(value)}
              className={`min-h-10 rounded-lg px-4 text-xs font-semibold transition-colors ${interval === value ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 light:text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"}`}
            >
              <UiText>{value === "year" ? "Yearly" : "Monthly"}</UiText>
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PLAN_CARDS.map((plan) => {
          const limits = getPlanLimits(plan.id);
          const selected = plan.id === current;
          const free = plan.id === "FREE";
          const Icon = free ? Zap : plan.id === "PRO" ? Sparkles : Building2;
          const price =
            interval === "year"
              ? (plan.annualPrice ?? 0) / 12
              : (plan.monthlyPrice ?? 0);
          return (
            <article
              key={plan.id}
              aria-label={`${plan.name} plan`}
              className={`billing-plan flex min-w-0 flex-col rounded-2xl border p-5 ${selected ? "border-violet-400 bg-violet-50/60 ring-1 ring-violet-400/20 dark:border-violet-400/50 dark:bg-violet-400/[0.07]" : "border-slate-200 light:border-slate-300 bg-white dark:border-white/10 dark:bg-[#151b28]"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                  <span className="flex items-center gap-2"><Icon size={18} className="text-violet-500" aria-hidden="true"/>{plan.name}</span>
                </h3>
                {selected && (
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold text-violet-700 dark:bg-violet-400/15 dark:text-violet-200">
                    <UiText>Current plan</UiText>
                  </span>
                )}
              </div>
              <p className="mt-4 flex flex-wrap items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {money(price)}
                </span>
                {!free && (
                  <span className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
                    <UiText>/month</UiText>
                  </span>
                )}
              </p>
              <p className="mt-1 min-h-5 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
                {free ? (
                  <UiText>No recurring charge</UiText>
                ) : interval === "year" ? (
                  <>
                    {money(plan.annualPrice ?? 0)}{" "}
                    <UiText>billed yearly</UiText>
                  </>
                ) : (
                  <UiText>Billed monthly</UiText>
                )}
              </p>
              <dl className="my-4 space-y-2.5 border-t border-slate-200/70 pt-4 text-xs dark:border-white/10">
                {[
                  [
                    "Automated actions / month",
                    plan.replyLimit.toLocaleString(locale),
                  ],
                  [
                    "Instagram accounts",
                    String(limits.connectedInstagramAccounts),
                  ],
                  [
                    "AI replies / month",
                    Number(limits.aiRepliesPerMonth).toLocaleString(locale),
                  ],
                  [
                    "Active automations",
                    isUnlimited(limits.activeCampaigns)
                      ? "Unlimited"
                      : String(limits.activeCampaigns),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt className="text-slate-500 light:text-slate-600 dark:text-slate-400">
                      <UiText>{label}</UiText>
                    </dt>
                    <dd className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      <UiText>{value}</UiText>
                    </dd>
                  </div>
                ))}
              </dl>
              {!free && (
                <p className="mb-4 flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  <Check
                    size={14}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-violet-500 light:text-violet-700"
                  />
                  <UiText>Lead capture, follow-ups and custom flows</UiText>
                </p>
              )}
              {existingPaid && !free && !disabled && <div className="mt-auto"><ManageBillingButton intent="update" label={selected ? "Manage billing frequency" : "Compare and change plan"} /></div>}
              {!existingPaid &&
                !internalAccess &&
                !selected &&
                !free &&
                (disabled ? (
                  <span className="mt-auto rounded-xl bg-slate-100 px-3 py-3 text-center text-xs text-slate-500 light:text-slate-600 dark:bg-white/5">
                    <UiText>Billing unavailable</UiText>
                  </span>
                ) : (
                  <Link
                    href={checkoutHref(plan.id as PaidPlan, interval)}
                    className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
                  >
                    <UiText>{`Upgrade to ${plan.name}`}</UiText>
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                ))}
            </article>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-2 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <UiText>
            {existingPaid
              ? "To change plans or billing frequency, use Manage subscription above."
              : "Prices are in USD."}
          </UiText>
        </p>
        <Link
          href={localizePublicPath("/pricing", locale)}
          className="inline-flex min-h-10 items-center gap-1 font-semibold text-violet-600 hover:underline dark:text-violet-300"
        >
          <UiText>See all plan features</UiText>
          <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
