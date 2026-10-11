import { UiText } from "@/components/i18n/localized-copy";
import React from "react";
import PaymentButton from "../payment-button";

type Props = {};

function UpgradeCard({}: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-rf-pink/20 bg-ap3k-gradient-soft p-4 shadow-ap3k-card flex flex-col gap-y-3">
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-rf-pink/20 blur-2xl" />
      <span className="relative text-sm font-black text-slate-700 dark:text-rf-muted"><UiText>{"Upgrade to Pro"}</UiText></span>
      <p className="relative text-sm text-slate-700 dark:text-rf-muted"><UiText>{" Get 5,000 automated actions, AI replies, and full analytics. "}</UiText></p>
      <PaymentButton />
    </div>
  );
}

export default UpgradeCard;
