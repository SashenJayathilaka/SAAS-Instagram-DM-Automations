"use client";
import { ManageBillingButton } from "@/components/global/billing/manage-billing-button";
import LocalizedCopy from "@/components/i18n/localized-copy";
import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Instagram,
  MessageCircle,
  Sparkles,
  Zap,
  Link2,
  GitBranch,
  BarChart3,
  Users,
  SlidersHorizontal,
  ShieldCheck,
  Download,
  type LucideIcon,
} from "lucide-react";
import {
  PLAN_CARDS,
  PLAN_COMPARISON,
  checkoutHref,
  type BillingInterval,
  type PaidPlan,
} from "@/lib/billing-plans";
import { getPlanLimits } from "@/lib/plan-limits";
import s from "./public-pricing.module.css";
type Feature = { icon: LucideIcon; text: string };
const freeGroups: { label: string; features: Feature[] }[] = [
  {
    label: "Automation",
    features: [
      { icon: Zap, text: "Keyword and any-comment triggers" },
      { icon: MessageCircle, text: "Public replies and link delivery DMs" },
      { icon: Link2, text: "DM link button" },
      { icon: SlidersHorizontal, text: "Write your own message variations" },
    ],
  },
  {
    label: "Insights",
    features: [
      { icon: Users, text: "Lead tracking" },
      { icon: BarChart3, text: "Automation analytics" },
    ],
  },
];
const proGroups: { label: string; features: Feature[] }[] = [
  {
    label: "Automation",
    features: [
      { icon: Users, text: "Collect email and phone in DMs" },
      { icon: Zap, text: "Ask to follow and conditional follow-ups" },
      { icon: GitBranch, text: "Publish custom canvas flows" },
      { icon: MessageCircle, text: "Unlimited active automations" },
    ],
  },
  {
    label: "AI",
    features: [
      { icon: Sparkles, text: "AI-assisted replies and variations" },
      { icon: SlidersHorizontal, text: "AI tone and custom instructions" },
    ],
  },
  {
    label: "Safety",
    features: [{ icon: ShieldCheck, text: "AI comment protection" }],
  },
  {
    label: "Insights",
    features: [
      { icon: BarChart3, text: "Lead tracking and full analytics" },
      { icon: Download, text: "Export leads" },
    ],
  },
];
const businessGroups: { label: string; features: Feature[] }[] = [
  {
    label: "Automation",
    features: [
      { icon: MessageCircle, text: "Unlimited active automations" },
      { icon: Users, text: "Collect email and phone in DMs" },
      { icon: Zap, text: "Ask to follow and conditional follow-ups" },
      { icon: GitBranch, text: "Publish custom canvas flows" },
    ],
  },
  {
    label: "AI",
    features: [
      { icon: Sparkles, text: "AI-assisted replies and variations" },
      { icon: ShieldCheck, text: "AI comment protection" },
    ],
  },
  {
    label: "Insights",
    features: [{ icon: BarChart3, text: "Lead tracking and full analytics" }],
  },
];
function BillingToggle({
  interval,
  onChange,
  compact = false,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  compact?: boolean;
}) {
  return (
    <LocalizedCopy>
      <div
        className={`${s.toggle} ${compact ? s.compactToggle : ""}`}
        role="group"
        aria-label={
          compact ? "Comparison billing interval" : "Billing interval"
        }
      >
        {(["year", "month"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={interval === value}
            onClick={() => onChange(value)}
          >
            {value === "year" ? "Yearly" : "Monthly"}
          </button>
        ))}
      </div>
    </LocalizedCopy>
  );
}
function monthlyPrice(
  plan: (typeof PLAN_CARDS)[number],
  interval: BillingInterval,
) {
  const amount =
    interval === "year"
      ? (plan.annualPrice ?? 0) / 12
      : (plan.monthlyPrice ?? 0);
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}
export default function PublicPricing({
  paidOnly = false,
  currentPlan,
  existingPaid = false,
  checkoutDisabled = false,
  internalPlanAccess = false,
}: {
  paidOnly?: boolean;
  currentPlan?: string;
  existingPaid?: boolean;
  checkoutDisabled?: boolean;
  internalPlanAccess?: boolean;
}) {
  const [interval, setInterval] = useState<BillingInterval>(
    paidOnly ? "month" : "year",
  );
  return (
    <LocalizedCopy>
      <div className={`${s.pricingSurface} ${paidOnly ? s.modalPricing : ""}`}>
        <div className={s.billing}>
          <BillingToggle interval={interval} onChange={setInterval} />
          <p>
            <strong>Save up to 33%</strong> <span>with yearly billing</span>
          </p>
        </div>
        <div className={s.cards}>
          {PLAN_CARDS.map((plan, index) => {
            if (paidOnly && plan.id === "FREE") return null;
            const free = plan.id === "FREE";
            const limits = getPlanLimits(plan.id);
            const total =
              interval === "year" ? plan.annualPrice! : plan.monthlyPrice!;
            const savings = plan.monthlyPrice! * 12 - plan.annualPrice!;
            return (
              <section
                key={plan.id}
                className={`${s.card} ${plan.featured ? s.featured : ""}`}
                aria-label={`${plan.name} plan`}
              >
                <div className={s.top}>
                  <div className={s.name}>
                    <h2>{plan.name}</h2>
                    {plan.featured ? (
                      <span className={s.popular}>Recommended</span>
                    ) : index === 2 ? (
                      <span className={s.advanced}>Advanced</span>
                    ) : null}
                  </div>
                  <p className={s.description}>
                    {
                      [
                        "Try Instagram automation, free.",
                        "More conversations. More possibilities.",
                        "More capacity for growing brands.",
                      ][index]
                    }
                  </p>
                </div>
                <div className={s.body}>
                  <div className={s.priceBlock}>
                    <div className={s.price} key={interval}>
                      <strong>{monthlyPrice(plan, interval)}</strong>
                      <span>
                        /month
                        {!free && interval === "year" && (
                          <span className={s.intervalNote}>
                            , billed yearly
                          </span>
                        )}
                      </span>
                    </div>
                    <div className={s.billed}>
                      {free ? (
                        <span>Free forever. No card required.</span>
                      ) : (
                        <>
                          <span>
                            {interval === "year"
                              ? `$${total} billed yearly`
                              : `$${total} billed monthly`}
                          </span>
                          {interval === "year" && (
                            <span className={s.saving}>Save ${savings}</span>
                          )}
                        </>
                      )}
                    </div>
                    <p className={s.cancel}>
                      {free ? (
                        <span aria-hidden="true">&nbsp;</span>
                      ) : (
                        "Cancel anytime"
                      )}
                    </p>
                  </div>
                  {currentPlan === plan.id ? (
                    <span className={s.planButton}>Current plan</span>
                  ) : existingPaid ? (
                    <ManageBillingButton />
                  ) : internalPlanAccess ||
                    checkoutDisabled ||
                    (currentPlan && free) ? (
                    <span className={s.planButton}>
                      {internalPlanAccess
                        ? "Included in your access"
                        : checkoutDisabled
                          ? "Billing unavailable"
                          : "Free plan"}
                    </span>
                  ) : (
                    <Link
                      className={`${s.planButton} ${index === 2 ? s.businessButton : ""}`}
                      href={
                        free
                          ? "/sign-up"
                          : checkoutHref(plan.id as PaidPlan, interval)
                      }
                    >
                      {free ? "Start for free" : `Upgrade to ${plan.name}`}
                    </Link>
                  )}
                  <div className={s.features}>
                    <p className={s.included}>
                      {free
                        ? "Free plan includes"
                        : index === 1
                          ? "Everything in Free, plus"
                          : "Everything in Pro, plus"}
                    </p>
                    <ul>
                      <li>
                        <MessageCircle />
                        <span>
                          <strong>
                            {plan.replyLimit.toLocaleString("en-US")}
                          </strong>{" "}
                          <span>automated actions / month</span>
                        </span>
                      </li>
                      <li>
                        <Instagram />
                        <span>
                          <strong>{limits.connectedInstagramAccounts}</strong>{" "}
                          <span>
                            {free ? "Instagram account" : "Instagram accounts"}
                          </span>
                        </span>
                      </li>
                      {free ? (
                        <li>
                          <Zap />
                          <span>5 active automations</span>
                        </li>
                      ) : (
                        <li>
                          <Sparkles />
                          <span>
                            <strong>
                              {Number(limits.aiRepliesPerMonth).toLocaleString(
                                "en-US",
                              )}
                            </strong>{" "}
                            <span>AI replies / month</span>
                          </span>
                        </li>
                      )}
                    </ul>
                    {[freeGroups, proGroups, businessGroups][index].map(
                      (group) => (
                        <div className={s.featureGroup} key={group.label}>
                          <p className={s.groupLabel}>{group.label}</p>
                          <ul>
                            {group.features.map(({ icon: Icon, text }) => (
                              <li key={text}>
                                <Icon />
                                <span>{text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        <p className={s.usage}>
          One successful public reply or DM is one automated action. A public reply
          followed by a DM uses two actions. Usage resets monthly on every billing interval.
        </p>
        {!paidOnly && (
          <section
            className={s.comparison}
            aria-labelledby="plan-comparison-title"
          >
            <p className={s.scrollHint}>Swipe to compare all plans</p>
            <div
              className={s.tableWrap}
              tabIndex={0}
              role="region"
              aria-label="Plan comparison, scroll horizontally on small screens"
            >
              <table className={s.table}>
                <thead>
                  <tr>
                    <th scope="col">
                      <h2 id="plan-comparison-title">
                        Compare plans &amp; features
                      </h2>
                      <BillingToggle
                        interval={interval}
                        onChange={setInterval}
                        compact
                      />
                    </th>
                    {PLAN_CARDS.map((plan) => (
                      <th scope="col" key={plan.id}>
                        <div className={s.tablePlan}>
                          <span>{plan.name}</span>
                          <strong key={interval}>
                            {monthlyPrice(plan, interval)}
                          </strong>
                          <small>
                            {plan.id === "FREE"
                              ? "Free forever"
                              : interval === "year"
                                ? `$${plan.annualPrice} billed yearly`
                                : "billed monthly"}
                          </small>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLAN_COMPARISON.filter(
                    (row) =>
                      ![
                        "Monthly price",
                        "Annual price",
                        "Annual savings",
                      ].includes(row.feature),
                  ).map((row) => (
                    <tr key={row.feature}>
                      <th scope="row">{row.feature}</th>
                      {[row.free, row.pro, row.business].map((value, i) => (
                        <td key={i}>
                          {value === "Included" ? (
                            <>
                              <Check aria-hidden="true" className={s.check} />
                              <span className="sr-only">Included</span>
                            </>
                          ) : value === "Not included" ? (
                            <>
                              <span aria-hidden="true">—</span>
                              <span className="sr-only">Not included</span>
                            </>
                          ) : (
                            value
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </LocalizedCopy>
  );
}
