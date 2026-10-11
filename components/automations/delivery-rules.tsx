"use client";

import { useId } from "react";
import { UiText } from "@/components/i18n/localized-copy";
import { UserCheck } from "lucide-react";

type DeliveryRuleFields = {
  followGateRequired: boolean;
  followRequestDmText: string;
  followRequestButtonText: string;
};

type Props = DeliveryRuleFields & {
  onChange: (next: Partial<DeliveryRuleFields>) => void;
};

export default function DeliveryRules({
  followGateRequired,
  followRequestDmText,
  followRequestButtonText,
  onChange,
}: Props) {
  const messageId = useId();
  const toggleFollowGate = (button: HTMLButtonElement) => {
    const pageScrollLeft = window.scrollX;
    const pageScrollTop = window.scrollY;
    const scrollRegion = button.closest<HTMLElement>("[data-automation-scroll-region]");
    const regionScrollLeft = scrollRegion?.scrollLeft ?? 0;
    const regionScrollTop = scrollRegion?.scrollTop ?? 0;

    onChange({ followGateRequired: !followGateRequired });

    window.requestAnimationFrame(() => {
      if (scrollRegion) {
        scrollRegion.scrollLeft = regionScrollLeft;
        scrollRegion.scrollTop = regionScrollTop;
      }
      window.scrollTo(pageScrollLeft, pageScrollTop);
    });
  };

  return (
    <div className="space-y-3 [overflow-anchor:none]">
      <button
        type="button"
        role="switch"
        aria-checked={followGateRequired}
        onClick={(event) => toggleFollowGate(event.currentTarget)}
        className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 light:border-slate-300 bg-slate-50 p-4 text-start transition hover:border-rf-purple/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-purple/40 dark:border-white/10 dark:bg-white/[0.04]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rf-purple/10 text-rf-purple">
          <UserCheck className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-slate-950 dark:text-white">
            <UiText>{"Ask people to follow before sending the link"}</UiText></span>
          <span className="mt-1 block text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
            <UiText>{"Optional. Instagram shows Follow and verification as two full-width buttons in the same message. AP3K sends the final DM only after verification confirms the follow."}</UiText></span>
        </span>
        <span aria-hidden="true" className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition ${followGateRequired ? "bg-rf-purple" : "bg-slate-300 dark:bg-slate-700"}`}>
          <span className={`absolute start-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-base ${followGateRequired ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"}`} />
        </span>
      </button>

      {followGateRequired ? (
        <div className="rounded-2xl border border-rf-purple/20 bg-rf-purple/[0.06] p-4 dark:border-rf-purple/30 dark:bg-rf-purple/[0.09] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rf-purple dark:text-violet-300"><UiText>{"Follow request DM"}</UiText></p>
              <p className="mt-1 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Sent only when the person is not following yet."}</UiText></p>
            </div>
            <span className="rounded-full bg-rf-purple/10 px-2.5 py-1 text-[11px] font-black text-rf-purple"><UiText>{"Optional step"}</UiText></span>
          </div>
          <label htmlFor={messageId} className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300"><UiText>{"Message"}</UiText></label>
          <textarea
            id={messageId}
            value={followRequestDmText}
            onChange={(event) => onChange({ followRequestDmText: event.target.value })}
            maxLength={640}
            rows={5}
            dir="auto"
            className="ap3k-textarea w-full rounded-xl px-4 py-3 text-sm"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-xs font-bold text-slate-600 dark:text-slate-300">
              <UiText>{"Verification quick reply"}</UiText><input
                value={followRequestButtonText}
                onChange={(event) => onChange({ followRequestButtonText: event.target.value })}
                maxLength={20}
                className="ap3k-input mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
              />
            </label>
            <span className="rounded-xl border border-rf-purple/20 bg-white px-4 py-3 text-center text-xs font-black text-rf-purple dark:bg-[#111827]">
              <UiText>{"Rechecks follow"}</UiText></span>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
            <UiText>{"Both controls appear inside the message. AP3K verifies the callback subscription before using them and falls back safely if Meta does not confirm it."}</UiText></p>
        </div>
      ) : null}
    </div>
  );
}
