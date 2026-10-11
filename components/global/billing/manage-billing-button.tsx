"use client";

import { UiText } from "@/components/i18n/localized-copy";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, ArrowUpRight, CirclePause } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PortalResponse = {
  url?: string;
  error?: { message?: string };
};

export function ManageBillingButton({
  activeSubscription = true,
  label,
  intent,
}: {
  activeSubscription?: boolean;
  label?: string;
  intent?: "update" | "cancel" | "payment";
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openBillingPortal() {
    if (isPending) return;

    setIsPending(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intent ? { intent } : {}),
      });
      const payload = (await response
        .json()
        .catch(() => ({}))) as PortalResponse;

      if (!response.ok || !payload.url) {
        throw new Error(
          payload.error?.message || "Could not open billing management.",
        );
      }

      window.location.assign(payload.url);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Could not open billing management.";
      setError(message);
      toast.error(message);
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-stretch gap-1.5">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={openBillingPortal}
        className="h-auto min-h-11 whitespace-normal rounded-xl border-slate-200 light:border-slate-300 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-violet-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.10]"
      >
        {isPending ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          intent === "cancel" ? <CirclePause aria-hidden="true" /> : intent === "update" ? <ArrowUpRight aria-hidden="true" /> : <CreditCard aria-hidden="true" />
        )}
        <UiText>
          {isPending
            ? "Checking billing…"
            : label
              ? label
              : activeSubscription
                ? "Manage or cancel subscription"
                : "View invoices and billing history"}
        </UiText>
      </Button>
      {error && (
        <p
          role="alert"
          className="max-w-xs text-xs font-semibold text-red-600 dark:text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
