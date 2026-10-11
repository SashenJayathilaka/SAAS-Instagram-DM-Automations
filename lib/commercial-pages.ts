import { COMMERCIAL_PAGES as SOURCE_PAGES } from "./commercial-page-catalog";
import type { CommercialPage } from "./commercial-page-catalog";
export type { CommercialPage } from "./commercial-page-catalog";

const OLD_LIMIT = "Automations respond to eligible new interactions after activation; they do not process old comments retroactively.";
const BACKTRACK_LIMIT = "Live automations respond to eligible new interactions. Use Backtrack comments separately for supported posts and comments from the previous seven days.";
/** One reviewed limitation for the product pages that previously used the old rule. */
export const COMMERCIAL_PAGES: CommercialPage[] = SOURCE_PAGES.map(page => ({
  ...page,
  ...(page.limitations.includes(OLD_LIMIT) ? { updatedAt: "2026-10-05" } : {}),
  ...(page.slug === "manychat-alternative" ? { updatedAt: "2026-10-06" } : {}),
  limitations: page.limitations.map(limit => limit === OLD_LIMIT ? BACKTRACK_LIMIT : limit),
}));

export const COMMERCIAL_SLUGS = COMMERCIAL_PAGES.map(page => page.slug);
export function getCommercialPage(slug: string): CommercialPage | null {
  return COMMERCIAL_PAGES.find(page => page.slug === slug) ?? null;
}
