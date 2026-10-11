"use client";
import { LocalizedButton } from "@/components/i18n/localized-controls";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePath } from "@/hooks/user-nav";
import AP3KLogo from "../ap3k-logo";
import InstagramAccountSwitcher from "@/components/dashboard/instagram-account-switcher";
import HelpHub from "@/components/help/help-hub";
import { useClerk } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { PRIMARY_NAVIGATION, primaryNavigationHref } from "@/constants/menu";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/providers/i18n-provider";

type Props = { slug: string; drawer?: boolean; onNavigate?: () => void };

export default function Sidebar({ slug, drawer = false, onNavigate }: Props) {
  const { t, locale } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const { page } = usePath();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  useEffect(() => {
    const saved = window.localStorage.getItem("ap3k-sidebar-expanded");
    if (!drawer && saved !== null) setExpanded(saved !== "false");
  }, [drawer]);

  const toggleExpanded = () => {
    setExpanded((value) => {
      window.localStorage.setItem("ap3k-sidebar-expanded", String(!value));
      return !value;
    });
  };

  return (
    <aside
      className={cn(
        "peer fixed bottom-0 left-0 top-0 z-40 hidden flex-col overflow-visible border-r border-slate-200 light:border-slate-300 bg-[#f6f6fa] py-0 text-slate-950 transition-[width] duration-base ease-ui-out rtl:left-auto rtl:right-0 rtl:border-l rtl:border-r-0 dark:border-white/10 dark:bg-[#0c0e18] dark:text-slate-50 lg:flex",
        drawer
          ? "!relative !inset-auto !flex !h-full !w-full !border-0"
          : expanded
            ? "w-[232px]"
            : "w-[76px]",
      )}
      data-expanded={expanded ? "true" : "false"}
    >
      <div
        className={cn(
          "shrink-0 border-b border-slate-200 light:border-slate-300 py-4 dark:border-white/10",
          expanded ? "px-4" : "px-3",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            expanded ? "justify-between" : "justify-center",
          )}
        >
          {expanded ? (
            <AP3KLogo className="text-sm text-slate-950 dark:text-white" />
          ) : (
            <AP3KLogo showText={false} markClassName="h-11 w-11 rounded-2xl" />
          )}
        </div>
        <InstagramAccountSwitcher slug={slug} expanded={expanded} />
      </div>

      <TooltipProvider delayDuration={200}>
        <nav
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) onNavigate?.();
          }}
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-3"
        >
          {PRIMARY_NAVIGATION.map((item) => {
            const Icon = item.icon;
            const href = primaryNavigationHref(slug, item.segment);
            const isActive =
              item.segment === ""
                ? page === slug || page === ""
                : page === item.segment;
            return (
              <Tooltip key={item.segment}>
                <TooltipTrigger asChild>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    href={href}
                    title={!expanded ? t(item.messageKey) : undefined}
                    aria-label={!expanded ? t(item.messageKey) : undefined}
                    className={cn(
                      "relative flex min-h-11 items-center rounded-xl border border-transparent text-sm font-semibold transition-colors duration-fast",
                      expanded
                        ? "gap-2.5 px-3 py-2.5"
                        : "justify-center px-0 py-2.5",
                      isActive
                        ? "border-violet-100 bg-white text-violet-800 shadow-sm dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200"
                        : "text-slate-500 light:text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white",
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span
                      className={expanded ? "min-w-0 break-words" : "sr-only"}
                    >
                      {t(item.messageKey)}
                    </span>
                  </Link>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right" sideOffset={12}>
                    {t(item.messageKey)}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>

      <div className="shrink-0 px-3 pb-1">
        <HelpHub slug={slug} expanded={expanded} mobile={drawer} />
      </div>
      <div className={`shrink-0 px-3 pb-2 ${drawer ? "hidden" : ""}`}>
        <LocalizedButton
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-label={
            expanded ? t("collapseNavigation") : t("expandNavigation")
          }
          title={expanded ? t("collapseNavigation") : t("expandNavigation")}
          className="mx-auto grid h-10 w-10 place-items-center rounded-xl text-slate-500 light:text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
        >
          {expanded ? (
            <ChevronsLeft className="h-4 w-4 rtl:rotate-180" />
          ) : (
            <ChevronsRight className="h-4 w-4 rtl:rotate-180" />
          )}
        </LocalizedButton>
      </div>

      <div className="shrink-0 border-t border-slate-200 light:border-slate-300 p-3 dark:border-white/10">
        <LocalizedButton
          onClick={() => {
            queryClient.clear();
            void signOut({ redirectUrl: "/" });
          }}
          title={!expanded ? t("signOut") : undefined}
          aria-label={!expanded ? t("signOut") : undefined}
          className={cn(
            "flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 light:border-slate-300 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white",
            expanded ? "gap-2 px-3 py-2.5" : "px-0",
          )}
        >
          <LogOut className="h-4 w-4" />
          {expanded && <span>{t("signOut")}</span>}
        </LocalizedButton>
      </div>
    </aside>
  );
}
