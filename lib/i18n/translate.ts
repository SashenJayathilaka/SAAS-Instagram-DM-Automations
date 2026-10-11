import { PRODUCT_AUDIT_COPY } from "./product-audit-copy";
import { SEO_PUBLIC_COPY } from "./seo-public-copy";
import { MARKETING_PRIVACY_COPY } from "./marketing-privacy-copy";
import { ENGAGEMENT_COPY } from "./engagement-copy";
import { PUBLIC_REDESIGN_COPY } from "./public-redesign-copy";
import { AUTOMATION_COPY_CONTROLS } from "./automation-copy-controls";
import { AUTOMATION_EDITOR_COPY } from "./automation-editor-copy";
import { DESIGN_COPY } from "./design-copy";
import { HELP_COPY } from "./help-copy";
import EDITORIAL_COPY from "./editorial-copy.json";
import { AUTOMATION_DEFAULT_COPY } from "./automation-default-copy";
import { ACCOUNT_PLAN_COPY } from "./account-plan-copy";
import { COMPANY_TRANSLATIONS } from "./company-copy";
import { EXTENDED_COPY } from "./extended-copy";
import { GROWTH_COPY } from "./growth-copy";
import { REMAINING_COPY } from "./remaining-copy";
import { SETUP_COPY } from "./setup-copy";
import { MESSAGES } from "./messages";
import { PHRASE_TRANSLATIONS } from "./phrase-translations";
import { DASHBOARD_COPY } from "./dashboard-copy";
import { PUBLIC_COPY } from "./public-copy";
import type { Locale } from "./config";

const catalogs = Object.fromEntries(
  Object.entries(MESSAGES).map(([locale, messages]) => [
    locale,
    {
      ...EXTENDED_COPY[locale as Locale],
      ...SEO_PUBLIC_COPY[locale as Locale],
      ...Object.fromEntries(
        Object.entries(MESSAGES.en).map(([key, source]) => [
          source,
          messages[key as keyof typeof messages],
        ]),
      ),
      ...PHRASE_TRANSLATIONS[locale as Locale],
      ...PUBLIC_COPY[locale as Locale],
      ...PUBLIC_REDESIGN_COPY[locale as Locale],
      ...DASHBOARD_COPY[locale as Locale],
      ...SETUP_COPY[locale as Locale],
      ...REMAINING_COPY[locale as Locale],
      ...GROWTH_COPY[locale as Locale],
      ...COMPANY_TRANSLATIONS[locale as Locale],
      ...MARKETING_PRIVACY_COPY[locale as Locale],
      ...ACCOUNT_PLAN_COPY[locale as Locale],
      ...AUTOMATION_DEFAULT_COPY[locale as Locale],
      ...HELP_COPY[locale as Locale],
      ...DESIGN_COPY[locale as Locale],
      ...AUTOMATION_EDITOR_COPY[locale as Locale],
      ...ENGAGEMENT_COPY[locale as Locale],
      ...AUTOMATION_COPY_CONTROLS[locale as Locale],
      ...PRODUCT_AUDIT_COPY[locale as Locale],
      // Reviewed wording overrides legacy machine translations and older phrase catalogs.
      ...(EDITORIAL_COPY as Partial<Record<Locale, Record<string, string>>>)[
        locale as Locale
      ],
    },
  ]),
) as Record<Locale, Record<string, string>>;

export function translateUi(source: string, locale: Locale): string {
  if (locale === "en") return source;
  const key = source.replace(/\s+/g, " ").trim();
  const translated = catalogs[locale][key];
  if (!translated) return source;
  return `${source.match(/^\s*/)?.[0] ?? ""}${translated}${source.match(/\s*$/)?.[0] ?? ""}`;
}

export function hasUiTranslation(source: string, locale: Locale): boolean {
  return (
    locale === "en" ||
    Object.prototype.hasOwnProperty.call(
      catalogs[locale],
      source.replace(/\s+/g, " ").trim(),
    )
  );
}
