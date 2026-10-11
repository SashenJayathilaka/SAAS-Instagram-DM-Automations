"use server";

import {
  adminFormString,
  createAdminAuditLog,
  requireAdminAction,
} from "@/actions/admin/safe-actions";
import { isMessagingReviewMode } from "@/lib/messaging-review-mode";
import { client } from "@/lib/prisma";
import {
  PRIVATE_REPLY_PREFLIGHT_EVENTS,
  sendPrivateReplyPreflight,
  type PrivateReplyPreflightEvent,
  type PrivateReplyPreflightResult,
  type SafePrivateReplyMetaError,
} from "@/lib/private-reply-preflight";

export type AdminPrivateReplyPreflightActionResult = {
  status: number;
  event?: PrivateReplyPreflightEvent;
  message: string;
  metaError?: SafePrivateReplyMetaError;
};

function resultMessage(result: PrivateReplyPreflightResult) {
  if (result.ok) {
    return "Meta accepted the private reply request.";
  }

  const messages = {
    PRIVATE_REPLY_PREFLIGHT_FAILED_CAPABILITY:
      "Meta rejected the app capability for Instagram private replies.",
    PRIVATE_REPLY_PREFLIGHT_FAILED_PERMISSION:
      "The stored Page token does not have the required messaging permission.",
    PRIVATE_REPLY_PREFLIGHT_FAILED_TOKEN:
      "The stored Page token is invalid or expired. Reconnect the account.",
    PRIVATE_REPLY_PREFLIGHT_FAILED_WINDOW:
      "Meta rejected the comment recipient or private-reply window. Use a fresh eligible comment.",
    PRIVATE_REPLY_PREFLIGHT_FAILED_UNKNOWN:
      "Meta rejected the request for an unclassified reason.",
  } satisfies Record<Exclude<PrivateReplyPreflightResult["event"], "PRIVATE_REPLY_PREFLIGHT_SENT">, string>;
  return messages[result.event];
}

async function auditPreflightEvent(input: {
  admin: Awaited<ReturnType<typeof requireAdminAction>>;
  event: PrivateReplyPreflightEvent;
  integrationId: string;
  username: string | null;
  hasCommentId: boolean;
  messageLength: number;
  metaError?: SafePrivateReplyMetaError;
}) {
  const successful = input.event === PRIVATE_REPLY_PREFLIGHT_EVENTS.SENT;
  await createAdminAuditLog({
    admin: input.admin,
    action: input.event,
    targetType: "Integration",
    targetId: input.integrationId,
    targetLabel: input.username ? `@${input.username}` : "Instagram integration",
    reason: "Instagram private reply preflight",
    metadata: {
      hasCommentId: input.hasCommentId,
      messageLength: input.messageLength,
      metaError: input.metaError,
    },
    status:
      input.event === PRIVATE_REPLY_PREFLIGHT_EVENTS.ATTEMPTED || successful
        ? "SUCCESS"
        : "FAILED",
    error: successful ? undefined : input.metaError?.message,
  });
}

export async function adminPrivateReplyPreflightAction(
  formData: FormData
): Promise<AdminPrivateReplyPreflightActionResult> {
  const admin = await requireAdminAction();

  if (!isMessagingReviewMode()) {
    return {
      status: 403,
      message:
        "Messaging review mode is disabled. Set NEXT_PUBLIC_MESSAGING_REVIEW_MODE=true and restart the app.",
    };
  }

  const integrationId = adminFormString(formData, "integrationId");
  const commentId = adminFormString(formData, "commentId");
  const message = adminFormString(formData, "message");
  const confirmed = adminFormString(formData, "confirmed") === "yes";

  if (!integrationId || !commentId || !message || !confirmed) {
    return {
      status: 400,
      message:
        "Connected account, fresh comment_id, message, and the fresh-comment confirmation are required.",
    };
  }

  const integration = await client.integrations.findUnique({
    where: { id: integrationId },
    select: {
      id: true,
      name: true,
      status: true,
      instagramId: true,
      instagramUsername: true,
      token: true,
      expiresAt: true,
    },
  });

  if (
    !integration ||
    integration.name !== "INSTAGRAM" ||
    integration.status === "DISCONNECTED"
  ) {
    return {
      status: 404,
      message: "The selected connected Instagram integration was not found.",
    };
  }

  await auditPreflightEvent({
    admin,
    event: PRIVATE_REPLY_PREFLIGHT_EVENTS.ATTEMPTED,
    integrationId: integration.id,
    username: integration.instagramUsername,
    hasCommentId: true,
    messageLength: message.length,
  });

  if (!integration.token || !integration.instagramId) {
    const metaError = {
      message: !integration.token
        ? "Stored Page token is missing."
        : "Connected Instagram ID is missing.",
    };
    const event = !integration.token
      ? PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_TOKEN
      : PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_UNKNOWN;
    console.warn(`[private-reply-preflight] ${event}`, {
      integrationId: integration.id,
      connectedUsername: integration.instagramUsername,
      hasInstagramId: Boolean(integration.instagramId),
      hasCommentId: true,
      messageLength: message.length,
      metaError,
    });
    await auditPreflightEvent({
      admin,
      event,
      integrationId: integration.id,
      username: integration.instagramUsername,
      hasCommentId: true,
      messageLength: message.length,
      metaError,
    });
    return {
      status: 400,
      event,
      message: metaError.message,
      metaError,
    };
  }

  if (
    integration.expiresAt &&
    integration.expiresAt.getTime() <= Date.now()
  ) {
    const event = PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_TOKEN;
    const metaError = { message: "Stored Page token is expired." };
    console.warn(`[private-reply-preflight] ${event}`, {
      integrationId: integration.id,
      connectedUsername: integration.instagramUsername,
      hasInstagramId: true,
      hasCommentId: true,
      messageLength: message.length,
      metaError,
    });
    await auditPreflightEvent({
      admin,
      event,
      integrationId: integration.id,
      username: integration.instagramUsername,
      hasCommentId: true,
      messageLength: message.length,
      metaError,
    });
    return {
      status: 400,
      event,
      message: metaError.message,
      metaError,
    };
  }

  const result = await sendPrivateReplyPreflight({
    token: integration.token,
    instagramId: integration.instagramId,
    commentId,
    message,
    integrationId: integration.id,
    connectedUsername: integration.instagramUsername,
  });

  await auditPreflightEvent({
    admin,
    event: result.event,
    integrationId: integration.id,
    username: integration.instagramUsername,
    hasCommentId: true,
    messageLength: message.length,
    metaError: result.ok ? undefined : result.metaError,
  });

  return {
    status: result.ok ? 200 : 400,
    event: result.event,
    message: resultMessage(result),
    metaError: result.ok ? undefined : result.metaError,
  };
}
