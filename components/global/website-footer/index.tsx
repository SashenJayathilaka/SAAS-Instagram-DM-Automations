"use client";
import { usePublicUi } from "@/components/i18n/use-public-ui";

import AP3KLogo from "@/components/global/ap3k-logo";
import CookiePreferencesButton from "@/components/global/cookie-preferences-button";
import { localizePublicPath } from "@/lib/i18n/config";
import { useI18n } from "@/providers/i18n-provider";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import Link from "next/link";

function TikTokIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path d="M16.6 1h-3.7v14.8a3.2 3.2 0 1 1-2.8-3.2V8.9a7 7 0 1 0 6.5 7V8.4a9 9 0 0 0 5.2 1.7V6.4A5.3 5.3 0 0 1 16.6 1Z" /></svg>;
}

const SOCIAL_LINKS = [
  { label: "TikTok", href: "https://www.tiktok.com/@ap3kautomation", Icon: TikTokIcon },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/ap3kautomation",
    Icon: Linkedin,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/ap3kautomation/",
    Icon: Facebook,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@AP3Kautomation",
    Icon: Youtube,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/ap3kautomation",
    Icon: Instagram,
  },
] as const;

export default function WebsiteFooter() {
  const { locale, t } = useI18n();
  const tr = usePublicUi();
  const href = (path: string) => localizePublicPath(path, locale);
  const linkClass =
    "max-w-full [overflow-wrap:anywhere] text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white";

  return (
    <footer className="relative z-10 border-t border-slate-200 bg-white/60 px-4 py-10 backdrop-blur dark:border-white/10 dark:bg-[#080911] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-14">
          <div className="flex min-w-0 flex-col items-start gap-3">
            <AP3KLogo
              className="text-lg text-slate-950 dark:text-white"
              markClassName="h-9 w-9 rounded-xl"
            />
            <p className="max-w-sm text-sm leading-6 text-slate-500 dark:text-rf-muted">
              {t("footerDescription")}
            </p>
            <div
              className="mt-2 flex flex-wrap gap-2"
              aria-label="AP3K social media"
            >
              {SOCIAL_LINKS.map(({ label, href: socialHref, Icon }) => (
                <a
                  key={label}
                  href={socialHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`AP3K on ${label}`}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-violet-400/40 dark:hover:text-violet-300"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
          <nav
            aria-label="Footer"
            className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-8 text-[13px] leading-5 sm:grid-cols-3 xl:grid-cols-5"
          >
            {[
              {
                title: "Product",
                links: [
                  ["Pricing", "/pricing"],
                  ["Instagram automation", "/instagram-dm-automation"],
                  ["Comment to DM", "/instagram-comment-to-dm"],
                  ["Comment automation", "/instagram-comment-automation"],
                  ["Login", "/sign-in"],
                  ["Join for free", "/sign-up"],
                ],
              },
              {
                title: "Resources",
                links: [
                  ["Blog", "/blog"],
                  ["Documentation", "/docs"],
                  ["Video tutorial", "/tutorials/instagram-comment-to-dm"],
                ],
              },
              {
                title: "Solutions",
                links: [
                  ["Grow followers", "/solutions/grow-followers"],
                  ["Increase sales", "/solutions/increase-sales"],
                  ["Enhance engagement", "/solutions/enhance-engagements"],
                  ["All solutions", "/solutions"],
                  ["Creators", "/instagram-automation-for-creators"],
                  ["Coaches", "/instagram-automation-for-coaches"],
                  ["Ecommerce", "/instagram-automation-for-ecommerce"],
                ],
              },
              {
                title: "Compare",
                links: [
                  ["ManyChat", "/manychat-alternative"],
                  ["CreatorFlow", "/compare/creatorflow"],
                  ["LinkDM", "/compare/linkdm"],
                  ["Zorcha", "/compare/zorcha"],
                  ["Linktree", "/compare/linktree"],
                  ["Beacons", "/compare/beacons-ai"],
                  ["HighLevel", "/compare/high-level"],
                  ["All comparisons", "/compare"],
                ],
              },
              {
                title: "AP3K",
                links: [
                  ["About AP3K", "/about"],
                  ["Contact us", "/contact"],
                  ["Privacy", "/privacy"],
                  ["Terms of service", "/terms"],
                  ["Refund policy", "/refund-policy"],
                ],
              },
            ].map((group) => (
              <div
                key={group.title}
                className="flex min-w-0 flex-col items-start gap-3"
              >
                <p className="mb-1 font-bold text-slate-900 dark:text-white">
                  {tr(group.title)}
                </p>
                {group.links.map(([label, path]) => (
                  <Link key={path} href={href(path)} className={linkClass}>
                    {tr(label)}
                  </Link>
                ))}
                {group.title === "AP3K" && (
                  <a
                    href="mailto:support@ap3k.com"
                    className={`${linkClass} break-all`}
                  >
                    support@ap3k.com
                  </a>
                )}
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 text-xs dark:border-white/10 xl:flex-row xl:items-center xl:justify-between">
          <p className="text-slate-600 dark:text-slate-400">
            {t("footerCopyright")}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href={href("/privacy")} className={linkClass}>
              {t("privacy")}
            </Link>
            <Link href={href("/terms")} className={linkClass}>
              {t("terms")}
            </Link>
            <Link href={href("/cookies")} className={linkClass}>
              {t("cookies")}
            </Link>
            <Link href={href("/refund-policy")} className={linkClass}>
              {t("refunds")}
            </Link>
            <Link href={href("/data-deletion")} className={linkClass}>
              {t("dataDeletion")}
            </Link>
            <CookiePreferencesButton className={linkClass} />
          </div>
        </div>
      </div>
    </footer>
  );
}

