import axios from "axios";
import { META_GRAPH_API_BASE_URL } from "@/lib/fetch";

export const DEFAULT_PRIVATE_REPLY_MESSAGE =
  "Thanks for commenting. Here is the information you requested.";

export const PRIVATE_REPLY_PREFLIGHT_EVENTS = {
  ATTEMPTED: "PRIVATE_REPLY_PREFLIGHT_ATTEMPTED",
  SENT: "PRIVATE_REPLY_PREFLIGHT_SENT",
  FAILED_CAPABILITY: "PRIVATE_REPLY_PREFLIGHT_FAILED_CAPABILITY",
  FAILED_PERMISSION: "PRIVATE_REPLY_PREFLIGHT_FAILED_PERMISSION",
  FAILED_TOKEN: "PRIVATE_REPLY_PREFLIGHT_FAILED_TOKEN",
  FAILED_WINDOW: "PRIVATE_REPLY_PREFLIGHT_FAILED_WINDOW",
  FAILED_UNKNOWN: "PRIVATE_REPLY_PREFLIGHT_FAILED_UNKNOWN",
} as const;

export type PrivateReplyPreflightEvent =
  (typeof PRIVATE_REPLY_PREFLIGHT_EVENTS)[keyof typeof PRIVATE_REPLY_PREFLIGHT_EVENTS];

export type PrivateReplyPreflightFailureEvent = Exclude<
  PrivateReplyPreflightEvent,
  | typeof PRIVATE_REPLY_PREFLIGHT_EVENTS.ATTEMPTED
  | typeof PRIVATE_REPLY_PREFLIGHT_EVENTS.SENT
>;

export type SafePrivateReplyMetaError = {
  code?: number;
  subcode?: number;
  type?: string;
  message?: string;
  fbtrace_id?: string;
};

export type PrivateReplyPreflightResult =
  | {
      ok: true;
      event: typeof PRIVATE_REPLY_PREFLIGHT_EVENTS.SENT;
    }
  | {
      ok: false;
      event: PrivateReplyPreflightFailureEvent;
      metaError: SafePrivateReplyMetaError;
    };

export type SafePrivateReplyDiagnostics = {
  integrationStatus: string;
  connectedUsername: string | null;
  instagramIdPresent: boolean;
  tokenPresent: boolean;
  tokenExpiry: string | null;
  messagingScopeDetected: boolean | null;
  grantedScopes: string[];
  scopeDetection: "detected" | "unavailable" | "not_checked";
};

const TOKEN_ERROR_SUBCODES = new Set([458, 459, 460, 463, 464, 467]);
const PERMISSION_ERROR_CODES = new Set([10, 200, 299]);

