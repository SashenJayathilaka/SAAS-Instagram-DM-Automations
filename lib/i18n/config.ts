import importedArticleSlugs from "../content/imported-blog/slugs.json";
import editorialSlugs from "../content/editorial-october-slugs.json";
import expansionSlugs from "../content/expansion/slugs.json";
import commercialSlugs from "../content/expansion/commercial-slugs.json";
import englishArticleSlugs from "../content/comment-dm/slugs.json";

const englishArticles = new Set([
  "/blog/ap3k-free-vs-pro-vs-business",
  "/blog/pause-restart-instagram-automations",
  "/blog/ap3k-ai-offers-policies-faq-template",
  "/blog/instagram-next-post-automation",
  "/blog/instagram-automation-link-tracking",
  "/blog/manychat-vs-ap3k-pricing-for-instagram",
  ...importedArticleSlugs.map(slug => `/blog/${slug}`),
  ...editorialSlugs.map((slug) => `/blog/${slug}`),
  ...expansionSlugs.map((slug) => `/blog/${slug}`),
  ...commercialSlugs.map((slug) => `/${slug}`),
  "/resources/instagram-growth-library",
  ...englishArticleSlugs.map((slug) => `/blog/${slug}`),
  "/resources",
  "/resources/instagram-comment-to-dm-templates",
  "/resources/instagram-comment-to-dm-launch-kit",
  "/resources/instagram-comment-automation-checklist",
  "/tools/instagram-comment-to-dm-calculator",
  "/blog/ap3k-workspace-visual-guide",
  "/blog/create-ap3k-automation-visual-guide",
  "/blog/set-up-ap3k-ai-visual-guide",
  "/blog/connect-instagram-to-ap3k",
  "/blog/instagram-post-scheduler-vs-instagram-automation",
  "/blog/instagram-auto-responder-quick-reply-guide",
  "/blog/instagram-lead-generation-comments-dms-vs-lead-ads",
  "/help/workspace-tour",
  "/help/automation-types",
]);
export function isEnglishOnlyArticle(pathname: string): boolean {
  const path = stripLocaleFromPath(pathname.split(/[?#]/)[0]).replace(
    /\/$/,
    "",
  );
  return (
    /^\/(compare|solutions|docs|tutorials)(\/|$)/.test(path) ||
    path === "/manychat-alternative" ||
    path === "/about" ||
    englishArticles.has(path)
  );
}

export const SUPPORTED_LOCALES = ["en", "fr", "es", "de", "nl", "pt"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Locales with complete application, article, help and policy catalogs. */
export const FULLY_TRANSLATED_LOCALES = ["en", "fr", "es", "de", "pt"] as const satisfies readonly Locale[];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ap3k_locale";

export const LOCALE_DETAILS: Record<
  Locale,
  {
    nativeName: string;
    htmlLang: string;
    direction: "ltr" | "rtl";
    openGraph: string;
  }
> = {
  en: {
    nativeName: "English",
    htmlLang: "en",
    direction: "ltr",
    openGraph: "en_US",
  },
  fr: {
    nativeName: "Français",
    htmlLang: "fr",
    direction: "ltr",
    openGraph: "fr_FR",
  },
  es: {
    nativeName: "Español",
    htmlLang: "es",
    direction: "ltr",
    openGraph: "es_ES",
  },
  de: {
    nativeName: "Deutsch",
    htmlLang: "de",
    direction: "ltr",
    openGraph: "de_DE",
  },
  nl: {
    nativeName: "Nederlands",
    htmlLang: "nl",
    direction: "ltr",
    openGraph: "nl_NL",
  },
  pt: {
    nativeName: "Português",
    htmlLang: "pt",
    direction: "ltr",
    openGraph: "pt_PT",
  },
};

// Keep translation source columns explicit so locale changes cannot shift copy.
export const LOCALE_SOURCE_COLUMN: Record<Locale, number> = {
  en: 0,
  fr: 1,
  es: 2,
  de: 3,
  // Large product catalogs fall back to their reviewed English source until a
  // Dutch entry is supplied. The public homepage has dedicated Dutch copy.
  nl: 0,
  pt: 4,
};

export function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  const language = value.toLowerCase().split(/[-_]/)[0];
  return isLocale(language) ? language : DEFAULT_LOCALE;
}

/** Locale prefixes that were previously public and now permanently resolve to English. */
export const RETIRED_LOCALES = ["ar"] as const;

export function retiredLocaleFromPath(
  pathname: string,
): (typeof RETIRED_LOCALES)[number] | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return RETIRED_LOCALES.includes(
    firstSegment as (typeof RETIRED_LOCALES)[number],
  )
    ? (firstSegment as (typeof RETIRED_LOCALES)[number])
    : null;
}

export function stripRetiredLocaleFromPath(pathname: string): string {
  const locale = retiredLocaleFromPath(pathname);
  if (!locale) return pathname || "/";
  return pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "/";
}

export function localeFromPath(pathname: string): Locale | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return isLocale(firstSegment) ? firstSegment : null;
}

