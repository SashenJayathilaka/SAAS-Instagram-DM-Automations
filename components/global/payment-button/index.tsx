"use client";

import { UiText } from "@/components/i18n/localized-copy";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { CreditCardIcon, Loader2 } from "lucide-react";

type Props = {};

function PaymentButton({}: Props) {
  const { isProcessing, onSubscription } = useSubscription();

  return (
    <Button
      disabled={isProcessing}
      onClick={() => onSubscription("creator")}
      className="ap3k-gradient-button rounded-xl text-white"
    >
      {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCardIcon />}<UiText>{"Upgrade"}</UiText></Button>
  );
}

export default PaymentButton;
PaymentButton;
