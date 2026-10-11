"use client";


import ThemeToggle from "@/components/global/theme-toggle";
import { PAGE_BREAD_CRUMBS } from "@/constants/pages";
import { usePath } from "@/hooks/user-nav";
import { Menu, PanelLeft } from "lucide-react";
import Link from "next/link";
import AP3KLogo from "../ap3k-logo";
import CreateAutomation from "../create-automation";
import Sheet from "../sheet";
import Items from "../sidebar/items";
import InstagramAccountSwitcher from "@/components/dashboard/instagram-account-switcher";
import HelpHub from "@/components/help/help-hub";
import Notification from "./notification";
import Search from "./search";
import { useClerk } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import LanguageSwitcher from "@/components/global/language-switcher";
import { useI18n } from "@/providers/i18n-provider";

type Props = {
  slug: string;
};

function NavBar({ slug }: Props) {
  const { t, locale } = useI18n();
  const { page, pathname } = usePath();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  const currentPage = PAGE_BREAD_CRUMBS.includes(page) || page == slug;
  const isCampaignList = pathname === `/dashboard/${slug}/automation`;
  const isAutomationAnalytics = /^\/dashboard\/[^/]+\/automation\/[^/]+\/analytics\/?$/.test(pathname);
  const showGlobalSearch = currentPage && !isCampaignList;

  const handleSignOut = () => {
    queryClient.clear();
    void signOut({ redirectUrl: "/" });
  };

  return (
      <div data-dashboard-toolbar className={`${isAutomationAnalytics ? "aa-toolbar" : "sticky top-3 rounded-2xl border border-slate-200 light:border-slate-300 p-2 shadow-sm backdrop-blur-xl"} z-30 flex flex-wrap items-center gap-2 bg-white/95 text-slate-950 dark:border-white/10 dark:bg-[#111320]/95 dark:text-slate-50 sm:flex-nowrap lg:justify-end`}>
        <span className={`flex ${isAutomationAnalytics ? "shrink-0" : "flex-1"} items-center gap-x-2 lg:hidden`}>
          <Sheet
            trigger={<Menu aria-hidden="true" />}
            triggerLabel={t("openNavigation")}
            className="lg:hidden"
            contentClassName="h-[100dvh] max-h-[100dvh]"
            side="left"
            closeOnNavigation
          >
            <div className="flex h-full min-h-0 w-full flex-col bg-white text-slate-950 backdrop-blur-3xl dark:bg-[#0b1020] dark:text-white">
              <div className="shrink-0 px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <div className="flex items-center justify-center gap-x-2 p-5">
                  <AP3KLogo className="text-slate-950 dark:text-white" />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
        <InstagramAccountSwitcher slug={slug} />
                <div className="flex flex-col py-3">
                  <Items page={page} slug={slug} />
                </div>
                <div className="px-1 pb-3"><LanguageSwitcher /></div>
                <div className="mt-3 border-t border-slate-200 light:border-slate-300 pt-3 dark:border-white/10"><HelpHub slug={slug} mobile /></div>
              </div>

              <div className="shrink-0 border-t border-slate-200 light:border-slate-300 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] dark:border-white/10">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center rounded-xl border border-slate-200 light:border-slate-300 px-3 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-pink dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
                >
                  {t("signOut")}
                </button>
              </div>
            </div>
          </Sheet>
        </span>
        {isAutomationAnalytics && <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-3 text-sm font-semibold sm:text-base">
          <PanelLeft className="hidden h-[18px] w-[18px] text-slate-400 light:text-slate-600 lg:block" aria-hidden="true" />
          <Link href={`/dashboard/${slug}/automation`} className="hover:text-violet-600">Automations</Link>
          <span aria-hidden="true">/</span><span aria-current="page">Analytics</span>
        </nav>}
        {showGlobalSearch && <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1 lg:max-w-sm">
          <Search />
        </div>}
        <div className="ms-auto flex shrink-0 items-center gap-2">
          {currentPage && !isCampaignList && <CreateAutomation slug={slug} />}
          {!isAutomationAnalytics && <LanguageSwitcher compact />}
          <ThemeToggle compact />
          {!isAutomationAnalytics && <Notification slug={slug} />}
        </div>
      </div>
  );
}

export default NavBar;
