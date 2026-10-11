export const INSTAGRAM_PERMISSION_SCOPES = {
  basic: "instagram_business_basic",
  comments: "instagram_business_manage_comments",
  messages: "instagram_business_manage_messages",
} as const;

export type InstagramCapabilityState = "granted" | "missing" | "unknown";

export type InstagramPermissionCapabilities = {
  authoritative: boolean;
  grantedScopes: string[];
  basic: InstagramCapabilityState;
  comments: InstagramCapabilityState;
  messages: InstagramCapabilityState;
  missingScopes: string[];
};

type DiagnosticsLike = unknown;

function normalizeScopes(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const scopes = Array.from(
    new Set(
      value
        .map((scope) => (typeof scope === "string" ? scope.trim() : ""))
        .filter(Boolean)
    )
  );
  return scopes;
}

export function getInstagramPermissionCapabilities(
  diagnostics: DiagnosticsLike
): InstagramPermissionCapabilities {
  const record =
    diagnostics && typeof diagnostics === "object"
      ? (diagnostics as Record<string, unknown>)
      : null;
  const scopes = normalizeScopes(record?.permissions);
  const authoritative = scopes !== null;
  const grantedScopes = scopes ?? [];

  const stateFor = (scope: string): InstagramCapabilityState => {
    if (!authoritative) return "unknown";
    return grantedScopes.includes(scope) ? "granted" : "missing";
  };

  const basic = stateFor(INSTAGRAM_PERMISSION_SCOPES.basic);
  const comments = stateFor(INSTAGRAM_PERMISSION_SCOPES.comments);
  const messages = stateFor(INSTAGRAM_PERMISSION_SCOPES.messages);

  return {
    authoritative,
    grantedScopes,
    basic,
    comments,
    messages,
    missingScopes: authoritative
      ? Object.values(INSTAGRAM_PERMISSION_SCOPES).filter(
          (scope) => !grantedScopes.includes(scope)
        )
      : [],
  };
}

export function instagramPermissionBlockMessage(
  capabilities: InstagramPermissionCapabilities,
  options: { needsMessages?: boolean } = {}
): string | null {
  // Older/legacy connections may not have a persisted permissions array. Do not
  // create false negatives for them; runtime API failures remain the fallback.
  if (!capabilities.authoritative) return null;

  if (capabilities.basic === "missing") {
    return "Reconnect Instagram and allow profile and media access before activating automations.";
  }
  if (capabilities.comments === "missing") {
    return "Reconnect Instagram and enable Access and manage comments before activating automations.";
  }
  if (options.needsMessages && capabilities.messages === "missing") {
    return "Reconnect Instagram and enable Access and manage messages before sending DMs.";
  }
  return null;
}
