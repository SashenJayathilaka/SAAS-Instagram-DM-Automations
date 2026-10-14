"use client";
import ConversionTracking from "./conversion-tracking";
import { usePublicUi } from "@/components/i18n/use-public-ui";
import { useI18n } from "@/providers/i18n-provider";
import { localizePublicPath } from "@/lib/i18n/config";


import TrackingScripts from "@/components/global/tracking-scripts";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { useEffect, useState } from "react";

const CONSENT_KEY = "ap3k_tracking_consent_v1";
const OPEN_PREFERENCES_EVENT = "ap3k:open-cookie-preferences";
const PROMPT_DELAY_MS = 5000;
type Consent = "accepted" | "necessary" | null;

export default function ConsentAwareAnalytics() {
  const tr = usePublicUi();
  const { locale } = useI18n();
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    const next = saved === "accepted" || saved === "necessary" ? saved : null;
    setConsent(next);
    setReady(true);
    let timer: number | undefined;
    if (next === null) timer = window.setTimeout(() => setShowPrompt(true), PROMPT_DELAY_MS);

    const openPreferences = () => {
      window.clearTimeout(timer);
      setConsent(null);
      setShowPrompt(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
    };
  }, []);

  function choose(next: Exclude<Consent, null>) {
    window.localStorage.setItem(CONSENT_KEY, next);
    setConsent(next);
    setShowPrompt(false);
  }

  return (
    <>
      {consent === "accepted" ? (
        <>
          <TrackingScripts />
          <Analytics />
          <ConversionTracking />
          <SpeedInsights />
        </>
      ) : null}

      {ready && consent === null && showPrompt ? (
        <div
          role="dialog"
          aria-live="polite"
          aria-label={tr("Cookie preferences")}
          className="fixed inset-x-3 bottom-3 z-[100] overflow-hidden rounded-2xl border border-white/10 bg-[#11131f]/95 p-3.5 text-white shadow-[0_20px_70px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[390px] sm:p-4"
        >
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/80 to-transparent" />
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-400/20" aria-hidden="true">
              <Cookie className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight">{tr("Your privacy, your choice")}</p>
              <p className="mt-0.5 text-[11px] leading-[1.45] text-slate-300">{tr("Optional analytics help us improve AP3K. Necessary storage is always active.")} {" "}<Link href={localizePublicPath("/cookies", locale)} className="font-bold text-violet-300 underline decoration-violet-400/40 underline-offset-2 transition hover:text-violet-200">{tr("Cookie Policy")}</Link>.
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => choose("necessary")} className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-black text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]">{tr("Necessary only")}</button>
            <button type="button" onClick={() => choose("accepted")} className="min-h-10 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-[11px] font-black text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110">{tr("Accept analytics")}</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
