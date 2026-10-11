import { stripLocaleFromPath } from "@/lib/i18n/config";

// Public AP3K production stream identifier, not a credential.
export const AP3K_GA_ID = "G-1DKJMY5EQ0";

/** Only our published campaign vocabulary; arbitrary UTM values may contain PII. */
export function analyticsCampaign(search: string) {
  const params = new URLSearchParams(search);
  const fields = [
    ["utm_source", "campaign_source", ["instagram", "facebook", "ap3k_email", "google", "creator_partner", "youtube"]],
    ["utm_medium", "campaign_medium", ["organic_social", "paid_social", "email", "cpc", "referral"]],
    ["utm_campaign", "campaign_name", ["comment_dm_launch_kit", "comment_dm_search", "creator_pilot"]],
    ["utm_content", "campaign_content", ["kit", "test", "launch", "reel_demo", "story_demo", "carousel", "bio", "search_intent", "partner_demo"]],
  ] as const;
  const result: Record<string, string> = {};
  for (const [query, key, allowed] of fields) {
    const value = params.get(query);
    if (value && (allowed as readonly string[]).includes(value)) result[key] = value;
  }
  return result;
}

export function gaMeasurementId(value?: string) {
  return value && /^G-[A-Z0-9]+$/.test(value) ? value : AP3K_GA_ID;
}

export function analyticsPage(pathname: string) {
  const path = stripLocaleFromPath(pathname.split(/[?#]/)[0]);
  const privateArea = path.match(/^\/(dashboard|admin|ap3k-admin-v2|payment|callback|sign-in|sign-up|onboarding|api)(?:\/|$)/)?.[1];
  return {
    path: privateArea ? `/${privateArea}` : pathname.split(/[?#]/)[0],
    privateArea,
    group: privateArea || (path === "/" ? "home" : path.split("/")[1]),
  };
}

export function analyticsReferrer(value: string) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return "";
    // External referrer paths can contain search terms or personal information.
    return url.origin === "https://ap3k.com"
      ? `${url.origin}${analyticsPage(url.pathname).path}`
      : url.origin;
  } catch { return ""; }
}

export type GoogleWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

/** Call only within the consent-gated tracking subtree. */
export function googleTag(win: GoogleWindow) {
  win.dataLayer = win.dataLayer || [];
  win.gtag = win.gtag || function () { win.dataLayer!.push(arguments); };
  return win.gtag;
}

/** Authentication/checkout returns must not overwrite the acquisition source. */
export function isServiceReturn(referrer: string) {
  try { return ["accounts.google.com", "checkout.stripe.com", "billing.stripe.com"].includes(new URL(referrer).hostname); }
  catch { return false; }
}
