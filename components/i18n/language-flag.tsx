import type { Locale } from "@/lib/i18n/config";

// Vector flags render consistently on Windows, which displays flag emoji as letters.
export default function LanguageFlag({ locale }: { locale: Locale }) {
  return <svg viewBox="0 0 30 20" width="24" height="16" aria-hidden="true" focusable="false" className="shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10">
    {locale === "en" && <>
      <path fill="#012169" d="M0 0h30v20H0z" />
      <path stroke="#fff" strokeWidth="4" d="m0 0 30 20M30 0 0 20" />
      <path stroke="#c8102e" strokeWidth="1.5" d="m0 0 30 20M30 0 0 20" />
      <path stroke="#fff" strokeWidth="7" d="M15 0v20M0 10h30" />
      <path stroke="#c8102e" strokeWidth="4" d="M15 0v20M0 10h30" />
    </>}
    {locale === "fr" && <><path fill="#fff" d="M0 0h30v20H0z" /><path fill="#002654" d="M0 0h10v20H0z" /><path fill="#ed2939" d="M20 0h10v20H20z" /></>}
    {locale === "es" && <><path fill="#aa151b" d="M0 0h30v20H0z" /><path fill="#f1bf00" d="M0 5h30v10H0z" /><path fill="#aa151b" stroke="#fff" strokeWidth=".5" d="M8 8h4v4a2 2 0 0 1-4 0z" /><path fill="#aa151b" d="M8 6h4v1H8z" /></>}
    {locale === "de" && <><path fill="#000" d="M0 0h30v20H0z" /><path fill="#d00" d="M0 6.667h30v6.667H0z" /><path fill="#ffce00" d="M0 13.333h30V20H0z" /></>}
    {locale === "pt" && <><path fill="#f00" d="M0 0h30v20H0z" /><path fill="#060" d="M0 0h12v20H0z" /><circle cx="12" cy="10" r="4" fill="none" stroke="#ff0" strokeWidth="1" /><path fill="#fff" stroke="#f00" strokeWidth="1" d="M10 7h4v5q-2 3-4 0z" /><path fill="#039" d="M11 8h2v3h-2z" /></>}
  </svg>;
}
