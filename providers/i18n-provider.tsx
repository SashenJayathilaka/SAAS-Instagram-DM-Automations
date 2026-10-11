"use client";

import { createContext, useContext, useMemo, useEffect, useState, type ReactNode } from "react";
import { LOCALE_COOKIE, LOCALE_DETAILS, isProtectedPath, resolveRequestLocale, type Locale } from "@/lib/i18n/config";
import { usePathname } from "next/navigation";
import { MESSAGES, type MessageKey } from "@/lib/i18n/messages";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [activeLocale, setLocale] = useState(locale);
  const pathname = usePathname();
  useEffect(() => setLocale(locale), [locale]);
  // Next preserves root layouts across navigation, including Back/Forward.
  // The visible public URL, not a cached layout prop or old cookie, is authoritative.
  useEffect(() => {
    const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))?.split("=")[1];
    const nextLocale = resolveRequestLocale(pathname, cookie);
    setLocale(nextLocale);
    // Persist actual visits and history changes, never speculative prefetches.
    if (!isProtectedPath(pathname)) {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${LOCALE_COOKIE}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    }
  }, [pathname]);
  useEffect(() => {
    document.documentElement.lang = LOCALE_DETAILS[activeLocale].htmlLang;
    document.documentElement.dir = LOCALE_DETAILS[activeLocale].direction;
  }, [activeLocale]);
  const value = useMemo<I18nContextValue>(
    () => ({ locale: activeLocale, setLocale, t: (key) => MESSAGES[activeLocale][key] }),
    [activeLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
