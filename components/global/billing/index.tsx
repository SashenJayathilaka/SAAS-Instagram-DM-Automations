"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { UiText } from "@/components/i18n/localized-copy";
import { useI18n } from "@/providers/i18n-provider";
import { planDisplayName, type CustomerPlan } from "@/lib/billing-plans";
import type { BillingSnapshot } from "@/lib/billing-snapshot";
import {
  getBillingUsagePresentation,
  isManageableSubscriptionStatus,
  subscriptionStatusLabel,
} from "@/lib/billing-presentation";
import { isUnlimited, type UsageSummary } from "@/lib/plan-limits";
import {
  CalendarDays,
  CreditCard,
  Instagram,
  MessageCircle,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ManageBillingButton } from "./manage-billing-button";
import BillingPlans from "./plans";

type Props = {
  current?: CustomerPlan;
  usage?: UsageSummary;
  billingState?: "none" | "subscription" | "unavailable";
  billing?: BillingSnapshot | null;
  billingReason?: "customer_missing";
};

export default function Billing({
  current = "FREE",
  usage,
  billingState = "none",
  billing,
  billingReason,
}: Props) {
  const { locale } = useI18n();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const hasStripeSubscription =
    billingState === "subscription" && Boolean(billing);
  const activeStripeSubscription =
    hasStripeSubscription && isManageableSubscriptionStatus(billing?.status);
  const internalAccess = current !== "FREE" && billingState === "none";
  const status =
    billingState === "unavailable"
      ? "Status unavailable"
      : billing
        ? subscriptionStatusLabel(billing.status, billing.cancelAtPeriodEnd)
        : internalAccess
          ? "Internal access"
          : "Free plan";
  const needsAttention = Boolean(
    billing &&
      ["past_due", "unpaid", "incomplete", "paused"].includes(billing.status),
  );
  const healthy =
    !needsAttention &&
    !billing?.cancelAtPeriodEnd &&
    (billing?.status === "active" || billing?.status === "trialing");
  const date = (value: string | Date) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? "Date unavailable"
      : new Intl.DateTimeFormat(locale, {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(parsed);
  };
  const renewalLabel = billing?.cancelAtPeriodEnd
    ? "Access until"
    : billing?.status === "trialing"
      ? "Trial ends"
      : activeStripeSubscription
        ? "Next renewal"
        : "Billing";
  const renewalValue =
    billing?.renewsAt && activeStripeSubscription
      ? date(billing.renewsAt)
      : internalAccess || (current === "FREE" && billingState === "none")
        ? "No recurring charge"
        : activeStripeSubscription
          ? "Date unavailable"
          : status;

  return (
    <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
      <header
        id="manage-billing"
        className="flex scroll-mt-24 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            <UiText>Billing</UiText>
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 light:text-slate-600 dark:text-slate-400">
            <UiText>Your plan, usage and payment details.</UiText>
          </p>
        </div>
        {hasStripeSubscription && (
          <ManageBillingButton
            activeSubscription={activeStripeSubscription}
            label={activeStripeSubscription ? "Manage subscription" : undefined}
          />
        )}
      </header>

      {billingState === "unavailable" && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"
        >
          <p><UiText>{billingReason === "customer_missing"
            ? "Your saved billing account could not be found in Stripe. Check the billing link before starting another subscription. Your AP3K plan has not been changed."
            : "Stripe billing status is temporarily unavailable. Refresh this page before starting another checkout."}</UiText></p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {billingReason === "customer_missing" ? <ManageBillingButton label="Check billing link" /> : <button type="button" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())} className="min-h-11 rounded-lg border border-current px-4 font-semibold disabled:opacity-50"><UiText>{refreshing ? "Checking billing…" : "Retry"}</UiText></button>}
            <a href="mailto:support@ap3k.com" className="inline-flex min-h-11 items-center underline underline-offset-4"><UiText>Contact billing support</UiText></a>
          </div>
        </div>
      )}
      {needsAttention && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"
        >
          <UiText>
            Your subscription needs attention. Open billing management to review
            your payment details.
          </UiText>
        </p>
      )}

      <section
        aria-labelledby="current-plan-title"
        className="overflow-hidden rounded-2xl border border-slate-200 light:border-slate-300 bg-white shadow-sm dark:border-white/10 dark:bg-[#151b28]"
      >
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300">
              <CreditCard size={23} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 light:text-slate-600 dark:text-slate-400">
                <UiText>Current plan</UiText>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <h2
                  id="current-plan-title"
                  className="text-xl font-bold text-slate-950 dark:text-white"
                >
                  {usage?.planLabel ?? planDisplayName(current)}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${needsAttention || billing?.cancelAtPeriodEnd ? "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200" : healthy ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"}`}
                >
                  <UiText>{status}</UiText>
                </span>
              </div>
              {billing?.interval && (
                <p className="mt-1 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
                  <UiText>
                    {billing.interval === "year"
                      ? "Annual billing"
                      : "Monthly billing"}
                  </UiText>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-100 light:border-slate-200 pt-4 text-sm dark:border-white/5 sm:border-0 sm:pt-0">
            <CalendarDays
              size={18}
              aria-hidden="true"
              className="text-slate-400 light:text-slate-600"
            />
            <div>
              <p className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
                <UiText>{renewalLabel}</UiText>
              </p>
              <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                <UiText>{renewalValue}</UiText>
              </p>
            </div>
          </div>
        </div>
        {internalAccess && (
          <p className="border-t border-slate-100 light:border-slate-200 px-5 py-3 text-xs text-slate-500 light:text-slate-600 dark:border-white/5 dark:text-slate-400 sm:px-6">
            <UiText>Internal plan access</UiText>
            <span> · </span>
            <UiText>No recurring charge</UiText>
          </p>
        )}
        {hasStripeSubscription && (
          <p className="border-t border-slate-100 light:border-slate-200 px-5 py-3 text-xs text-slate-500 light:text-slate-600 dark:border-white/5 dark:text-slate-400 sm:px-6">
            <UiText>
              Manage your plan, payment method, invoices and cancellation in the
              secure billing portal.
            </UiText>
          </p>
        )}
      </section>

      <section aria-labelledby="billing-usage-title">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="billing-usage-title"
            className="text-base font-semibold text-slate-950 dark:text-white"
          >
            <UiText>Usage this month</UiText>
          </h2>
          {usage && (
            <p className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
              <UiText>Resets</UiText> {date(usage.periodEnd)} <span>(UTC)</span>
            </p>
          )}
        </div>
        {usage ? (
          <>
            <div
              className={`grid min-w-0 gap-3 sm:grid-cols-2 ${current !== "FREE" ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
            >
              <UsageCard
                label="Automated actions"
                icon={MessageCircle}
                metric={usage.staticReplies}
              />
              {current !== "FREE" && (
                <UsageCard
                  label="AI replies"
                  icon={Sparkles}
                  metric={usage.aiReplies}
                />
              )}
              <UsageCard
                label="Instagram accounts"
                icon={Instagram}
                metric={usage.connectedAccounts}
                accounts
              />
              <UsageCard
                label="Active automations"
                icon={Zap}
                metric={usage.activeCampaigns}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
              <UiText>
                One public reply + one DM = 2 actions. Usage resets monthly,
                including on annual plans.
              </UiText>
            </p>
          </>
        ) : (
          <p
            role="status"
            className="rounded-xl border border-slate-200 light:border-slate-300 p-4 text-sm text-slate-500 light:text-slate-600 dark:border-white/10 dark:text-slate-400"
          >
            <UiText>
              Usage is temporarily unavailable. Refresh to try again.
            </UiText>
          </p>
        )}
      </section>

      <BillingPlans
        current={current}
        initialInterval={billing?.interval ?? "month"}
        existingPaid={activeStripeSubscription}
        internalAccess={internalAccess}
        disabled={billingState === "unavailable"}
      />
    </div>
  );
}

function UsageCard({
  label,
  icon: Icon,
  metric,
  accounts = false,
}: {
  label: string;
  icon: LucideIcon;
  metric: UsageSummary["staticReplies"];
  accounts?: boolean;
}) {
  const { locale } = useI18n();
  const unlimited = isUnlimited(metric.limit);
  const { tone } = getBillingUsagePresentation(
    metric,
    accounts ? "accounts" : "default",
  );
  const color =
    tone === "red"
      ? "bg-red-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-violet-500";
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 light:border-slate-300 bg-white p-4 dark:border-white/10 dark:bg-[#151b28]">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 light:text-slate-600 dark:text-slate-400">
        <Icon size={15} className="shrink-0" aria-hidden="true" />
        <span>
          <UiText>{label}</UiText>
        </span>
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-950 dark:text-white">
          {metric.used.toLocaleString(locale)}
        </span>
        <span className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
          /{" "}
          {unlimited ? (
            <UiText>Unlimited</UiText>
          ) : (
            Number(metric.limit).toLocaleString(locale)
          )}
        </span>
      </p>
      {!unlimited && (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={Number(metric.limit)}
          aria-valuenow={Math.min(metric.used, Number(metric.limit))}
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
        >
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${Math.max(0, Math.min(100, metric.percent))}%` }}
          />
        </div>
      )}
      {metric.blocked && !unlimited && (
        <p
          className={`mt-2 text-xs font-medium ${accounts ? "text-amber-700 dark:text-amber-300" : "text-red-600 dark:text-red-300"}`}
        >
          <UiText>
            {accounts ? "Plan account limit reached" : "Limit reached"}
          </UiText>
        </p>
      )}
    </div>
  );
}
