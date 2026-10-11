import { MATCHING_MODE } from "@prisma/client";

export const ANY_COMMENT_KEYWORD = "ANY_COMMENT";

export function normalizeMatchText(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export function resolveCommentTriggerMatch({
  text,
  keywords,
  mode,
  triggerMode,
}: {
  text: string;
  keywords: { word: string }[];
  mode: MATCHING_MODE;
  triggerMode?: string | null;
}): string | null {
  if (triggerMode === "ANY_COMMENT") return ANY_COMMENT_KEYWORD;
  return matchKeywordWithMode(text, keywords, mode);
}

export function matchKeywordWithMode(
  text: string,
  keywords: { word: string }[],
  mode: MATCHING_MODE
): string | null {
  const normalizedText = normalizeMatchText(text);
  if (!normalizedText) return null;

  for (const kw of keywords) {
    const normalizedKeyword = normalizeMatchText(kw.word);
    if (!normalizedKeyword) continue;

    if (mode === "EXACT") {
      if (normalizedText === normalizedKeyword) return kw.word;
    } else {
      // CONTAINS and SMART_AI both use substring match.
      // SMART_AI adds optional OpenAI verification at the call site.
      if (normalizedText.includes(normalizedKeyword)) return kw.word;
    }
  }

  return null;
}
