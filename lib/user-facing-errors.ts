export type UserFacingMetaError = {
  title: string;
  detail?: string;
  severity: "ok" | "warning" | "error" | "unknown";
};

export function formatUserFacingMetaError(errorMessage?: string | null, eventType?: string | null): UserFacingMetaError {
  const text = `${eventType ?? ""} ${errorMessage ?? ""}`.toLowerCase();

  if (!errorMessage && !eventType) {
    return { title: "No failures", severity: "ok" };
  }

  if (text.includes("subscribed_fields") || (text.includes("code=100") && text.includes("field"))) {
    return {
      title: "Webhook subscription needs review",
      detail: "Meta rejected one or more webhook fields. AP3K can still process comments if the comments webhook is active.",
      severity: "warning",
    };
  }

  if (
    text.includes("dm_access_disabled") ||
    text.includes("disabled access to instagram direct") ||
    text.includes("subcode=2534041")
  ) {
    return {
      title: "Instagram message access is off",
      detail: "In Instagram, open Messages and story replies → Message controls, then enable message access for connected tools. Use a new comment to test after enabling it.",
      severity: "error",
    };
  }

  if (text.includes("dm_capability_missing") || text.includes("code=3") || text.includes("instagram_manage_messages")) {
    return {
      title: "Private DM capability pending",
      detail: "Meta blocks private replies until instagram_manage_messages is approved.",
      severity: "warning",
    };
  }

  if (text.includes("token expired") || text.includes("expired token") || text.includes("oauth") && text.includes("expired")) {
    return {
      title: "Instagram token expired",
      detail: "Reconnect the Instagram account to refresh access.",
      severity: "error",
    };
  }

  if (eventType) {
    return {
      title: "Connection needs attention",
      detail: "Open troubleshooting for technical details.",
      severity: "warning",
    };
  }

  return {
    title: "Connection needs attention",
    detail: "Open troubleshooting for technical details.",
    severity: "unknown",
  };
}
