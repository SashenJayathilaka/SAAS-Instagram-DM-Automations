export function formatKeywordDisplay(word: string, appReviewMode = false, translate: (source: string) => string = (source) => source) {
  const normalized = word.trim().toLowerCase();
  if (!appReviewMode) return word;
  return normalized ? translate("Keyword: {word}").replace("{word}", normalized) : translate("Keyword");
}
