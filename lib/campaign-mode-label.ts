export function getCampaignModeLabel(
  externalDm: boolean,
  appReviewMode = false,
  messagingReviewMode = false
) {
  if (messagingReviewMode) {
    return externalDm
      ? { short: "Comment", full: "Comment reply only" }
      : { short: "Both", full: "Comment reply + DM active" };
  }

  if (appReviewMode) {
    return externalDm
      ? { short: "Comment", full: "Comment reply mode" }
      : { short: "Comment", full: "Comment reply active" };
  }

  return externalDm
    ? { short: "Comment", full: "Comment reply" }
    : { short: "DM", full: "AP3K DM" };
}
