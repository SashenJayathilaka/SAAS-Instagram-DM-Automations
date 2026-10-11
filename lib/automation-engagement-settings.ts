export const DEFAULT_PHONE_CAPTURE_PROMPT =
  "Enter your phone number";
export const DEFAULT_PHONE_CAPTURE_RETRY = "Oops! Please enter a valid phone number including country code e.g. +1 (949) 653-7130";
export const DEFAULT_EMAIL_CAPTURE_RETRY = "Oops! Please enter a valid email address";
export const FOLLOW_UP_CONDITIONS = [
  { value: "ALWAYS", label: "Always", group: "" },
  { value: "SEEN", label: "Seen message", group: "Message" },
  { value: "NOT_SEEN", label: "Not seen message", group: "Message" },
  { value: "REACTED", label: "Reacted with emoji", group: "Message" },
  { value: "CLICKED", label: "Clicked the link", group: "Link" },
  { value: "NOT_CLICKED", label: "Didn’t click the link", group: "Link" },
  { value: "FOLLOWED", label: "Followed you", group: "Follow" },
  { value: "UNFOLLOWED", label: "Unfollowed you", group: "Follow" },
] as const;
export const DEFAULT_EMAIL_CAPTURE_PROMPT =
  "Enter your email";
export const DEFAULT_FOLLOW_UP_MESSAGE =
  "Hey 👋 Just checking in to make sure you saw my last message, let me know what you think!";
export const FOLLOW_UP_DELAYS = [0.5, 1, 5, 10, 15, 30, 60, 180, 360, 720] as const;
export const MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000;

export type EngagementSettings = {
  phoneCaptureEnabled?: boolean;
  phoneCapturePrompt?: string | null;
  phoneCaptureRetryMessage?: string | null;
  followUpCondition?: string;
  emailCaptureEnabled?: boolean;
  emailCapturePrompt?: string | null;
  emailCaptureRetryMessage?: string | null;
  followUpEnabled?: boolean;
  followUpMessage?: string | null;
  followUpDelayMinutes?: number;
};

export function validateEngagementSettings(
  settings: EngagementSettings,
  sendDm: boolean,
  openingDm: boolean,
) {
  if (!sendDm) return null;
  if (
    settings.followUpEnabled &&
    !openingDm
  )
    return "Enable Opening DM before sending a follow-up.";
  if (
    settings.emailCaptureEnabled &&
    (!settings.emailCapturePrompt?.trim() ||
      settings.emailCapturePrompt.length > 900)
  )
    return "Add an email request between 1 and 900 characters.";
  if (
    settings.phoneCaptureEnabled &&
    (!settings.phoneCapturePrompt?.trim() ||
      settings.phoneCapturePrompt.length > 900)
  )
    return "Add a phone request between 1 and 900 characters.";
  for (const [enabled, retry] of [[settings.emailCaptureEnabled, settings.emailCaptureRetryMessage], [settings.phoneCaptureEnabled, settings.phoneCaptureRetryMessage]] as const) {
    if (enabled && retry != null && (!retry.trim() || retry.length > 900)) return "Add a retry message between 1 and 900 characters.";
  }
  if (
    settings.followUpEnabled &&
    settings.followUpCondition &&
    !FOLLOW_UP_CONDITIONS.some((c) => c.value === settings.followUpCondition)
  )
    return "Choose a supported follow-up condition.";
  if (
    settings.followUpEnabled &&
    (!settings.followUpMessage?.trim() || settings.followUpMessage.length > 900)
  )
    return "Add a follow-up message between 1 and 900 characters.";
  if (
    settings.followUpEnabled &&
    !FOLLOW_UP_DELAYS.includes(
      settings.followUpDelayMinutes as (typeof FOLLOW_UP_DELAYS)[number],
    )
  )
    return "Choose a supported follow-up delay.";
  return null;
}

export function parseEmailReply(
  text: string,
): { kind: "email"; email: string } | { kind: "skip" | "stop" | "invalid" } {
  const clean = text.trim();
  if (/^(stop|unsubscribe|cancel)$/i.test(clean)) return { kind: "stop" };
  if (/^(skip|no thanks)$/i.test(clean)) return { kind: "skip" };
  // Capture only a whole reply containing one address, never extract addresses
  // incidentally mentioned in a conversation or arbitrary display-name strings.
  if (
    clean.length <= 254 &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i.test(
      clean,
    )
  ) {
    const [local] = clean.split("@");
    if (
      local.length <= 64 &&
      !local.startsWith(".") &&
      !local.endsWith(".") &&
      !local.includes("..")
    )
      return { kind: "email", email: clean.toLowerCase() };
  }
  return { kind: "invalid" };
}

