import type { Locale } from "./config";
import { translateUi } from "./translate";

// Accept only numeric UI metrics produced by the server, never account names.
export function formatMetricValue(value: string | number, locale: Locale) {
  const source = String(value);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const token = "[+-]?[0-9][0-9,]*(?:\\.[0-9]+)?";
  if (new RegExp(`^${token}$`).test(source)) return { numeric: true, text: number.format(Number(source.replaceAll(",", ""))) };
  if (new RegExp(`^${token}%$`).test(source)) {
    return { numeric: true, text: new Intl.NumberFormat(locale, {
      style: "percent", maximumFractionDigits: 2, signDisplay: source.startsWith("+") ? "always" : "auto",
    }).format(Number(source.slice(0, -1).replaceAll(",", "")) / 100) };
  }
  if (new RegExp(`^${token} / (?:${token}|∞)$`).test(source)) {
    return { numeric: true, text: source.split(" / ").map(part => part === "∞" ? part : number.format(Number(part.replaceAll(",", "")))).join(" / ") };
  }
  return { numeric: false, text: translateUi(source, locale) };
}

export function formatDashboardPeriod(period: string, start: Date | undefined, end: Date | undefined, locale: Locale) {
  if (period === "month" && start && end) {
    const formatter = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    // Month ranges are [start, end): show the final included day.
    return formatter.formatRange(new Date(start), new Date(Math.max(new Date(start).getTime(), new Date(end).getTime() - 1)));
  }
  return translateUi(({ "24h": "Last 24h", "7d": "Last 7d", "30d": "Last 30d" } as Record<string, string>)[period] ?? "This month", locale);
}
