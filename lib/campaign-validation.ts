export type CampaignTriggerMode = "SPECIFIC_KEYWORD" | "ANY_COMMENT";

export function canAdvanceTriggerStep(
  triggerMode: CampaignTriggerMode,
  keywords: string[]
) {
  return triggerMode === "ANY_COMMENT" || keywords.some((keyword) => keyword.trim());
}

export function canAdvancePublicReplyStep(
  enabled: boolean,
  replies: Array<string | undefined>
) {
  return !enabled || replies.some((reply) => reply?.trim());
}

export function mediaMatchesCampaignPost(storedPostId: string, incomingMediaId: string) {
  if (storedPostId === "ANY") return true;
  return storedPostId.trim() === incomingMediaId.trim();
}
