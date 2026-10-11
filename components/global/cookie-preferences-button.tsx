"use client";

import { useI18n } from "@/providers/i18n-provider";

type Props = { className?: string };

export default function CookiePreferencesButton({ className = "" }: Props) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`text-left ${className}`}
      onClick={() => {
        window.localStorage.removeItem("ap3k_tracking_consent_v1");
        window.location.reload();
      }}
    >
      {t("cookiePreferences")}
    </button>
  );
}