function normalizeMessage(value?: string) {
  return (value ?? "").toLowerCase();
}
export function extractSafePrivateReplyMetaError(
  error: unknown
): SafePrivateReplyMetaError {
  if (!axios.isAxiosError(error)) {
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  const raw = error.response?.data as
    | {
        error?: {
          code?: number;
          error_subcode?: number;
          type?: string;
          message?: string;
          fbtrace_id?: string;
        };
      }
    | undefined;
  const meta = raw?.error;

  return {
    code: meta?.code,
    subcode: meta?.error_subcode,
    type: meta?.type,
    message: meta?.message ?? error.message,
    fbtrace_id: meta?.fbtrace_id,
  };
}

export function classifyPrivateReplyPreflightError(
  error: SafePrivateReplyMetaError
): PrivateReplyPreflightFailureEvent {
  const message = normalizeMessage(error.message);

  if (
    error.code === 3 ||
    message.includes("does not have the capability") ||
    message.includes("capability to make this api call")
  ) {
    return PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_CAPABILITY;
  }

  if (
    error.code === 190 ||
    (error.subcode !== undefined && TOKEN_ERROR_SUBCODES.has(error.subcode)) ||
    message.includes("invalid oauth access token") ||
    message.includes("access token has expired") ||
    message.includes("cannot parse access token") ||
    message.includes("expired access token")
  ) {
    return PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_TOKEN;
  }

  if (
    (error.code !== undefined && PERMISSION_ERROR_CODES.has(error.code)) ||
    message.includes("instagram_manage_messages") ||
    message.includes("permission") ||
    message.includes("scope") ||
    message.includes("not authorized") ||
    message.includes("access denied")
  ) {
    return PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_PERMISSION;
  }

  if (
    error.code === 100 ||
    message.includes("comment") ||
    message.includes("recipient") ||
    message.includes("private reply") ||
    message.includes("7 day") ||
    message.includes("seven day") ||
    message.includes("reply window") ||
    message.includes("outside the allowed window") ||
    message.includes("already sent") ||
    message.includes("unsupported post request") ||
    message.includes("object does not exist")
  ) {
    return PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_WINDOW;
  }

  return PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_UNKNOWN;
}

export function buildSafePrivateReplyDiagnostics(input: {
  integrationStatus: string;
  connectedUsername?: string | null;
  instagramId?: string | null;
  token?: string | null;
  tokenExpiry?: Date | string | null;
  grantedScopes?: string[];
  scopeDetection?: SafePrivateReplyDiagnostics["scopeDetection"];
}): SafePrivateReplyDiagnostics {
  const tokenExpiry =
    input.tokenExpiry instanceof Date
      ? input.tokenExpiry.toISOString()
      : input.tokenExpiry ?? null;
  const grantedScopes = [...(input.grantedScopes ?? [])];
  const scopeDetection = input.scopeDetection ?? "not_checked";

  return {
    integrationStatus: input.integrationStatus,
    connectedUsername: input.connectedUsername ?? null,
    instagramIdPresent: Boolean(input.instagramId),
    tokenPresent: Boolean(input.token),
    tokenExpiry,
    messagingScopeDetected:
      scopeDetection === "detected"
        ? grantedScopes.includes("instagram_manage_messages")
        : null,
    grantedScopes,
    scopeDetection,
  };
}

function writeSafePreflightLog(
  event: PrivateReplyPreflightEvent,
  details: {
    integrationId?: string;
    connectedUsername?: string | null;
    hasInstagramId: boolean;
    hasCommentId: boolean;
    messageLength: number;
    metaError?: SafePrivateReplyMetaError;
  }
) {
  const method = event === PRIVATE_REPLY_PREFLIGHT_EVENTS.SENT ? "info" : "warn";
  console[method](`[private-reply-preflight] ${event}`, details);
}

/**
 * Sends exactly one private reply linked to an Instagram comment.
 *
 * This diagnostic intentionally has no direct-DM fallback and does not call
 * the public reply, webhook, campaign, billing, or product automation paths.
 * The access token is used only in the Authorization header and is never
 * returned or logged.
 */
export async function sendPrivateReplyPreflight(input: {
  token: string;
  instagramId: string;
  commentId: string;
  message: string;
  integrationId?: string;
  connectedUsername?: string | null;
}): Promise<PrivateReplyPreflightResult> {
  const safeContext = {
    integrationId: input.integrationId,
    connectedUsername: input.connectedUsername,
    hasInstagramId: Boolean(input.instagramId),
    hasCommentId: Boolean(input.commentId),
    messageLength: input.message.length,
  };

  writeSafePreflightLog(PRIVATE_REPLY_PREFLIGHT_EVENTS.ATTEMPTED, safeContext);

  try {
    await axios.post(
      `${META_GRAPH_API_BASE_URL}/${input.instagramId}/messages`,
      {
        recipient: { comment_id: input.commentId },
        message: { text: input.message },
      },
      {
        headers: {
          Authorization: `Bearer ${input.token}`,
          "Content-Type": "application/json",
        },
      }
    );

    writeSafePreflightLog(PRIVATE_REPLY_PREFLIGHT_EVENTS.SENT, safeContext);
    return {
      ok: true,
      event: PRIVATE_REPLY_PREFLIGHT_EVENTS.SENT,
    };
  } catch (error) {
    const metaError = extractSafePrivateReplyMetaError(error);
    const event = classifyPrivateReplyPreflightError(metaError);
    writeSafePreflightLog(event, { ...safeContext, metaError });
    return {
      ok: false,
      event,
      metaError,
    };
  }
}