export function messagingWindowOpen(inboundAt: Date, now = new Date()) {
  const age = now.getTime() - inboundAt.getTime();
  return Number.isFinite(age) && age >= 0 && age < MESSAGING_WINDOW_MS;
}

export function followUpEligible(
  input: {
    inboundAt: Date;
    latestInboundAt: Date | null;
    dueAt: Date;
    expiresAt: Date;
  },
  now = new Date(),
) {
  return (
    input.dueAt <= now &&
    input.expiresAt > now &&
    messagingWindowOpen(input.inboundAt, now) &&
    input.latestInboundAt !== null &&
    input.latestInboundAt.getTime() <= input.inboundAt.getTime()
  );
}

export function emailRequestMessage(prompt: string) {
  return prompt.trim();
}

export function parsePhoneReply(
  text: string,
): { kind: "phone"; phone: string } | { kind: "skip" | "stop" | "invalid" } {
  const command = parseEmailReply(text);
  if (command.kind === "stop" || command.kind === "skip") return command;
  const clean = text.trim();
  const digits = clean.replace(/[\s().-]/g, "");
  return /^\+?[1-9]\d{6,14}$/.test(digits) && /^[+\d\s().-]+$/.test(clean)
    ? { kind: "phone", phone: digits }
    : { kind: "invalid" };
}
export function followUpConditionMatches(
  condition: string,
  state: {
    seen: boolean;
    reacted: boolean;
    clicked: boolean;
    baselineFollows: boolean | null;
    follows: boolean | null;
  },
) {
  switch (condition) {
    case "ALWAYS":
      return true;
    case "SEEN":
      return state.seen;
    case "NOT_SEEN":
      return !state.seen;
    case "REACTED":
      return state.reacted;
    case "CLICKED":
      return state.clicked;
    case "NOT_CLICKED":
      return !state.clicked;
    case "FOLLOWED":
      return state.baselineFollows === false && state.follows === true;
    case "UNFOLLOWED":
      return state.baselineFollows === true && state.follows === false;
    default:
      return false;
  }
}
export function hasProEngagement(
  settings: EngagementSettings & { followGateRequired?: boolean },
) {
  return Boolean(
    settings.emailCaptureEnabled ||
    settings.phoneCaptureEnabled ||
    settings.followUpEnabled ||
    settings.followGateRequired,
  );
}
export function normalizeEngagementSettings(settings: EngagementSettings) {
  return {
    emailCaptureEnabled: settings.emailCaptureEnabled === true,
    emailCapturePrompt:
      settings.emailCapturePrompt?.trim() || DEFAULT_EMAIL_CAPTURE_PROMPT,
    emailCaptureRetryMessage: settings.emailCaptureRetryMessage ?? DEFAULT_EMAIL_CAPTURE_RETRY,
    phoneCaptureEnabled: settings.phoneCaptureEnabled === true,
    phoneCapturePrompt:
      settings.phoneCapturePrompt?.trim() || DEFAULT_PHONE_CAPTURE_PROMPT,
    phoneCaptureRetryMessage: settings.phoneCaptureRetryMessage ?? DEFAULT_PHONE_CAPTURE_RETRY,
    followUpEnabled: settings.followUpEnabled === true,
    followUpMessage:
      settings.followUpMessage?.trim() || DEFAULT_FOLLOW_UP_MESSAGE,
    followUpDelayMinutes: settings.followUpDelayMinutes ?? 30,
    followUpCondition: settings.followUpCondition || "ALWAYS",
  };
}

export function followUpDelayLabel(minutes: number) {
  if (minutes < 1) return `${minutes * 60} seconds`;
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  if (minutes === 1440) return "1 day";
  return `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`;
}
export function followUpConditionLabel(condition = "ALWAYS") {
  return ({ALWAYS:"Always", SEEN:"if seen message", NOT_SEEN:"if not seen message", REACTED:"if reacted with emoji", CLICKED:"if clicked link", NOT_CLICKED:"if not clicked link", FOLLOWED:"if followed you", UNFOLLOWED:"if unfollowed you"} as Record<string,string>)[condition] || "Always";
}
