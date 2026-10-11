import type { AccountWebhookStatus } from "@/lib/account-webhook-diagnostics";

export type CampaignHealthInput = {
  connectedAccount?: {
    id?: string | null;
    username?: string | null;
    instagramId?: string | null;
    status?: string | null;
    tokenPresent?: boolean;
    reconnectRequired?: boolean;
  } | null;
  campaign?: {
    id?: string;
    active?: boolean | null;
    needsReview?: boolean | null;
    reviewReason?: string | null;
    triggerMode?: string | null;
    sendPrivateDm?: boolean | null;
    keywords?: { word?: string | null }[];
    listener?: {
      prompt?: string | null;
      commentReply?: string | null;
      commentReply2?: string | null;
      commentReply3?: string | null;
    } | null;
    posts?: { postid?: string | null }[];
  } | null;
  webhookStatus?: AccountWebhookStatus;
  selectedPostOwner?: {
    integrationId?: string | null;
    instagramId?: string | null;
    userId?: string | null;
    verified?: boolean;
  } | null;
  messagingCapabilityPending?: boolean;
};

export type CampaignHealthResult = {
  okToActivate: boolean;
  warnings: string[];
  blockers: string[];
  status: "Live" | "Paused" | "Draft" | "Needs review" | "Archived";
  selectedPostStatus: "any" | "current" | "stale" | "unknown" | "missing";
};

export function assessCampaignSetupHealth(input: CampaignHealthInput): CampaignHealthResult {
  const campaign = input.campaign;
  const postId = campaign?.posts?.[0]?.postid;
  const hasPublicReply = Boolean(
    campaign?.listener?.commentReply?.trim() ||
    campaign?.listener?.commentReply2?.trim() ||
    campaign?.listener?.commentReply3?.trim()
  );
  const sendPrivateDm = campaign?.sendPrivateDm !== false;
  const hasPrivateDm = sendPrivateDm && Boolean(campaign?.listener?.prompt?.trim());
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!input.connectedAccount?.instagramId) blockers.push("Connect Instagram before activating this automation.");
  if (input.connectedAccount?.status && input.connectedAccount.status !== "CONNECTED") {
    blockers.push("Instagram account is not connected.");
  }
  if (input.connectedAccount?.reconnectRequired) blockers.push("Reconnect Instagram before activating this automation.");
  if (!input.connectedAccount?.tokenPresent) blockers.push("Instagram token is missing.");
  if (campaign?.needsReview) blockers.push(campaign.reviewReason || "Automation needs review after Instagram reconnect.");
  if (!postId) blockers.push("Select Any Post or a current-account Instagram post.");
  if (campaign?.triggerMode !== "ANY_COMMENT" && !(campaign?.keywords ?? []).some((keyword) => keyword.word?.trim())) {
    blockers.push("Add a keyword or switch trigger to Any Comment.");
  }
  if (!hasPublicReply && !hasPrivateDm) blockers.push("Enable public reply or private DM.");
  if (sendPrivateDm && !hasPrivateDm) blockers.push("Write a private DM message or disable AP3K DM mode.");

  const selectedPostStatus = selectedPostHealth({
    postId,
    connectedInstagramId: input.connectedAccount?.instagramId,
    connectedIntegrationId: input.connectedAccount?.id,
    selectedPostOwner: input.selectedPostOwner,
  });
  if (selectedPostStatus === "stale") blockers.push("Selected post belongs to a different Instagram account.");
  if (input.webhookStatus === "only_messaging_active") {
    warnings.push("Messaging webhooks are arriving, but comment delivery is not active yet.");
  } else if (input.webhookStatus === "no_delivery" || input.webhookStatus === "test_only") {
    warnings.push("No real comment webhook has been received for this account yet.");
  } else if (input.webhookStatus === "parser_failed") {
    blockers.push("A comment-like webhook arrived but could not be parsed.");
  }
  if (sendPrivateDm && input.messagingCapabilityPending) {
    warnings.push("Private DM is enabled, but Meta messaging capability may still be pending.");
  }
  if (!sendPrivateDm) warnings.push("External DM mode: AP3K will not send private DMs.");

  return {
    okToActivate: blockers.length === 0,
    warnings,
    blockers,
    selectedPostStatus,
    status: campaign?.needsReview ? "Needs review" : campaign?.active ? "Live" : campaign?.id ? "Paused" : "Draft",
  };
}

export function selectedPostHealth(input: {
  postId?: string | null;
  connectedInstagramId?: string | null;
  connectedIntegrationId?: string | null;
  selectedPostOwner?: CampaignHealthInput["selectedPostOwner"];
}): CampaignHealthResult["selectedPostStatus"] {
  if (!input.postId) return "missing";
  if (["ANY", "NEXT"].includes(input.postId ?? "")) return "any";
  if (!input.selectedPostOwner) return "unknown";
  if (
    input.selectedPostOwner.integrationId &&
    input.connectedIntegrationId &&
    input.selectedPostOwner.integrationId !== input.connectedIntegrationId
  ) return "stale";
  if (
    input.selectedPostOwner.instagramId &&
    input.connectedInstagramId &&
    input.selectedPostOwner.instagramId !== input.connectedInstagramId
  ) return "stale";
  return input.selectedPostOwner.verified ? "current" : "unknown";
}

export function planReconnectCampaignImpact(input: {
  previousInstagramId?: string | null;
  previousUsername?: string | null;
  nextInstagramId?: string | null;
  nextUsername?: string | null;
  campaigns: { id: string; active?: boolean | null; posts?: { postid?: string | null }[] }[];
}) {
  const changed = Boolean(
    input.previousInstagramId &&
    input.nextInstagramId &&
    input.previousInstagramId !== input.nextInstagramId
  );
  if (!changed) {
    return {
      changed,
      affectedCampaignIds: [] as string[],
      pauseCampaignIds: [] as string[],
      reason: null as string | null,
    };
  }
  const affectedCampaigns = input.campaigns.filter((campaign) => !["ANY", "NEXT"].includes(campaign.posts?.[0]?.postid ?? ""));
  const affectedCampaignIds = affectedCampaigns.map((campaign) => campaign.id);
  return {
    changed,
    affectedCampaignIds,
    pauseCampaignIds: affectedCampaigns.filter((campaign) => campaign.active).map((campaign) => campaign.id),
    reason: [
      "Instagram account changed.",
      input.previousUsername || input.previousInstagramId
        ? `Previous: ${input.previousUsername ? `@${input.previousUsername}` : "unknown"} / ${input.previousInstagramId ?? "unknown"}.`
        : null,
      input.nextUsername || input.nextInstagramId
        ? `Current: ${input.nextUsername ? `@${input.nextUsername}` : "unknown"} / ${input.nextInstagramId ?? "unknown"}.`
        : null,
      "Review automations before reactivating.",
    ].filter(Boolean).join(" "),
  };
}
