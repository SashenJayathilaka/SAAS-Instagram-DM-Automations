"use client";

import { Menu } from "lucide-react";
import Sheet from "@/components/global/sheet";
import Sidebar from "@/components/global/sidebar";
import { useI18n } from "@/providers/i18n-provider";
import { UiText } from "@/components/i18n/localized-copy";

/** Navigation stays reachable on small screens without a second app header. */
export default function MobileNavigation({ slug }: { slug: string }) {
  const { t } = useI18n();
  return <div data-mobile-navigation className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-3 z-40 lg:hidden">
    <Sheet
      trigger={<><Menu className="h-5 w-5" aria-hidden="true" /><span><UiText>Menu</UiText></span></>}
      triggerLabel={t("openNavigation")}
      className="h-12 w-auto gap-2 rounded-full border border-violet-400/50 bg-violet-600 px-4 text-sm font-bold text-white shadow-lg shadow-violet-950/25 ring-2 ring-white/80 transition-colors hover:bg-violet-700 focus-visible:ring-violet-300 dark:ring-[#0b1020]"
      contentClassName="h-[100dvh] max-h-[100dvh] w-[min(320px,calc(100vw-40px))]"
      side="left"
      closeOnNavigation
    ><Sidebar slug={slug} drawer /></Sheet>
  </div>;
}
