import { UiText } from "@/components/i18n/localized-copy";
import { Button } from "@/components/ui/button";
import { PLAN_CARDS, checkoutHref, type CustomerPlan } from "@/lib/billing-plans";
import { cn } from "@/lib/utils";
import { CircleCheck } from "lucide-react";
import Link from "next/link";

type Props = {
  label: CustomerPlan;
  current: CustomerPlan;
};

// Compatibility card retained for older internal imports. The primary Billing
// experience now uses PricingExperience, but this component follows the same
// customer-facing plan catalog and terminology.
export default function PaymentCard({ label, current }: Props) {
  const plan = PLAN_CARDS.find((item) => item.id === label)!;
  const isActive = label === current;
  const href =
    label === "FREE"
      ? "/pricing"
      : checkoutHref(label, "month");

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-3xl border p-6 text-slate-950 shadow-sm transition-all duration-300 dark:text-white",
        isActive
          ? "border-rf-pink/40 bg-gradient-to-br from-orange-50 via-pink-50 to-white dark:border-pink-500/30 dark:from-[#17110f] dark:via-[#161116] dark:to-[#101112]"
          : "border-slate-200 light:border-slate-300 bg-white hover:-translate-y-1 hover:border-rf-pink/30 hover:shadow-lg dark:border-white/[0.12] dark:bg-[#111827]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">{plan.name}</h2>
        {isActive && <span className="ap3k-badge ap3k-badge-green"><UiText>{"Current"}</UiText></span>}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400"><UiText>{plan.description}</UiText></p>
      <div className="mt-5 flex items-baseline gap-1">
        {label === "FREE" ? (
          <span className="text-4xl font-black tracking-tight">$0</span>
        ) : (
          <>
            <span className="text-4xl font-black tracking-tight">${plan.monthlyPrice}</span>
            <span className="text-sm text-slate-500 light:text-slate-600 dark:text-rf-muted"><UiText>{"/month"}</UiText></span>
          </>
        )}
      </div>
      <div className="mt-5 flex flex-1 flex-col gap-2.5">
        {plan.features.map((feature) => (
          <p key={feature} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CircleCheck className="h-4 w-4 flex-shrink-0 text-orange-500" />
            <UiText>{feature}</UiText>
          </p>
        ))}
      </div>
      <Button
        asChild
        disabled={isActive}
        className={cn(
          "mt-6 rounded-xl font-bold",
          isActive
            ? "cursor-default border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "ap3k-gradient-button"
        )}
      >
        <Link href={isActive ? "/dashboard" : href}>{isActive ? "Current plan" : label === "FREE" ? "View pricing" : `Choose ${plan.name}`}</Link>
      </Button>
    </div>
  );
}