export function stripLocaleFromPath(pathname: string): string {
  const locale = localeFromPath(pathname);
  if (!locale) return pathname || "/";
  const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
  return stripped || "/";
}

export function localizePublicPath(pathname: string, locale: Locale): string {
  const suffixIndex = pathname.search(/[?#]/);
  const path = suffixIndex === -1 ? pathname : pathname.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : pathname.slice(suffixIndex);
  const cleanPath = stripLocaleFromPath(stripRetiredLocaleFromPath(path));
  if (
    locale === DEFAULT_LOCALE ||
    isProtectedPath(cleanPath) ||
    !localizedLocalesForPath(cleanPath).includes(locale)
  )
    return cleanPath + suffix;
  return (cleanPath === "/" ? `/${locale}` : `/${locale}${cleanPath}`) + suffix;
}

/**
 * Dutch launches on AP3K's reviewed acquisition pages first. This prevents
 * search engines from indexing fallback-English articles under Dutch URLs.
 */
export function localizedLocalesForPath(pathname: string): readonly Locale[] {
  const cleanPath = stripLocaleFromPath(stripRetiredLocaleFromPath(pathname.split(/[?#]/)[0])).replace(/\/$/, "") || "/";
  if (isEnglishOnlyArticle(cleanPath)) return ["en"];
  if (cleanPath === "/" || cleanPath === "/pricing") return SUPPORTED_LOCALES;
  return FULLY_TRANSLATED_LOCALES;
}

export function isProtectedPath(pathname: string): boolean {
  const cleanPath = stripLocaleFromPath(stripRetiredLocaleFromPath(pathname));
  return /^(?:\/dashboard|\/onboarding|\/admin|\/ap3k-admin(?:-v2)?|\/api|\/callback|\/payment|\/account-deletion-preview|\/r)(?:\/|$)/.test(
    cleanPath,
  );
}

// Public URLs are authoritative. A stale locale cookie must never override them.
// Callbacks, payments and APIs must never acquire a language prefix.
export function resolveRequestLocale(
  pathname: string,
  cookie?: string,
): Locale {
  if (isEnglishOnlyArticle(pathname)) return DEFAULT_LOCALE;
  return (
    localeFromPath(pathname) ??
    (isProtectedPath(pathname) ? normalizeLocale(cookie) : DEFAULT_LOCALE)
  );
}

export function localeAlternates(pathname = "/") {
  const locales = localizedLocalesForPath(pathname);
  if (locales.length === 1) {
    const path = localizePublicPath(pathname, "en");
    return { en: path, "x-default": path };
  }
  return {
    ...Object.fromEntries(
      locales.map((locale) => [
        LOCALE_DETAILS[locale].htmlLang,
        localizePublicPath(pathname, locale),
      ]),
    ),
    "x-default": localizePublicPath(pathname, DEFAULT_LOCALE),
  };
}

/** Negotiate browser preferences, including regional tags and quality weights. */
export function browserLocale(header: string | null | undefined): Locale {
  const choices = (header || "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const quality = params.find((value) => value.trim().startsWith("q="));
      const q = quality ? Number(quality.trim().slice(2)) : 1;
      return { language: tag.toLowerCase().split(/[-_]/)[0], q, index };
    })
    .filter((item) => Number.isFinite(item.q) && item.q > 0 && item.q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return (
    (choices.find((item) => isLocale(item.language))?.language as Locale) ||
    DEFAULT_LOCALE
  );
}
