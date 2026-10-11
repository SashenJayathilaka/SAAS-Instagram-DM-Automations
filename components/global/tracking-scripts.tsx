"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gaMeasurementId, analyticsPage, analyticsReferrer, analyticsCampaign, isServiceReturn, googleTag } from "@/lib/google-analytics";

function validGoogleId(value?: string) {
  return value && /^(G|AW)-[A-Z0-9-]+$/.test(value) ? value : null;
}

function validMetaPixelId(value?: string) {
  return value && /^\d{5,30}$/.test(value) ? value : null;
}

export default function TrackingScripts() {
  const gaId = gaMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  const adsId = validGoogleId(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID);
  const metaPixelId = validMetaPixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID);
  const googleIds = Array.from(new Set([gaId, adsId].filter((id): id is string => Boolean(id))));
  const primaryGoogleId = googleIds[0];
  const pathname = usePathname();
  const initialized = useRef(false);
  const previousPath = useRef<string | null>(null);
  const [production, setProduction] = useState(false);

  useEffect(() => {
    if (window.location.hostname !== "ap3k.com") return;
    const tag = googleTag(window);
    const page = analyticsPage(pathname);
    if (previousPath.current === page.path) return;
    const properties = {
      page_location: `https://ap3k.com${page.path}`,
      page_referrer: previousPath.current ? `https://ap3k.com${previousPath.current}` : analyticsReferrer(document.referrer),
      page_title: page.privateArea ? `AP3K ${page.privateArea}` : document.title,
      content_group: page.group,
      ...(!initialized.current ? analyticsCampaign(window.location.search) : {}),
    };
    if (!initialized.current) {
      tag("js", new Date());
      tag("config", gaId, { ...properties, send_page_view: false, ignore_referrer: isServiceReturn(document.referrer), allow_google_signals: false, allow_ad_personalization_signals: false });
      if (adsId && adsId !== gaId) tag("config", adsId);
      initialized.current = true;
      setProduction(true);
    }
    // Enhanced Measurement is off on this stream: exactly one manual view per
    // path transition, with no customer IDs, query strings or fragment data.
    tag("set", properties);
    tag("event", "page_view", { ...properties, send_to: gaId });
    previousPath.current = page.path;
  }, [pathname, gaId, adsId]);

  return (
    <>
      {production && primaryGoogleId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${primaryGoogleId}`} strategy="afterInteractive" />
        </>
      ) : null}
      {production && !analyticsPage(pathname).privateArea && metaPixelId ? (
        <>
          <Script id="ap3k-meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('set','autoConfig',false,${JSON.stringify(metaPixelId)});fbq('init',${JSON.stringify(metaPixelId)});fbq('track','PageView');`}
          </Script>
          <noscript dangerouslySetInnerHTML={{ __html: `<img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1" />` }} />
        </>
      ) : null}
    </>
  );
}
