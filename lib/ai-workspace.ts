import { DEFAULT_AI_PROTECTION_RULES, normalizeAiProtectionRules, normalizeAiReplyTone } from "@/lib/ai-reply-config";

export type AiKnowledgeItem = {
  id: string;
  title: string;
  content: string;
};

export const DEFAULT_AI_ROLE = "Helpful Instagram assistant";
export const DEFAULT_AI_VOICE = "Friendly, clear, concise, and human. Match the customer's language and keep replies brief.";
export const DEFAULT_AI_GUARDRAILS = "Never invent prices, policies, availability, or promises. Never expose private data. If the answer is not in the shared knowledge, say you are not sure and offer human help.";

export function normalizeKnowledge(value: unknown): AiKnowledgeItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const title = String(record.title ?? "").trim().slice(0, 80);
    const content = String(record.content ?? "").trim().slice(0, 5000);
    if (!title || !content) return [];
    return [{ id: String(record.id ?? `knowledge-${index}`).slice(0, 80), title, content }];
  }).slice(0, 12);
}

export function normalizeAiWorkspace(value?: {
  aiRepliesEnabled?: boolean | null;
  aiCommentsEnabled?: boolean | null;
  role?: string | null;
  brandVoice?: string | null;
  guardrails?: string | null;
  defaultTone?: string | null;
  protectionRules?: unknown;
  knowledge?: unknown;
} | null) {
  return {
    aiRepliesEnabled: value?.aiRepliesEnabled === true,
    aiCommentsEnabled: value?.aiCommentsEnabled === true,
    role: value?.role?.trim() || DEFAULT_AI_ROLE,
    brandVoice: value?.brandVoice?.trim() || DEFAULT_AI_VOICE,
    guardrails: value?.guardrails?.trim() || DEFAULT_AI_GUARDRAILS,
    defaultTone: normalizeAiReplyTone(value?.defaultTone),
    protectionRules: normalizeAiProtectionRules(value?.protectionRules ?? DEFAULT_AI_PROTECTION_RULES),
    knowledge: normalizeKnowledge(value?.knowledge),
  };
}

export function knowledgeContext(items: AiKnowledgeItem[]) {
  return items
    .map((item) => `## ${item.title}\n${item.content}`)
    .join("\n\n")
    .slice(0, 16_000);
}
