export const AI_REPLY_TONES = ["FUN", "FRIENDLY", "PROFESSIONAL"] as const;
export type AiReplyTone = (typeof AI_REPLY_TONES)[number];

export const AI_PROTECTION_CATEGORIES = [
  "INSULTS_HATE",
  "CRITIQUE_NEGATIVE",
  "UNANSWERABLE",
  "BEGGING_SOLICITATION",
] as const;
export type AiProtectionCategory = (typeof AI_PROTECTION_CATEGORIES)[number];
export type AiProtectionAction = "SKIP" | "DELETE";

export type AiProtectionRules = Record<AiProtectionCategory, AiProtectionAction>;

export const DEFAULT_AI_PROTECTION_RULES: AiProtectionRules = {
  INSULTS_HATE: "DELETE",
  CRITIQUE_NEGATIVE: "SKIP",
  UNANSWERABLE: "SKIP",
  BEGGING_SOLICITATION: "SKIP",
};

export function normalizeAiReplyTone(value?: string | null): AiReplyTone {
  return AI_REPLY_TONES.includes(value as AiReplyTone)
    ? (value as AiReplyTone)
    : "FRIENDLY";
}

export function normalizeAiProtectionRules(value: unknown): AiProtectionRules {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return AI_PROTECTION_CATEGORIES.reduce<AiProtectionRules>((rules, category) => {
    const action = record[category];
    rules[category] = category === "UNANSWERABLE"
      ? "SKIP"
      : action === "DELETE" || action === "SKIP"
        ? action
        : DEFAULT_AI_PROTECTION_RULES[category];
    return rules;
  }, { ...DEFAULT_AI_PROTECTION_RULES });
}

export function aiToneLabel(tone: AiReplyTone) {
  return tone.charAt(0) + tone.slice(1).toLowerCase();
}
