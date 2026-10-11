import { selectSupportResources } from "./support-resources";

/** UI actions are chosen from this allowlist, never from model-generated URLs or code. */
export type SupportAction = "billing" | "cancel" | "payment";

export function supportActionsFor(question: string): SupportAction[] {
  if (/\b(cancel|stop|pause)\b.{0,40}\b(automation|flow|message|dm|follow-up)\b/i.test(question) && !/\b(subscription|billing|plan)\b/i.test(question)) return [];
  if (/\b(cancel|cancellation|unsubscribe|annuler|résilier|cancelar|kündigen)\b|إلغاء/i.test(question)) return ["cancel", "billing"];
  if (/\b(invoice|receipt|facture)\b/i.test(question)) return ["billing"];
  if (/\b(card|payment|carte|paiement)\b/i.test(question)) return ["payment", "billing"];
  return selectSupportResources(question).some(resource => resource.id === "billing") ? ["billing"] : [];
}

export const INITIAL_SUPPORT_QUESTIONS = [
  "Which AP3K plan fits my needs?",
  "How do I send a DM when someone comments?",
  "Why is my automation not sending DMs?",
  "How do I manage or cancel my subscription?",
];

export function supportQuestionsFor(question = "") {
  if (!question) return INITIAL_SUPPORT_QUESTIONS;
  const topics = selectSupportResources(question).map(resource => resource.id);
  if (supportActionsFor(question).length) return ["What is included in my current plan?", "How do monthly and yearly billing compare?", "Which plan includes AI replies and email collection?"];
  if (topics.includes("delivery") || topics.includes("connect")) return ["How do I check my Instagram permissions?", "How do I test my automation safely?", "Can usage limits stop my DMs?"];
  if (topics.includes("ai")) return ["What should I add to AI Knowledge?", "How do I test AI replies before publishing?", "Which plan includes live AI replies?"];
  if (topics.includes("flow")) return ["When should I use Basic Automation or Flow Builder?", "How do I test a Flow before publishing?", "Which plan lets me publish custom flows?"];
  return ["How do I add a link button?", "How do I collect an email in a DM?", "How do I test my automation safely?"];
}

export type SupportAccountContext = {
  plan: string;
  usage?: { period: string; actions: number; aiReplies: number; activeAutomations: number; connectedAccounts: number };
};
