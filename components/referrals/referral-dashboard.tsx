"use client";

import { UiText } from "@/components/i18n/localized-copy";
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  CircleCheck,
  CircleDollarSign,
  Copy,
  Gift,
  LockKeyhole,
  Percent,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ReferralShareCard } from "@/components/referrals/referral-share-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  refreshReferralEligibility,
  unlockReferralPromo,
  requestReferralWithdrawal,
} from "@/actions/referrals";
import type { getReferralDashboard } from "@/lib/referral-program";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { REFERRAL_COPY } from "@/lib/i18n/referrals";
import { useI18n } from "@/providers/i18n-provider";
import { AP3K_PRICING } from "@/lib/billing-plans";

type Props = {
  dashboard: Awaited<ReturnType<typeof getReferralDashboard>>;
  inviteUrl: string;
  foundingPartnerLimit: number;
};
const panel = "rounded-[20px] bg-white dark:bg-[#18181e]";
const muted = "text-zinc-500 dark:text-zinc-400";
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 text-xs font-semibold text-white transition hover:from-emerald-700 hover:to-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-40";

export default function ReferralDashboard({ dashboard, inviteUrl }: Props) {
  const { locale } = useI18n();
  const c = REFERRAL_COPY[locale];
  const router = useRouter();
  const pathname = usePathname();
  const r = dashboard.recurring;
  const billingUnknown = r.billingState === "unavailable";
  const [price, setPrice] = useState(AP3K_PRICING.PRO_MONTHLY * 100);
  const [signups, setSignups] = useState(1);
  const [pending, startTransition] = useTransition();
  const [working, setWorking] = useState<
    "refresh" | "unlock" | "withdraw" | null
  >(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [paypal, setPaypal] = useState("");
  const money = (cents: number) =>
    new Intl.NumberFormat(LOCALE_DETAILS[locale].htmlLang, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  const number = (value: number) =>
    new Intl.NumberFormat(LOCALE_DETAILS[locale].htmlLang).format(value);
  const date = (value: string | Date) =>
    new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  const followersReady = r.followers >= 10000;
  const firstPayment = Math.round(price * 0.6);
  const firstCommission = Math.round(firstPayment * 0.1);
  const remainingCommission = Math.round(price * 0.3) * 10;
  const sourceTotals = r.sourceTotals;
  function run(
    kind: "refresh" | "unlock" | "withdraw",
    action: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setWorking(kind);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          toast.error(result.error || c.actionFailed);
          return;
        }
        if (kind === "withdraw") {
          toast.success(c.requested);
          setWithdrawOpen(false);
          setPaypal("");
        }
        router.refresh();
      } catch {
        toast.error(c.actionFailed);
      } finally {
        setWorking(null);
      }
    });
  }
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 pb-8 text-zinc-950 dark:text-zinc-50">
      <header className="flex items-center gap-2 px-1 py-2">
        <Gift className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h1 className="text-lg font-semibold tracking-tight">{c.title}</h1>
      </header>
      <section className={`${panel} space-y-5 p-4 sm:p-6`}>
        <ReferralShareCard inviteUrl={inviteUrl} />
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          {c.banner}
        </p>
        <div className="relative grid min-h-28 grid-cols-[minmax(0,1fr)_minmax(100px,1fr)] overflow-hidden rounded-[18px] bg-gradient-to-r from-black via-zinc-900 to-zinc-600 text-white">
          <div className="flex min-w-0 flex-col justify-center gap-2 p-4 sm:px-7">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
              {c.promo}
            </span>
            {r.promoCode ? (
              <button
                type="button"
                className="flex w-fit max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                aria-label={`${c.copyCodeLink}: ${r.promoCode}`}
                title={c.copyCodeLink}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      `${new URL(inviteUrl).origin}/r/${encodeURIComponent(r.promoCode!)}`,
                    );
                    toast.success(c.copied);
                  } catch {
                    toast.error(c.copyFailed);
                  }
                }}
              >
                <span className="break-all">{r.promoCode}</span>
                <Copy className="h-3.5 w-3.5 shrink-0" />
              </button>
            ) : (
              <span className="flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-semibold">
                <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
                {c.locked}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end justify-center gap-1 p-4 sm:px-7">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
              {c.discount}
            </span>
            <strong className="text-3xl font-extrabold sm:text-4xl">40%</strong>
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/2 border-l-2 border-dashed border-white/50"
          />
          <span
            aria-hidden="true"
            className="absolute -top-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-white dark:bg-[#18181e]"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-white dark:bg-[#18181e]"
          />
        </div>
        {r.promoCode ? (
          <p className={`text-xs leading-5 ${muted}`}>{c.redeemHint}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`rounded-full px-3 py-2 text-xs font-bold ${r.promoCode || r.eligible ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"}`}
          >
            {r.promoCode
              ? c.activeBadge
              : r.eligible
                ? c.eligibleBadge
                : !r.paidPlan
                  ? c.lockedBadge
                  : c.followerBadge}
          </span>
          {!r.paidPlan ? (
            <Link
              href={pathname.replace(/\/referrals\/?$/, "/billing")}
              className={button}
            >
              {billingUnknown || r.plan !== "FREE" ? <UiText>Review billing</UiText> : c.upgrade}
            </Link>
          ) : !r.promoCode && r.eligible ? (
            <button
              type="button"
              disabled={pending}
              className={button}
              onClick={() => run("unlock", unlockReferralPromo)}
            >
              {working === "unlock" ? c.processing : c.unlock}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs ${muted}`}>{c.based}</span>
          {[
            { name: "Pro", cents: AP3K_PRICING.PRO_MONTHLY * 100 },
            { name: "Business", cents: AP3K_PRICING.BUSINESS_MONTHLY * 100 },
          ].map((plan) => (
            <button
              key={plan.name}
              type="button"
              onClick={() => setPrice(plan.cents)}
              aria-pressed={price === plan.cents}
              className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition ${price === plan.cents ? "border-zinc-900 text-zinc-950 dark:border-zinc-100 dark:text-white" : "border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-white/15 dark:text-zinc-400"}`}
            >
              {plan.name} · {money(plan.cents)}
              {c.monthly}
            </button>
          ))}
        </div>
        <div className="rounded-2xl bg-[#f1f1f4] p-4 dark:bg-white/[0.05] sm:p-5">
          <h2 className={`mb-4 text-xs font-semibold ${muted}`}>
            {c.eligibility}
          </h2>
          <div className="flex items-center gap-3 pb-4">
            <EligibilityIcon ready={r.paidPlan} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{c.paidRequirement}</p>
              <p className={`mt-1 text-xs ${muted}`}>
                {billingUnknown ? <UiText>Billing could not be verified. Your AP3K plan has not changed.</UiText> : r.paidPlan ? c.paidPlan : r.plan === "FREE" ? c.freePlan : <UiText>An active paid Stripe subscription is required; plan access alone does not qualify.</UiText>}
              </p>
            </div>
            <span className={`hidden text-xs font-semibold sm:block ${muted}`}>
              {money(AP3K_PRICING.PRO_MONTHLY * 100)}
              {c.monthly}
            </span>
          </div>
          <div className="flex items-start gap-3 border-t border-zinc-200/70 pt-4 dark:border-white/10">
            <span className="pt-1">
              <EligibilityIcon ready={followersReady} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{c.followerRequirement}</p>
                <span className={`text-xs font-semibold ${muted}`}>
                  {number(r.followers)} / {number(10000)}
                </span>
              </div>
              <div
                className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${muted}`}
              >
                <span>
                  {r.username
                    ? `${c.youHave} ${number(r.followers)} — ${c.connected} @${r.username}`
                    : c.noAccount}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run("refresh", refreshReferralEligibility)}
                  className="inline-flex min-h-8 items-center gap-1 font-semibold text-emerald-700 disabled:opacity-50 dark:text-emerald-400"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${working === "refresh" ? "animate-spin" : ""}`}
                  />
                  {c.refresh}
                </button>
              </div>
              <div
                role="progressbar"
                aria-label={c.followerRequirement}
                aria-valuemin={0}
                aria-valuemax={10000}
                aria-valuenow={Math.min(r.followers, 10000)}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600"
                  style={{ width: `${Math.min(100, r.followers / 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-[#e8f7ee] p-4 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200 sm:p-5">
          <h2 className="mb-3 text-xs font-bold">{c.breakdown}</h2>
          <div className="space-y-2 text-xs">
            <MoneyRow
              icon={<Percent className="h-4 w-4" />}
              label={c.discountRow}
              value={money(firstPayment)}
            />
            <MoneyRow
              icon={<CircleDollarSign className="h-4 w-4" />}
              label={c.firstRow}
              value={money(firstCommission)}
            />
            <MoneyRow
              icon={<RefreshCw className="h-4 w-4" />}
              label={c.remainingRow}
              value={money(remainingCommission)}
            />
            <div className="border-t border-emerald-700/10 pt-3 font-bold dark:border-emerald-300/10">
              <MoneyRow
                icon={<CircleCheck className="h-4 w-4" />}
                label={c.totalRow}
                value={money(firstCommission + remainingCommission)}
              />
            </div>
          </div>
        </div>
        <p className={`text-[11px] leading-5 ${muted}`}>{c.monthlyOnly}</p>
      </section>
      <section
        className={`${panel} p-4 sm:p-6`}
        aria-labelledby="referral-calculator"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="referral-calculator"
            className="max-w-64 text-lg font-bold tracking-tight sm:text-xl"
          >
            {c.calculator}
          </h2>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {money(signups * Math.round(price * 0.3) * 11)}
            </p>
            <p className={`mt-1 text-[11px] ${muted}`}>{c.estimate}</p>
          </div>
        </div>
        <div className="mt-5">
          <label
            htmlFor="referral-signup-count"
            className={`mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs dark:border-white/10`}
          >
            <input
              id="referral-signup-count"
              type="number"
              min={1}
              max={500}
              value={signups}
              onChange={(e) =>
                setSignups(
                  Math.min(500, Math.max(1, Number(e.target.value) || 1)),
                )
              }
              className="h-8 w-14 bg-transparent text-center text-base font-bold outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
            />
            <span className={muted}>{c.signups}</span>
          </label>
          <input
            aria-label={c.signups}
            type="range"
            min={1}
            max={500}
            value={signups}
            onChange={(e) => setSignups(Number(e.target.value))}
            className="block h-6 w-full cursor-pointer accent-emerald-600"
          />
          <div className={`mt-2 flex justify-between text-[11px] ${muted}`}>
            <span>1</span>
            <span>50</span>
            <span>200</span>
            <span>500</span>
          </div>
        </div>
        <p className={`mt-4 max-w-3xl text-xs leading-5 ${muted}`}>
          {c.estimateNote}
        </p>
      </section>
      <section
        className={`${panel} grid grid-cols-2 items-center gap-x-5 gap-y-5 p-5 sm:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]`}
        aria-label={c.referrals}
      >
        <Stat label={c.clicks} value={number(r.clicks)} />
        <Stat label={c.signups} value={number(r.signups)} />
        <Stat label={c.subscribed} value={number(r.subscribed)} />
        <Stat
          label={c.paid}
          value={money(r.paidCents)}
          color="text-amber-700 dark:text-amber-400"
        />
        <Stat
          label={c.available}
          value={money(r.availableCents)}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <button
          type="button"
          className={button}
          disabled={r.availableCents <= 0}
          onClick={() => setWithdrawOpen(true)}
        >
          {c.withdraw}
        </button>
        {r.reservedCents > 0 ? (
          <p className={`col-span-full text-xs ${muted}`}>
            {c.reserved}: {money(r.reservedCents)}
          </p>
        ) : null}
      </section>
      <section className={`${panel} overflow-hidden`} aria-label={c.source}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[590px] text-left text-xs">
            <thead className="bg-zinc-100/80 text-[10px] uppercase tracking-wider text-zinc-500 dark:bg-white/[0.04] dark:text-zinc-400">
              <tr>
                {[c.source, c.rate, c.subscribed, c.earned, c.status].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-3 font-semibold">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {[
                { key: "LINK" as const, name: c.referralLink, rate: "30%" },
                ...(r.promoCode
                  ? [
                      {
                        key: "PROMO" as const,
                        name: c.promoSource,
                        rate: "10% → 30%",
                      },
                    ]
                  : []),
              ].map((source) => (
                <tr key={source.key}>
                  <td className="px-5 py-4 font-semibold">{source.name}</td>
                  <td className="px-5 py-4">{source.rate}</td>
                  <td className="px-5 py-4">
                    {sourceTotals[source.key].subscribed}
                  </td>
                  <td className="px-5 py-4">
                    {money(sourceTotals[source.key].earnedCents)}
                  </td>
                  <td className={`px-5 py-4 ${muted}`}>
                    {r.signups ? c.tracking : c.waiting}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={`${panel} p-5 sm:p-6`}>
        {r.rows.length ? (
          <>
            <h2 className="text-sm font-semibold">{c.referrals}</h2>
            <div className="mt-3 divide-y divide-zinc-100 dark:divide-white/10">
              {r.rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">
                      {row.name}
                    </p>
                    <p className={`mt-1 text-xs ${muted}`}>
                      {c.joined} {date(row.createdAt)} ·{" "}
                      {row.source === "PROMO" ? c.promoSource : c.referralLink}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {money(row.earnedCents)}
                    </p>
                    <p className={`mt-1 text-[11px] ${muted}`}>{row.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-2 text-center">
            <h2 className="text-sm font-semibold">{c.noReferrals}</h2>
            <p className={`mt-2 text-xs leading-5 ${muted}`}>{c.emptyHint}</p>
          </div>
        )}
      </section>
      {r.withdrawals.length > 0 ? (
        <section className={`${panel} p-5`}>
          <h2 className="text-sm font-semibold">{c.requests}</h2>
          <ul className="mt-3 space-y-3">
            {r.withdrawals.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span className={muted}>{date(item.createdAt)}</span>
                <span>
                  {money(item.amountCents)} · {item.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {dashboard.stats.creditEarnedCents > 0 ||
      dashboard.stats.creditPendingCents > 0 ? (
        <section className={`${panel} p-5`}>
          <h2 className="text-sm font-semibold">{c.legacy}</h2>
          <p className={`mt-2 text-xs leading-5 ${muted}`}>{c.legacyHint}</p>
          <div className="mt-3 flex flex-wrap gap-5 text-xs">
            <span>
              {c.earned}: {money(dashboard.stats.creditEarnedCents)}
            </span>
            <span>
              {c.pending}: {money(dashboard.stats.creditPendingCents)}
            </span>
          </div>
        </section>
      ) : null}
      <details
        className={`group rounded-2xl border border-zinc-200 px-5 py-4 text-xs dark:border-white/10 ${muted}`}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-zinc-700 dark:text-zinc-200">
          {c.rulesTitle}
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <p className="mt-3 leading-6">{c.rules}</p>
      </details>
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white text-zinc-950 dark:bg-zinc-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>{c.withdrawalTitle}</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {c.withdrawalHint}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              run("withdraw", () => requestReferralWithdrawal(paypal));
            }}
          >
            <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {c.available}: {money(r.availableCents)}
            </p>
            <div>
              <label
                htmlFor="referral-paypal-email"
                className="mb-2 block text-xs font-semibold"
              >
                {c.paypal}
              </label>
              <input
                id="referral-paypal-email"
                required
                type="email"
                autoComplete="email"
                maxLength={254}
                value={paypal}
                onChange={(e) => setPaypal(e.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-transparent px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/15"
                placeholder="name@example.com"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                className="min-h-10 rounded-lg px-4 text-xs font-semibold"
                onClick={() => setWithdrawOpen(false)}
              >
                {c.cancel}
              </button>
              <button
                type="submit"
                disabled={pending || r.availableCents <= 0}
                className={button}
              >
                {working === "withdraw" ? c.processing : c.request}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function EligibilityIcon({ ready }: { ready: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ready ? "bg-green-600 text-white" : "border border-zinc-300 bg-white text-zinc-400 dark:border-white/20 dark:bg-zinc-800"}`}
    >
      {ready ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
    </span>
  );
}
function MoneyRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 leading-5">{label}</span>
      <strong className="shrink-0 leading-5">{value}</strong>
    </div>
  );
}
function Stat({
  label,
  value,
  color = "text-zinc-950 dark:text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="min-w-0">
      <p className={`break-words text-xl font-bold tracking-tight ${color}`}>
        {value}
      </p>
      <p className={`mt-1 text-[11px] ${muted}`}>{label}</p>
    </div>
  );
}
