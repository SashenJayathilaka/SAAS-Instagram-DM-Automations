import { cookies, headers, type UnsafeUnwrappedCookies, type UnsafeUnwrappedHeaders } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale, type Locale } from "./config";
import { MESSAGES, type MessageKey } from "./messages";

export function getServerLocale(): Locale {
  const requestLocale = (headers() as unknown as UnsafeUnwrappedHeaders).get("x-ap3k-locale");
  if (requestLocale) return normalizeLocale(requestLocale);
  return normalizeLocale((cookies() as unknown as UnsafeUnwrappedCookies).get(LOCALE_COOKIE)?.value || DEFAULT_LOCALE);
}

export function getServerMessages() {
  const locale = getServerLocale();
  return { locale, messages: MESSAGES[locale], t: (key: MessageKey) => MESSAGES[locale][key] };
}
