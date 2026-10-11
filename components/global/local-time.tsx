"use client";

import { useI18n } from "@/providers/i18n-provider";
import { translateUi } from "@/lib/i18n/translate";
import { useTimeZone } from "@/providers/time-zone-provider";
import { useEffect, useState } from "react";

type Props = {
  value?: Date | string | null;
  empty?: string;
  mode?: "dateTime" | "time" | "date";
  prefix?: string;
};

const FORMAT_OPTIONS: Record<NonNullable<Props["mode"]>, Intl.DateTimeFormatOptions> = {
  dateTime: {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  time: {
    hour: "2-digit",
    minute: "2-digit",
  },
  date: {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
};

export default function LocalTime({ value, empty = "None yet", mode = "dateTime", prefix }: Props) {
  const { locale } = useI18n();
  const { timeZone } = useTimeZone();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const date = value ? new Date(value) : null;
  const valid = date && !Number.isNaN(date.getTime());
  const label = mounted && valid ? date.toLocaleString(locale, { ...FORMAT_OPTIONS[mode], timeZone }) : translateUi(empty, locale);

  return (
    <time dateTime={valid ? date.toISOString() : undefined} suppressHydrationWarning>
      {prefix && mounted && valid ? `${translateUi(prefix, locale)} ` : ""}
      <bdi>{label}</bdi>
    </time>
  );
}
