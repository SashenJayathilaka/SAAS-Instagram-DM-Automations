import type { Metadata } from "next";
import { LOCALE_DETAILS, isEnglishOnlyArticle, localeAlternates, localizePublicPath, type Locale } from "./config";
import { getServerLocale } from "./server";
import { translateUi } from "./translate";

/** Every translated document canonicals to itself and links its language peers. */
export function localizedMetadata(source: Metadata, path: string, contentLocale?: Locale): Metadata {
  const locale = contentLocale ?? (isEnglishOnlyArticle(path) ? "en" : getServerLocale());
  const tr = (text: unknown): unknown => {
    if (typeof text !== "string") return text;
    const translated = translateUi(text, locale);
    if (translated !== text) return translated;
    const branded = text.match(/^(.*?)(\s+[|—]\s+AP3K)$/);
    return branded ? `${translateUi(branded[1], locale)}${branded[2]}` : text;
  };
  const title = tr(source.title) as Metadata["title"];
  const description = tr(source.description) as string | undefined;
  const url = `https://ap3k.com${localizePublicPath(path, locale)}`;
  const social = source.openGraph || {};
  return {
    ...source, title, description,
    keywords: Array.isArray(source.keywords) ? source.keywords.map(value => translateUi(value, locale)) : source.keywords,
    alternates: { canonical: url, languages: Object.fromEntries(Object.entries(localeAlternates(path)).map(([key, value]) => [key, `https://ap3k.com${value}`])) },
    openGraph: { ...social, title: tr(social.title || source.title) as string, description: tr(social.description || description) as string, url, locale: LOCALE_DETAILS[locale].openGraph },
    twitter: { ...source.twitter, card: "summary_large_image", title: tr(source.twitter?.title || source.title) as string, description: tr(source.twitter?.description || description) as string },
  };
}
