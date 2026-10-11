"use client";

import { useI18n } from "@/providers/i18n-provider";
import { translateUi } from "@/lib/i18n/translate";
import { UiText } from "@/components/i18n/localized-copy";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, CheckCircle2, CreditCard, Inbox } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

type Props = {
  slug: string;
};

function Notification({ slug }: Props) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const closeNotifications = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          aria-label={translateUi("Open notifications", locale)}
          title={translateUi("Notifications", locale)}
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl border-slate-200 light:border-slate-300 bg-white text-rf-pink shadow-sm hover:bg-slate-50 hover:text-rf-pink dark:border-white/10 dark:bg-white/[0.04] dark:text-rf-pink dark:hover:bg-white/[0.08]"
        >
          <Bell aria-hidden="true" className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border-slate-200 light:border-slate-300 bg-white p-0 text-slate-950 shadow-2xl dark:border-white/10 dark:bg-[#111827] dark:text-white"
      >
        <div className="border-b border-slate-200 light:border-slate-300 px-4 py-3 dark:border-white/10">
          <p className="text-sm font-black"><UiText>{"Notifications"}</UiText></p>
          <p className="mt-0.5 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Workspace and billing updates"}</UiText></p>
        </div>

        <div className="px-4 py-5 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-black"><UiText>{"You're all caught up"}</UiText></p>
          <p className="mt-1 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
            <UiText>{"Important automation, account, and billing updates will appear here."}</UiText>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 light:border-slate-300 p-3 dark:border-white/10">
          <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 light:border-slate-300 bg-white text-xs font-bold dark:border-white/10 dark:bg-white/[0.04]">
            <Link href={`/dashboard/${slug}/inbox`} onClick={closeNotifications}>
              <Inbox aria-hidden="true" />
              <UiText>{"Open inbox"}</UiText>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 light:border-slate-300 bg-white text-xs font-bold dark:border-white/10 dark:bg-white/[0.04]">
            <Link href={`/dashboard/${slug}/billing`} onClick={closeNotifications}>
              <CreditCard aria-hidden="true" /><UiText>{"Billing"}</UiText></Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default Notification;
