"use client";

import { Fragment, type ReactNode } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { translateUi } from "@/lib/i18n/translate";
import { formatMetricValue, formatDashboardPeriod } from "@/lib/i18n/format";

// Placeholders remain separate React nodes: user content is never translated.
export function UiMessage({ source, values }: { source: string; values: Record<string, ReactNode> }) {
  const { locale } = useI18n();
  return <>{translateUi(source, locale).split(/(\{\w+\})/).map((part, index) =>
    <Fragment key={index}>{/^\{\w+\}$/.test(part) ? values[part.slice(1, -1)] : part}</Fragment>
  )}</>;
}

export function MetricValue({ value }: { value: string | number }) {
  const { locale } = useI18n();
  const formatted = formatMetricValue(value, locale);
  return <bdi dir={formatted.numeric ? "ltr" : "auto"} className="tabular-nums">{formatted.text}</bdi>;
}

export function DashboardPeriodLabel({ period, start, end }: { period: string; start?: Date; end?: Date }) {
  const { locale } = useI18n();
  return <bdi>{formatDashboardPeriod(period, start, end, locale)}</bdi>;
}

export function FollowerSubtitle({ fallback, count, percent }: { fallback: string; count?: number | null; percent?: number | null }) {
  const { locale } = useI18n();
  if (typeof count !== "number") return <>{translateUi(fallback, locale)}</>;
  const number = new Intl.NumberFormat(locale, { signDisplay: "always" });
  const percentage = new Intl.NumberFormat(locale, { style: "percent", signDisplay: "always", maximumFractionDigits: 2 });
  return <UiMessage source="{count} followers{percent} since last snapshot" values={{
    count: <bdi dir="ltr">{number.format(count)}</bdi>,
    percent: typeof percent === "number" ? <> · <bdi dir="ltr">{percentage.format(percent / 100)}</bdi></> : "",
  }} />;
}
