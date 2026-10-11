import { linkButtonsAreComplete, type LinkButton } from "./link-buttons";

/** Shared editor/delivery rules. Saved arrays contain copy, never executable prompts. */
export const MAX_COMMENT_REPLIES = 20;
export const MAX_MESSAGE_VARIATIONS = 10;
export const PUBLIC_REPLY_LIMITS = [0, 100, 200] as const;
export const DEFAULT_COMMENT_PROMPT = "Thanks Username for commenting! Check your DMs for a special link just for you.";
export const DEFAULT_COMMENT_ONLY_PROMPT = "Thank Username for commenting. Reply briefly and warmly using the post context and a happy emoji. Always include Username in every reply. Do not mention DMs.";

export function normalizeCopyList(value: unknown, maxItems = MAX_COMMENT_REPLIES, maxLength = 1000): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((x): x is string => typeof x === "string").map(x => x.trim().slice(0, maxLength)).filter(Boolean))).slice(0, maxItems);
}

export function readCommentReplies(listener: { commentReplies?: unknown; commentReply?: string | null; commentReply2?: string | null; commentReply3?: string | null }) {
  return Array.isArray(listener.commentReplies) ? normalizeCopyList(listener.commentReplies) : normalizeCopyList([listener.commentReply, listener.commentReply2, listener.commentReply3]);
}

/** A stable choice per journey prevents a retried event or follow check changing copy. */
export function selectMessageVariation(base: string, variations: unknown, journey: string): string {
  const messages = normalizeCopyList([base, ...normalizeCopyList(variations, MAX_MESSAGE_VARIATIONS)], MAX_MESSAGE_VARIATIONS + 1);
  if (!messages.length) return base;
  let hash = 2166136261;
  for (const char of journey) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return messages[(hash >>> 0) % messages.length];
}

export function normalizeReplyLimit(value: unknown): number {
  return PUBLIC_REPLY_LIMITS.includes(value as typeof PUBLIC_REPLY_LIMITS[number]) ? Number(value) : 0;
}

export function personalizeUsername(text: string, username?: string | null) {
  const handle = username?.replace(/^@+/, "").replace(/[^A-Za-z0-9_.]/g, "");
  return text.replace(/@?\{\{username\}\}|@?\bUsername\b/gi, handle ? `@${handle}` : "").replace(/@\s*(?=[,!.?]|$)/g, "");
}

export function ensureCommentUsername(text: string, username?: string | null) {
  const reply = personalizeUsername(text, username).replace(/\s+/g, " ").trim();
  const handle = username?.replace(/^@+/, "").replace(/[^A-Za-z0-9_.]/g, "");
  if (!handle) return reply.slice(0, 220);
  const mention = `@${handle}`;
  const escaped = mention.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}(?![A-Za-z0-9_]|\\.[A-Za-z0-9_])`, "i").test(reply.slice(0, 220)) ? reply.slice(0, 220) : `${mention} ${reply}`.slice(0, 220);
}

export type AutomationCopyMode = "COMMENT_REPLIES" | "COMMENT_PROMPT" | "COMMENT_SAMPLES" | "MESSAGE" | "MESSAGE_VARIATIONS";
export type AutomationCopyInput = {
  mode: AutomationCopyMode; integrationId: string; locale?: string; text?: string; instructions?: string;
  caption?: string; sendDm?: boolean; openingDm?: boolean; hasButtons?: boolean; existing?: string[];
  count?: 1 | 5; linkButtons?: LinkButton[];
};

export function variationGenerationError(input: Pick<AutomationCopyInput, "text" | "hasButtons" | "linkButtons">): string | null {
  if (typeof input.text !== "string" || !input.text.trim()) return "Write your message before generating variations.";
  if (input.hasButtons && (!Array.isArray(input.linkButtons) || input.linkButtons.some(b => !b || typeof b.label !== "string" || typeof b.url !== "string") || !linkButtonsAreComplete(input.linkButtons))) return "Complete your message, button label, and destination URL to generate variations.";
  return null;
}

/** Generated manual replies are anonymous until the creator inserts a variable. */
export function removeGeneratedUsername(text: string) {
  return text.replace(/@?\{\{\s*username\s*\}\}|@?\bUsername\b|(?<![\w@])@[A-Za-z0-9_.]+/gi, "")
    .replace(/\s+([,!.?])/g, "$1").replace(/,\s*([!.?])/g, "$1").replace(/\s+/g, " ").trim();
}
