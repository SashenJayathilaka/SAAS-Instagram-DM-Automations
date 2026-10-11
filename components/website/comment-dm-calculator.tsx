"use client";

import { useMemo, useState } from "react";

const fields = [
  ["Monthly qualifying comments", "comments", 500],
  ["DM delivery rate (%)", "delivery", 90],
  ["Destination visit rate (%)", "visit", 35],
  ["Conversion rate after visit (%)", "conversion", 5],
  ["Average conversion value ($)", "value", 40],
] as const;

export default function CommentDmCalculator() {
  const [values, setValues] = useState({ comments: 500, delivery: 90, visit: 35, conversion: 5, value: 40 });
  const result = useMemo(() => {
    const delivered = values.comments * values.delivery / 100;
    const visits = delivered * values.visit / 100;
    const conversions = visits * values.conversion / 100;
    return { delivered, visits, conversions, value: conversions * values.value };
  }, [values]);
  const format = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return <div className="grid gap-6 lg:grid-cols-[1fr_.9fr]">
    <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
      <h2 className="text-xl font-black">Assumptions</h2>
      <div className="mt-5 grid gap-4">
        {fields.map(([label, key, max]) => <label key={key} className="grid gap-2 text-sm font-bold">
          <span>{label}</span>
          <input type="number" min="0" max={key === "comments" || key === "value" ? undefined : max} step={key === "comments" ? 1 : 0.1} value={values[key]} onChange={event => {
            const next = Math.max(0, Number(event.target.value) || 0);
            setValues(current => ({ ...current, [key]: key === "comments" || key === "value" ? next : Math.min(max, next) }));
          }} className="ap3k-input rounded-xl px-3 py-2.5 tabular-nums" />
        </label>)}
      </div>
    </div>
    <div className="rounded-3xl bg-gradient-to-br from-violet-700 to-fuchsia-600 p-6 text-white shadow-xl sm:p-8">
      <h2 className="text-xl font-black">Projected monthly funnel</h2>
      <dl className="mt-6 grid gap-4">
        {[ ["Delivered DMs", format.format(result.delivered)], ["Destination visits", format.format(result.visits)], ["Conversions", format.format(result.conversions)], ["Estimated value", money.format(result.value)] ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4"><dt className="text-xs font-bold uppercase tracking-[0.12em] text-white/65">{label}</dt><dd className="mt-1 text-3xl font-black tabular-nums">{value}</dd></div>)}
      </dl>
      <p className="mt-6 text-xs leading-6 text-white/70">This is a planning model, not a forecast or guarantee. Replace every assumption with measured campaign data. An API-accepted DM is not proof that the recipient read it.</p>
    </div>
  </div>;
}
