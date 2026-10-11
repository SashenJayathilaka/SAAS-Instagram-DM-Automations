import { AP3K_HELP_ARTICLES, type HelpArticle } from "./ap3k-help";

export const HELP_CATEGORIES = [
  { id: "getting-started", title: "Getting started" },
  { id: "instagram", title: "Instagram" },
  { id: "automations", title: "Automations" },
  { id: "ai", title: "AP3K AI" },
  { id: "inbox", title: "Inbox" },
  { id: "billing", title: "Billing" },
  { id: "account", title: "Account & privacy" },
] as const;

export function helpCategory(article: HelpArticle) {
  return HELP_CATEGORIES.find(category => category.title === article.category)!;
}

const related: Record<string, string[]> = {
  "workspace-tour": ["connect-instagram", "create-automation", "contacts-leads"],
  "connect-instagram": ["create-automation", "reconnect-instagram", "workspace-tour"],
  "reconnect-instagram": ["connect-instagram", "automation-troubleshooting", "privacy-delete"],
  "automation-types": ["create-automation", "opening-final-dm", "ai-setup"],
  "create-automation": ["opening-final-dm", "automation-troubleshooting", "contacts-leads"],
  "opening-final-dm": ["create-automation", "automation-troubleshooting", "inbox"],
  "automation-troubleshooting": ["reconnect-instagram", "plans-usage", "create-automation"],
  "ai-setup": ["ai-knowledge", "ai-safety", "plans-usage"],
  "ai-safety": ["ai-knowledge", "ai-setup", "automation-troubleshooting"],
  "ai-knowledge": ["ai-setup", "ai-safety", "plans-usage"],
  "inbox": ["contacts-leads", "reconnect-instagram", "opening-final-dm"],
  "contacts-leads": ["inbox", "create-automation", "workspace-tour"],
  "plans-usage": ["billing-troubleshooting", "refer-earn", "ai-setup"],
  "billing-troubleshooting": ["plans-usage", "refer-earn", "privacy-delete"],
  "refer-earn": ["plans-usage", "billing-troubleshooting", "workspace-tour"],
  "privacy-delete": ["reconnect-instagram", "billing-troubleshooting", "connect-instagram"],
};

export function relatedHelpArticles(slug: string) {
  return (related[slug] ?? []).map(id => AP3K_HELP_ARTICLES.find(article => article.slug === id)!);
}

export function normalizeHelpSearch(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
export function searchHelpArticles(query: string, translate: (source: string) => string) {
  const words = normalizeHelpSearch(query).split(" ").filter(Boolean);
  return AP3K_HELP_ARTICLES.filter(article => {
    const source = [article.category, article.title, article.summary, ...article.steps];
    const text = normalizeHelpSearch([...source, ...source.map(translate)].join(" "));
    return words.every(word => text.includes(word));
  });
}
