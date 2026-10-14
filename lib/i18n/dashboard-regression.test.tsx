import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FULLY_TRANSLATED_LOCALES, SUPPORTED_LOCALES, type Locale } from "./config";
import { DASHBOARD_ROWS } from "./dashboard-copy";
import { translateUi } from "./translate";
import { formatDashboardPeriod, formatMetricValue } from "./format";
import LanguageFlag from "@/components/i18n/language-flag";
import { MetricValue, FollowerSubtitle, UiMessage } from "@/components/i18n/dashboard-values";
import AutomationTable from "@/components/dashboard/automation-table";

let activeLocale: Locale = "en";
vi.mock("@/providers/i18n-provider", () => ({ useI18n: () => ({ locale: activeLocale }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/actions/automation", () => ({ activateAutomation: vi.fn(), deleteAutomation: vi.fn(), duplicateAutomation: vi.fn() }));
vi.mock("@/lib/app-review-mode", () => ({ isAppReviewMode: () => true }));
vi.mock("@/lib/messaging-review-mode", () => ({ isMessagingReviewMode: () => true }));

const automation = {
  id: "test-only", name: "Save", active: true, currentAccountLabel: "@boudofi",
  source: "COMMENT", triggerMode: "KEYWORD", keywords: [{ word: "Hello こんにちは" }],
  posts: [{ postid: "ANY" }], listener: { commentReply: "Customer-written reply", prompt: "Private user DM" },
  metrics: { runs: 14764, leads: 12623 },
};

describe("dashboard screenshot regressions", () => {
  it("renders real vector flags without relying on operating-system emoji fonts", () => {
    const flags = SUPPORTED_LOCALES.map(locale => renderToStaticMarkup(<LanguageFlag locale={locale} />));
    expect(new Set(flags).size).toBe(SUPPORTED_LOCALES.length);
    for (const flag of flags) {
      expect(flag).toContain('<svg');
      expect(flag).toContain('<path');
      expect(flag).not.toMatch(/\uD83C[\uDDE6-\uDDFF]/);
    }
  });
  it("localizes actual automation rows and preserves user names and keywords in every language", () => {
    let english = "";
    for (const locale of [...FULLY_TRANSLATED_LOCALES, "en"] as Locale[]) {
      activeLocale = locale;
      const markup = renderToStaticMarkup(<AutomationTable slug="fixture" automations={[automation]} showControls={false} />);
      expect(markup).toContain('<bdi dir="auto">Save</bdi>');
      expect(markup).toContain('<bdi dir="auto">Hello こんにちは</bdi>');
      expect(markup).toContain('<bdi dir="ltr">@boudofi</bdi>');
      expect(markup).not.toContain("Private user DM");
      expect(markup).toContain(translateUi("Comment reply + DM active", locale));
      expect(markup).toContain(translateUi("Both", locale));
      expect(markup).toContain(translateUi("Enabled", locale));
      if (locale !== "en") expect(markup).not.toContain("Comment reply + DM active");
      if (locale === "en") {
        if (english) expect(markup).toBe(english);
        english = markup;
      }
    }
  });
  it("keeps usage counts and signed percentages isolated", () => {
    activeLocale = "fr";
    const usage = renderToStaticMarkup(<MetricValue value="4,123 / 20,000" />);
    expect(usage).toContain('dir="ltr"');
    expect(usage).toContain('4 123 / 20 000');
    expect(formatMetricValue("+4808%", "fr").numeric).toBe(true);
    expect(formatMetricValue("20,000 / ∞", "fr").text).toBe("20 000 / ∞");
    expect(formatMetricValue("312,642", "de").text).toBe("312.642");
  });
  it("formats the inclusive month range in the selected language without ICU day fragments", () => {
    const start = new Date("2026-09-01T00:00:00Z"), end = new Date("2026-10-01T00:00:00Z");
    for (const locale of FULLY_TRANSLATED_LOCALES) {
      const range = formatDashboardPeriod("month", start, end, locale);
      expect(range).not.toContain("day:");
      expect(range).toBe(new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).formatRange(start, new Date("2026-09-30T00:00:00Z")));
    }
    expect(() => formatDashboardPeriod("month", new Date("2026-11-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z"), "en")).not.toThrow();
    expect(formatDashboardPeriod("7d", undefined, undefined, "fr")).toBe("7 derniers jours");
  });
  it("translates growth sentences while isolating numeric substitutions", () => {
    for (const locale of FULLY_TRANSLATED_LOCALES) {
      activeLocale = locale;
      const markup = renderToStaticMarkup(<FollowerSubtitle fallback="Unused" count={961} percent={0} />);
      expect(markup).toContain('dir="ltr"');
      expect(markup).not.toContain("{count}");
      if (locale !== "en") expect(markup).not.toContain("since last snapshot");
    }
    activeLocale = "fr";
    expect(renderToStaticMarkup(<UiMessage source="Open {name}" values={{ name: "Save" }} />)).toBe("Ouvrir Save");
  });
  it("has complete dashboard phrases and preserves all interpolation tokens", () => {
    expect(new Set(DASHBOARD_ROWS.map(row => row[0])).size).toBe(DASHBOARD_ROWS.length);
    for (const row of DASHBOARD_ROWS) for (const value of row) {
      expect(value.trim()).not.toBe("");
      expect((value.match(/\{\w+\}/g) ?? []).sort()).toEqual((row[0].match(/\{\w+\}/g) ?? []).sort());
    }
  });
});
