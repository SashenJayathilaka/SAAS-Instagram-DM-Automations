import { customerReplyCopy } from "@/lib/customer-reply-copy";

export function formatAppReviewActivitySubtitle(subtitle: string, appReviewMode = false) {
  const reviewFormatted = appReviewMode
    ? subtitle
        .replace(/Trigger matched "([^"]+)"/gi, (_match, keyword: string) => `Trigger matched keyword "${keyword.toLowerCase()}"`)
        .replace(/^Keyword "([^"]+)"/gi, (_match, keyword: string) => `Keyword "${keyword.toLowerCase()}"`)
    : subtitle;

  return customerReplyCopy(reviewFormatted);
}
