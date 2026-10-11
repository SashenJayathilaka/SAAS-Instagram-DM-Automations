"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Inter } from "next/font/google";
import Link from "next/link";
import AP3KLogo from "@/components/global/ap3k-logo";
import LanguageSwitcher from "@/components/global/language-switcher";
import ThemeToggle from "@/components/global/theme-toggle";
import { localizePublicPath } from "@/lib/i18n/config";
import { useI18n } from "@/providers/i18n-provider";
import { HOME_SHOWCASE_COPY } from "@/lib/i18n/home-showcase";
import styles from "./website-nav.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
type Props = { current?: "home" | "pricing" | "blog" | "contact" | "privacy" | "terms" | "data-deletion" };

export default function WebsiteNav({ current }: Props) {
  const { locale, t } = useI18n();
  const copy = HOME_SHOWCASE_COPY[locale];
  const href = (path: string) => localizePublicPath(path, locale);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!nav.current?.contains(target) && !target.closest('[role="menu"]')) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  const links = <>
    <Link href={href("/pricing")} aria-current={current === "pricing" ? "page" : undefined} onClick={() => setOpen(false)}>{t("pricing")}</Link>
    <Link href={href("/sign-in")} onClick={() => setOpen(false)}>{copy.login}</Link>
    <div className={styles.actions}>
      <Link href={href("/sign-up")} className={styles.join} onClick={() => setOpen(false)}>{copy.join}</Link>
      <ThemeToggle compact className={styles.theme} />
    </div>
  </>;

  return <div className={styles.space}>
    <nav ref={nav} aria-label={t("openNavigation")} className={`${styles.nav} ${inter.className}`} data-open={open}>
      <div className={styles.row}>
        <div className={styles.brand}>
          <Link href={href("/")} aria-label={`AP3K ${t("home")}`} onClick={() => setOpen(false)}>
            <AP3KLogo className="gap-2 text-xl text-slate-950 dark:text-white" markClassName="h-6 w-6 rounded-lg shadow-none ring-0 [&>svg]:p-1" />
          </Link>
          <div className={styles.language}><LanguageSwitcher textOnly /></div>
        </div>
        <div className={styles.links}>{links}</div>
        <button ref={toggle} type="button" className={styles.toggle} aria-label={t("openNavigation")} aria-expanded={open} aria-controls="public-mobile-navigation" onClick={() => setOpen(!open)}>
          <svg aria-hidden="true" width="16" height="14" viewBox="0 0 16 14" fill="none"><path d={open ? "M3 2 13 12M13 2 3 12" : "M1 3h14M1 11h14"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div id="public-mobile-navigation" className={styles.mobile} hidden={!open}>
        {links}
      </div>
    </nav>
  </div>;
}
