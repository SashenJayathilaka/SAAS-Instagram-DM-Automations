"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { useI18n } from "@/providers/i18n-provider";
import { stripLocaleFromPath } from "@/lib/i18n/config";
import { gaMeasurementId, analyticsPage, googleTag } from "@/lib/google-analytics";

/** Mounted only after analytics consent. Never collect message text, account IDs or URLs. */
export default function ConversionTracking() {
  const { locale } = useI18n();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!link) return;
      let target: URL;
      try { target = new URL(link.getAttribute("href")!, window.location.origin); }
      catch { return; }
      if (target.origin !== window.location.origin) return;
      const path = stripLocaleFromPath(target.pathname);
      const name = path === "/sign-up" ? "signup_cta_clicked" : path === "/payment" ? "checkout_cta_clicked" : null;
      if (!name) return;
      const plan = target.searchParams.get("plan");
      const interval = target.searchParams.get("interval");
      const properties = {
        locale,
        content_group: analyticsPage(window.location.pathname).group,
        ...(plan === "pro" || plan === "business" ? { plan } : {}),
        ...(interval === "month" || interval === "year" ? { interval } : {}),
      };
      // Instrumentation must never prevent navigation or checkout.
      try {
        track(name, properties);
      } catch { /* Optional analytics cannot block the product. */ }
      try {
        if (window.location.hostname === "ap3k.com") {
          googleTag(window)("event", name, { ...properties, send_to: gaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) });
        }
      } catch { /* A failure in either vendor must not disable the other. */ }
    };
    document.addEventListener("click", onClick);
    const onKitRequested = (event: Event) => {
      const source = (event as CustomEvent).detail?.source;
      if (!["launch-kit", "templates", "resources", "guide"].includes(source)) return;
      const properties = { source, locale };
      try { track("launch_kit_requested", properties); } catch { /* Optional analytics. */ }
      try {
        if (window.location.hostname === "ap3k.com") googleTag(window)("event", "launch_kit_requested", { ...properties, send_to: gaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) });
      } catch { /* Optional analytics. */ }
    };
    window.addEventListener("ap3k:launch-kit-requested", onKitRequested);
    return () => { document.removeEventListener("click", onClick); window.removeEventListener("ap3k:launch-kit-requested", onKitRequested); };
  }, [locale]);
  return null;
}
