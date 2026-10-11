import { DOCS_ARTICLES } from "./docs";
import { AP3K_HELP_ARTICLES, ap3kSupportKnowledge } from "./ap3k-help";
import { PLAN_LIMITS } from "./plan-limits";
import { AP3K_PRICING } from "./billing-plans";
import { selectSupportResources } from "./support-resources";

/** Live documentation is retrieved at request time; no duplicated vector database. */
export function supportKnowledgeFor(message: string, previousQuestion = "") {
  const selected = selectSupportResources(message, previousQuestion);
  const sections = selected.map(resource => {
    const article = DOCS_ARTICLES.find(a => `/docs/${a.slug}` === resource.href);
    const help = AP3K_HELP_ARTICLES.find(a => `/help/${a.slug}` === resource.href);
    const body = article?.html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ") || help?.steps.join("\n") || "";
    return `${resource.title}\nDocumentation: ${resource.href}\nAttached resources: ${resource.screenshot ? "a current example product screenshot and " : ""}a documentation card${resource.video ? " plus the AP3K setup tutorial video" : ""}.\nCurrent implementation notes: ${resource.facts || "Use the documentation below."}\n${body.slice(0,6500)}`;
  });
  return [
    "CURRENT PRODUCT LIMITS (authoritative if older documentation differs):",
    JSON.stringify({ plans: { FREE: PLAN_LIMITS.FREE, PRO: PLAN_LIMITS.PRO, BUSINESS: PLAN_LIMITS.BUSINESS }, pricesUSD: AP3K_PRICING }),
    "Paid-only: live AI replies, contact capture, CSV export, follow gates, follow-up messages, custom Flow publishing. Free permits AI drafts/samples. Policy scans and backtracking each have a separate three-use Free allowance; paid plans remove those attempt limits, not messaging quotas or Meta rules.",
    "Support is read-only for account mutations. It can display secure UI buttons to open Billing, review cancellation in Stripe, or manage payment details/invoices. Opening a flow is not completion: only the customer can confirm changes in Stripe. It cannot directly publish, send messages, backtrack, change billing, delete data or inspect delivery records. Never claim an operation was performed.",
    `PLAN ADVICE: Recommend the lowest-cost plan that meets the stated needs. Ask one focused follow-up if account count, expected monthly actions, or need for live AI/contact capture/custom flows is unclear. Use configured limits. Current usage is historical, not a forecast. Free is a valid recommendation for basic use within its limits. Never promise results or unlimited messaging. Annual Pro is $${AP3K_PRICING.PRO_ANNUAL} charged yearly ($${AP3K_PRICING.PRO_ANNUAL / 12}/month equivalent); annual Business is $${AP3K_PRICING.BUSINESS_ANNUAL} charged yearly ($${AP3K_PRICING.BUSINESS_ANNUAL / 12}/month equivalent). Explain upfront annual billing, not a monthly charge. Do not imply an app plan proves an active Stripe subscription or a renewal date.`,
    "Official AP3K setup tutorial: How to Automate Instagram DMs from Comments | AP3K Tutorial 2026. Watch at https://ap3k.com/tutorials/instagram-comment-to-dm (YouTube video SSOYGbfwLUQ). When an attached resource includes video, tell the user to expand Watch the AP3K setup tutorial below your answer. The tutorial is a known resource; do not refer users to email support to find it.",
    ...(sections.length ? sections : [ap3kSupportKnowledge()]),
  ].join("\n\n");
}
