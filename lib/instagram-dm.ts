import { resolveAttachmentMessage } from "@/lib/attachment-delivery";
import { knownFollowStatus, withTrackedLinks } from "@/lib/automation-tracking";
import axios from "axios";
import { productImageDeliveryUrl } from "@/lib/product-card";
import { getSafeMetaError } from "@/lib/fetch";
import { normalizeLinkButtons, type LinkButton } from "@/lib/link-buttons";

export const INSTAGRAM_GRAPH_BASE_URL =
  process.env.INSTAGRAM_GRAPH_BASE_URL ?? "https://graph.instagram.com";
export const INSTAGRAM_GRAPH_VERSION =
  process.env.INSTAGRAM_GRAPH_VERSION ?? process.env.META_GRAPH_VERSION ?? "v25.0";
export const INSTAGRAM_GRAPH_API_BASE_URL = `${INSTAGRAM_GRAPH_BASE_URL}/${INSTAGRAM_GRAPH_VERSION}`;

type CtaMode = "product_card" | "button_template" | "postback_button" | "follow_gate_card" | "text_link_fallback" | "none";

export type InstagramPostbackButton = {
  title: string;
  payload: string;
};

export type FollowGatePromptState = "INITIAL" | "NOT_FOLLOWING" | "UNAVAILABLE";

export type FollowGatePrompt = {
  username?: string | null;
  state: FollowGatePromptState;
  message?: string | null;
  verificationButtonTitle?: string | null;
  verificationPayload?: string | null;
};

type InstagramMessagePayload =
  | {
      text: string;
      quick_replies?: Array<{ content_type: "text"; title: string; payload: string }>;
    }
  | {
      attachment: {
        type: "template" | "image" | "video" | "audio" | "file";
        payload: Record<string, unknown>;
      };
      quick_replies?: Array<{ content_type: "text"; title: string; payload: string }>;
    };

export type SafeMetaApiError = {
  status?: number;
  code?: number;
  subcode?: number;
  type?: string;
  message?: string;
  fbtrace_id?: string;
};

export type PrivateReplyResult =
  | {
      ok: true;
      endpoint: string;
      ctaMode: CtaMode;
    }
  | {
      ok: false;
      reason: "dm_capability_missing" | "dm_access_disabled" | "meta_api_error";
      endpoint: string;
      metaError: SafeMetaApiError;
      ctaMode: CtaMode;
    };

function extractFbtraceId(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const raw = error.response?.data as any;
  return raw?.error?.fbtrace_id ?? undefined;
}

function buildMetaError(error: unknown): SafeMetaApiError {
  const safe = getSafeMetaError(error);
  return {
    status: safe.status,
    code: safe.code,
    subcode: safe.subcode,
    type: safe.type,
    message: safe.message,
    fbtrace_id: extractFbtraceId(error),
  };
}

function isCapabilityError(error: unknown): boolean {
  return getSafeMetaError(error).code === 3;
}

function isMessagingAccessDisabledError(error: unknown): boolean {
  const safe = getSafeMetaError(error);
  const message = (safe.message ?? "").toLowerCase();
  return Boolean(
    safe.subcode === 2534041 ||
    (safe.code === 200 && message.includes("disabled access to instagram direct"))
  );
}

function shouldTryTextFallback(error: unknown): boolean {
  const safe = getSafeMetaError(error);
  const message = (safe.message ?? "").toLowerCase();
  return Boolean(
    safe.status === 400 ||
    safe.code === 100 ||
    message.includes("invalid message") ||
    message.includes("button") ||
    message.includes("template")
  );
}

function normalizeCtaUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(withProtocol);
    return parsed.toString();
  } catch {
    return raw;
  }
}

function normalizeButtonTitle(value?: string | null) {
  const title = value?.trim() || "Open link";
  return Array.from(title).slice(0, 20).join("");
}

function buildButtonPayload(
  message: string,
  ctaTitle?: string | null,
  ctaUrl?: string | null,
  linkButtons?: LinkButton[]
): { message: InstagramMessagePayload; ctaMode: CtaMode } {
  const text = message.trim() || "Here is the link you requested.";
  const buttons = normalizeLinkButtons(linkButtons, ctaTitle, ctaUrl).filter((button) => button.url);

  if (!buttons.length) {
    return { message: { text }, ctaMode: "none" };
  }

  return {
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text,
          buttons: buttons.map((button) => ({
            type: "web_url",
            title: normalizeButtonTitle(button.label),
            url: button.url,
          })),
        },
      },
    },
    ctaMode: "button_template",
  };
}

function buildPostbackButtonPayload(
  message: string,
  button: InstagramPostbackButton
): { preferred: InstagramMessagePayload; fallback: InstagramMessagePayload } {
  const text = message.trim() || "Tap below to continue.";
  const title = normalizeButtonTitle(button.title);
  const preferred: InstagramMessagePayload = {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text,
        buttons: [{ type: "postback", title, payload: button.payload }],
      },
    },
  };
  const fallback = addQuickReplies(
    { text },
    button.payload,
    [title],
    [button.payload]
  );
  return { preferred, fallback };
}

function buildTextFallbackPayload(
  message: string,
  ctaTitle?: string | null,
  ctaUrl?: string | null,
  linkButtons?: LinkButton[]
): { message: InstagramMessagePayload; ctaMode: CtaMode } {
  const text = message.trim() || "Here is the link you requested.";
  const buttons = normalizeLinkButtons(linkButtons, ctaTitle, ctaUrl).filter((button) => button.url);

  if (!buttons.length) {
    return { message: { text }, ctaMode: "none" };
  }

  const missingLinks = buttons.filter((button) => !text.includes(button.url));
  const suffix = missingLinks.map((button) => `${button.label}: ${button.url}`).join("\n");
  return { message: { text: suffix ? `${text}\n\n${suffix}` : text }, ctaMode: "text_link_fallback" };
}

function addQuickReplies(
  message: InstagramMessagePayload,
  automationId: string,
  replies: string[],
  payloads?: string[]
): InstagramMessagePayload {
  const quickReplies = buildQuickReplies(automationId, replies, payloads);
  return quickReplies.length ? { ...message, quick_replies: quickReplies } as InstagramMessagePayload : message;
}

function normalizeInstagramUsername(value?: string | null) {
  return (value ?? "")
    .trim()
    .replace(/^@+/, "")
    .replace(/[^A-Za-z0-9._]/g, "")
    .slice(0, 30) || "our account";
}

export function getInstagramFollowGatePromptCopy(prompt: FollowGatePrompt) {
  const username = normalizeInstagramUsername(prompt.username);
  const displayHandle = username === "our account" ? "our Instagram account" : `@${username}`;
  const profileUrl = username === "our account"
    ? "https://www.instagram.com/"
    : `https://www.instagram.com/${encodeURIComponent(username)}/`;

  if (prompt.state === "NOT_FOLLOWING") {
    const title = "❌ Not Following Yet!";
    const subtitle = `We couldn't verify your follow. Follow ${displayHandle}, then tap I followed ✅ again.`;
    return { title, subtitle, profileUrl, text: `${title}\n${subtitle}` };
  }

  if (prompt.state === "UNAVAILABLE") {
    const title = "⚠️ Verification delayed";
    const subtitle = `We couldn't verify your follow yet. Follow ${displayHandle}, then tap I followed ✅ again.`;
    return { title, subtitle, profileUrl, text: `${title}\n${subtitle}` };
  }

  const title = "Follow to unlock";
  const subtitle = `Follow ${displayHandle}, then tap I followed ✅ to receive your message.`;
  return { title, subtitle, profileUrl, text: `${title}\n${subtitle}` };
}

function buildFollowGatePayload(automationId: string, prompt: FollowGatePrompt) {
  const copy = getInstagramFollowGatePromptCopy(prompt);
  const verificationPayload = prompt.verificationPayload?.trim() || `AP3K_FOLLOW_CHECK:${automationId}`;
  const text = prompt.message?.trim() || copy.text;
  const verificationButtonTitle = normalizeButtonTitle(prompt.verificationButtonTitle || "I followed ✅");
  const preferred: InstagramMessagePayload = {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text,
        buttons: [
          { type: "web_url", title: "Follow", url: copy.profileUrl },
          { type: "postback", title: verificationButtonTitle, payload: verificationPayload },
        ],
      },
    },
  };
  // Instagram silently drops quick replies attached to a button template.
  // Send the full-width Follow card and verification quick reply separately.
  const reliable: InstagramMessagePayload = {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text,
        buttons: [{ type: "web_url", title: "Follow", url: copy.profileUrl }],
      },
    },
  };
  const verification = addQuickReplies(
    { text: "👇" },
    automationId,
    [verificationButtonTitle],
    [verificationPayload]
  );
  const fallback = addQuickReplies(
    { text },
    automationId,
    [verificationButtonTitle],
    [verificationPayload]
  );
  return { preferred, reliable, verification, fallback, copy };
}

export function buildProductCardPayload(params: { message: string; cardSubtitle?: string | null; mediaUrl?: string | null; linkButtons?: LinkButton[]; ctaTitle?: string | null; ctaUrl?: string | null }): InstagramMessagePayload {
  const buttons = normalizeLinkButtons(params.linkButtons, params.ctaTitle, params.ctaUrl)
    .filter(button => button.url && button.label).slice(0, 3)
    .map(button => ({ type: "web_url", title: Array.from(button.label).slice(0, 20).join(""), url: button.url }));
  return { attachment: { type: "template", payload: { template_type: "generic", image_aspect_ratio: "square", elements: [{
    title: Array.from(params.message.trim()).slice(0, 80).join(""),
    ...(params.cardSubtitle?.trim() ? { subtitle: Array.from(params.cardSubtitle.trim()).slice(0, 80).join("") } : {}),
    image_url: productImageDeliveryUrl(params.mediaUrl) ?? normalizeCtaUrl(params.mediaUrl), buttons,
  }] } } };
}

export function buildCarouselPayload(cards: Array<{ title: string; subtitle: string; image: string; links: LinkButton[] }>): InstagramMessagePayload {
  if (!cards.length || cards.length > 10) throw new Error("A carousel needs 1–10 cards.");
  return { attachment: { type: "template", payload: { template_type: "generic", image_aspect_ratio: "square", elements: cards.map(card => ({
    title: Array.from(card.title.trim()).slice(0, 80).join(""),
    ...(card.subtitle.trim() ? { subtitle: Array.from(card.subtitle.trim()).slice(0, 80).join("") } : {}),
    image_url: productImageDeliveryUrl(card.image) ?? normalizeCtaUrl(card.image),
    buttons: normalizeLinkButtons(card.links).slice(0, 3).map(button => ({ type: "web_url", title: Array.from(button.label).slice(0, 20).join(""), url: button.url })),
  })) } } };
}

async function buildConfiguredPrivateReplyPayload(params: {
  automationId: string;
  message: string;
  responseFormat?: string | null;
  quickReplies?: string[];
  linkButtons?: LinkButton[];
  ctaTitle?: string | null;
  ctaUrl?: string | null;
  cardSubtitle?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
}) {
  if (params.responseFormat === "ATTACHMENT") return {message: await resolveAttachmentMessage(params.mediaUrl),ctaMode: "none" as CtaMode};
  if (params.responseFormat === "PRODUCT_CARD" && params.mediaUrl) return {
    message: buildProductCardPayload(params), ctaMode: "product_card" as CtaMode,
  };
  const quickReplies = params.quickReplies ?? [];
  if (params.responseFormat === "MEDIA" && params.mediaUrl) {
    const mediaUrl = normalizeCtaUrl(params.mediaUrl);
    if (mediaUrl && params.mediaType !== "VIDEO") {
      return {
        message: addQuickReplies({
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: [{ title: Array.from(params.message.trim() || "Here's what you requested.").slice(0, 80).join(""), image_url: mediaUrl }],
            },
          },
        }, params.automationId, quickReplies),
        ctaMode: "none" as CtaMode,
      };
    }
    if (mediaUrl) {
      return {
        message: addQuickReplies({ attachment: { type: "video", payload: { url: mediaUrl, is_reusable: true } } }, params.automationId, quickReplies),
        ctaMode: "none" as CtaMode,
      };
    }
  }
  const preferred = params.responseFormat === "LINK" || params.ctaUrl || params.linkButtons?.length
    ? buildButtonPayload(params.message, params.ctaTitle, params.ctaUrl, params.linkButtons)
    : { message: { text: params.message.trim() || "Thanks for your message!" } as InstagramMessagePayload, ctaMode: "none" as CtaMode };
  return { ...preferred, message: addQuickReplies(preferred.message, params.automationId, quickReplies) };
}

async function postInstagramMessage(
  igBusinessAccountId: string,
  body: unknown,
  token: string,
  log: {
    endpointName: string;
    hasCommentId?: boolean;
    hasCommenterId?: boolean;
    message: InstagramMessagePayload;
  }
): Promise<"ok" | "capability_error"> {
  console.log("[meta-api] send Instagram Graph message request", {
    endpointFamily: "instagram_graph",
    endpointName: log.endpointName,
    hasIgBusinessAccountId: Boolean(igBusinessAccountId),
    hasCommentId: log.hasCommentId,
    hasCommenterId: log.hasCommenterId,
    messageShape: "attachment" in log.message
      ? String(log.message.attachment.payload.template_type ?? log.message.attachment.type)
      : "text",
  });

  try {
    await axios.post(
      `${INSTAGRAM_GRAPH_API_BASE_URL}/${igBusinessAccountId}/messages`,
      body,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    return "ok";
  } catch (err) {
    if (isCapabilityError(err)) return "capability_error";
    throw err;
  }
}

function buildQuickReplies(automationId: string, replies: string[], payloads?: string[]) {
  return replies.slice(0, 4).map((reply, index) => ({
    content_type: "text" as const,
    title: Array.from(reply.trim()).slice(0, 20).join(""),
    payload: payloads?.[index] || `AP3K_QUICK_REPLY:${automationId}:${index}`,
  })).filter((item) => item.title);
}

export type DirectResponseResult =
  | { ok: true; messageIds: string[] }
  | { ok: false; metaError: SafeMetaApiError };

export async function sendInstagramDirectResponse(params: {
  token: string;
  igBusinessAccountId: string;
  recipientId: string;
  automationId: string;
  message: string;
  responseFormat?: string | null;
  quickReplies?: string[];
  linkButtons?: LinkButton[];
  carouselCards?: Array<{ title: string; subtitle: string; image: string; links: LinkButton[] }>;
  quickReplyPayloads?: string[];
  ctaTitle?: string | null;
  ctaUrl?: string | null;
  cardSubtitle?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  typingIndicator?: boolean;
  delaySeconds?: number;
  followGatePrompt?: FollowGatePrompt;
  postbackButton?: InstagramPostbackButton;
  preferQuickReplyForPostback?: boolean;
}): Promise<DirectResponseResult> {
  params = await withTrackedLinks(params);
  const messageIds: string[] = [];
  const quickReplies = buildQuickReplies(params.automationId, params.quickReplies ?? [], params.quickReplyPayloads);

  try {
    if (params.responseFormat === "ATTACHMENT" && !params.postbackButton && !params.followGatePrompt) {
      const id=await postDirectPayload(params,await resolveAttachmentMessage(params.mediaUrl));
      return {ok:true,messageIds:id?[id]:[]};
    }
    if (params.typingIndicator) {
      await sendInstagramSenderAction(params.igBusinessAccountId, params.recipientId, "typing_on", params.token);
    }

    const maximumDelay = [3, 5, 10, 30].includes(Number(params.delaySeconds))
      ? Number(params.delaySeconds)
      : 0;
    if (maximumDelay > 0) {
      const delayMs = (1 + Math.floor(Math.random() * maximumDelay)) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    let mediaFallbackUrl = "";
    if (params.responseFormat === "MEDIA" && params.mediaUrl) {
      const mediaMessage: InstagramMessagePayload = {
        attachment: {
          type: params.mediaType === "VIDEO" ? "video" : "image",
          payload: { url: normalizeCtaUrl(params.mediaUrl), is_reusable: true },
        },
      };
      try {
        const media = await postDirectPayload(params, mediaMessage);
        if (media) messageIds.push(media);
      } catch {
        mediaFallbackUrl = normalizeCtaUrl(params.mediaUrl) ?? "";
      }
    }

    let responseMessage: InstagramMessagePayload;
    let followGateCardSent = false;
    if (params.postbackButton) {
      const payload = buildPostbackButtonPayload(params.message, params.postbackButton);
      responseMessage = params.preferQuickReplyForPostback ? payload.fallback : payload.preferred;
    } else if (params.followGatePrompt) {
      const payload = buildFollowGatePayload(params.automationId, params.followGatePrompt);
      if (params.preferQuickReplyForPostback) {
        try {
          const followCard = await postDirectPayload(params, payload.reliable);
          if (followCard) messageIds.push(followCard);
          followGateCardSent = true;
          responseMessage = payload.verification;
        } catch (error) {
          if (!shouldTryTextFallback(error)) throw error;
          responseMessage = payload.fallback;
        }
      } else {
        responseMessage = payload.preferred;
      }
    } else if (params.carouselCards?.length) {
      responseMessage = buildCarouselPayload(params.carouselCards);
    } else if (params.responseFormat === "PRODUCT_CARD" && params.mediaUrl) {
      responseMessage = buildProductCardPayload(params);
    } else if (params.responseFormat === "LINK" || params.ctaUrl || params.linkButtons?.length) {
      const button = buildButtonPayload(params.message, params.ctaTitle, params.ctaUrl, params.linkButtons).message;
      responseMessage = { ...button, ...(quickReplies.length > 0 ? { quick_replies: quickReplies } : {}) } as InstagramMessagePayload;
    } else {
      responseMessage = {
        text: `${params.message.trim() || "Thanks for your message!"}${mediaFallbackUrl ? `\n\n${mediaFallbackUrl}` : ""}`,
        ...(quickReplies.length > 0 ? { quick_replies: quickReplies } : {}),
      };
    }

    let sent: string;
    try {
      sent = await postDirectPayload(params, responseMessage);
    } catch (error) {
      if (params.postbackButton && shouldTryTextFallback(error)) {
        try {
          sent = await postDirectPayload(
            params,
            buildPostbackButtonPayload(params.message, params.postbackButton).fallback
          );
        } catch (quickReplyError) {
          // Some Instagram account/client combinations accept a normal DM but
          // reject interactive controls. Keep the journey usable: the webhook
          // text fallback resolves this exact reply only against a recent
          // pending AP3K flow.
          const replyInstruction = `Reply “${normalizeButtonTitle(params.postbackButton.title)}” to continue.`;
          console.warn("[meta-api] Instagram direct-message controls unavailable — sending reply instruction", {
            firstError: buildMetaError(error),
            quickReplyError: buildMetaError(quickReplyError),
          });
          sent = await postDirectPayload(params, {
            text: `${params.message.trim() || "Tap below to continue."}\n\n${replyInstruction}`,
          });
        }
      } else if (params.followGatePrompt && shouldTryTextFallback(error)) {
        const followPayload = buildFollowGatePayload(params.automationId, params.followGatePrompt);
        sent = await postDirectPayload(params, followGateCardSent
          ? { text: `Reply “${normalizeButtonTitle(params.followGatePrompt.verificationButtonTitle || "I followed ✅")}” to continue.` }
          : followPayload.fallback
        );
      } else {
        if (params.responseFormat === "PRODUCT_CARD") throw error;
        if (params.responseFormat !== "LINK" && !params.ctaUrl && !params.linkButtons?.length) throw error;
        const fallback = buildTextFallbackPayload(params.message, params.ctaTitle, params.ctaUrl, params.linkButtons).message;
        sent = await postDirectPayload(params, addQuickReplies(fallback, params.automationId, params.quickReplies ?? []));
      }
    }
    if (sent) messageIds.push(sent);

    if (params.typingIndicator) {
      await sendInstagramSenderAction(params.igBusinessAccountId, params.recipientId, "typing_off", params.token).catch(() => undefined);
    }
    return { ok: true, messageIds };
  } catch (error) {
    if (params.typingIndicator) {
      await sendInstagramSenderAction(params.igBusinessAccountId, params.recipientId, "typing_off", params.token).catch(() => undefined);
    }
    return { ok: false, metaError: buildMetaError(error) };
  }
}

async function postDirectPayload(
  params: { token: string; igBusinessAccountId: string; recipientId: string },
  message: InstagramMessagePayload
) {
  const response = await axios.post(
    `${INSTAGRAM_GRAPH_API_BASE_URL}/${params.igBusinessAccountId}/messages`,
    { recipient: { id: params.recipientId }, message },
    { headers: { Authorization: `Bearer ${params.token}`, "Content-Type": "application/json" } }
  );
  return typeof response.data?.message_id === "string" ? response.data.message_id : "";
}

export async function sendInstagramSenderAction(
  igBusinessAccountId: string,
  recipientId: string,
  action: "typing_on" | "typing_off" | "mark_seen",
  token: string
) {
  await axios.post(
    `${INSTAGRAM_GRAPH_API_BASE_URL}/${igBusinessAccountId}/messages`,
    { recipient: { id: recipientId }, sender_action: action },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
}

export async function getInstagramRecipientProfile(params: {
  token: string;
  recipientId: string;
}) {
  try {
    const response = await axios.get(`${INSTAGRAM_GRAPH_API_BASE_URL}/${params.recipientId}`, {
      params: { fields: "username,name,profile_pic,is_user_follow_business,is_business_follow_user,is_verified_user,follower_count" },
      headers: { Authorization: `Bearer ${params.token}` },
      timeout: 2500,
    });
    return {
      username: typeof response.data?.username === "string" ? response.data.username : undefined,
      name: typeof response.data?.name === "string" ? response.data.name : undefined,
      profilePictureUrl: typeof response.data?.profile_pic === "string" ? response.data.profile_pic : undefined,
      followsBusiness: knownFollowStatus(response.data?.is_user_follow_business),
      businessFollows: knownFollowStatus(response.data?.is_business_follow_user),
      verified: knownFollowStatus(response.data?.is_verified_user),
      followerCount: typeof response.data?.follower_count === "number" && Number.isFinite(response.data.follower_count) ? response.data.follower_count : undefined,
    };
  } catch (error) {
    console.warn("[meta-api] recipient profile lookup failed — retrying follow status only", {
      error: getSafeMetaError(error),
    });
    try {
      const followResponse = await axios.get(`${INSTAGRAM_GRAPH_API_BASE_URL}/${params.recipientId}`, {
        params: { fields: "is_user_follow_business" },
        headers: { Authorization: `Bearer ${params.token}` },
      timeout: 2500,
      });
      return {
        username: undefined,
        name: undefined,
        profilePictureUrl: undefined,
        followsBusiness: knownFollowStatus(followResponse.data?.is_user_follow_business),
        businessFollows: undefined, verified: undefined, followerCount: undefined,
      };
    } catch (followError) {
      console.warn("[meta-api] recipient follow-status lookup failed", {
        error: getSafeMetaError(followError),
      });
      return null;
    }
  }
}

async function tryPrivateReply(
  igBusinessAccountId: string,
  commentId: string,
  message: InstagramMessagePayload,
  token: string
): Promise<"ok" | "capability_error"> {
  return await postInstagramMessage(
    igBusinessAccountId,
    { recipient: { comment_id: commentId }, message },
    token,
    {
      endpointName: "ig_messages_private_reply",
      hasCommentId: Boolean(commentId),
      message,
    }
  );
}

async function tryDirectDm(
  igBusinessAccountId: string,
  commenterId: string,
  message: InstagramMessagePayload,
  token: string
): Promise<"ok" | "capability_error"> {
  return await postInstagramMessage(
    igBusinessAccountId,
    { recipient: { id: commenterId }, message },
    token,
    {
      endpointName: "ig_messages_direct_dm",
      hasCommenterId: Boolean(commenterId),
      message,
    }
  );
}

/**
 * Sends an Instagram private reply to a comment through Instagram Graph only.
 * AP3K no longer tries Facebook Graph for the user-facing Instagram Login flow.
 */
export async function sendInstagramCommentPrivateReply(params: {
  token: string;
  igBusinessAccountId: string;
  commentId: string;
  commenterId: string;
  message: string;
  ctaTitle?: string | null;
  ctaUrl?: string | null;
  automationId?: string;
  responseFormat?: string | null;
  quickReplies?: string[];
  linkButtons?: LinkButton[];
  cardSubtitle?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  followGatePrompt?: FollowGatePrompt;
  postbackButton?: InstagramPostbackButton;
  preferQuickReplyForPostback?: boolean;
}): Promise<PrivateReplyResult> {
  params = await withTrackedLinks(params);
  const { token, igBusinessAccountId, commentId, commenterId } = params;
  const automationId = params.automationId ?? commentId;
  const followGatePayload = params.followGatePrompt
    ? buildFollowGatePayload(automationId, params.followGatePrompt)
    : null;
  const postbackPayload = params.postbackButton
    ? buildPostbackButtonPayload(params.message, params.postbackButton)
    : null;
  const preferred = postbackPayload
    ? { message: params.preferQuickReplyForPostback ? postbackPayload.fallback : postbackPayload.preferred, ctaMode: "postback_button" as CtaMode }
    : followGatePayload
    ? {
        message: params.preferQuickReplyForPostback ? followGatePayload.reliable : followGatePayload.preferred,
        ctaMode: "follow_gate_card" as CtaMode,
      }
    : await buildConfiguredPrivateReplyPayload({
        automationId,
        message: params.message,
        responseFormat: params.responseFormat,
        quickReplies: params.quickReplies,
        linkButtons: params.linkButtons,
        ctaTitle: params.ctaTitle,
        ctaUrl: params.ctaUrl,
        cardSubtitle: params.cardSubtitle,
        mediaUrl: params.mediaUrl,
        mediaType: params.mediaType,
      });
  const textFallback = postbackPayload
    ? { message: postbackPayload.fallback, ctaMode: "postback_button" as CtaMode }
    : followGatePayload
    ? { message: followGatePayload.fallback, ctaMode: "text_link_fallback" as CtaMode }
    : buildTextFallbackPayload(params.message, params.ctaTitle, params.ctaUrl, params.linkButtons);
  const usesTemplate = preferred.ctaMode === "product_card" || preferred.ctaMode === "button_template" || preferred.ctaMode === "postback_button" || preferred.ctaMode === "follow_gate_card";

  try {
    const primary = await tryPrivateReply(igBusinessAccountId, commentId, preferred.message, token);
    if (primary === "ok") {
      return { ok: true, endpoint: "ig_messages_private_reply", ctaMode: preferred.ctaMode };
    }
    return capabilityMissing("ig_messages_private_reply", preferred.ctaMode);
  } catch (primaryErr) {
    const primaryMeta = buildMetaError(primaryErr);

    // This account-level Instagram privacy switch blocks both private replies
    // and direct DMs. Retrying another recipient shape cannot succeed and
    // hides the actual fix behind a generic Meta API error.
    if (isMessagingAccessDisabledError(primaryErr)) {
      return messagingAccessDisabled("ig_messages_private_reply", primaryMeta, preferred.ctaMode);
    }

    if (usesTemplate && params.responseFormat !== "PRODUCT_CARD" && shouldTryTextFallback(primaryErr)) {
      console.warn("[meta-api] Instagram Graph private reply button template failed — trying text fallback", {
        endpointName: "ig_messages_private_reply",
        status: primaryMeta.status,
        code: primaryMeta.code,
        type: primaryMeta.type,
      });

      try {
        const primaryTextFallback = await tryPrivateReply(
          igBusinessAccountId,
          commentId,
          textFallback.message,
          token
        );
        if (primaryTextFallback === "ok") {
          return { ok: true, endpoint: "ig_messages_private_reply", ctaMode: textFallback.ctaMode };
        }
        return capabilityMissing("ig_messages_private_reply", textFallback.ctaMode);
      } catch (textFallbackErr) {
        if (isMessagingAccessDisabledError(textFallbackErr)) {
          return messagingAccessDisabled(
            "ig_messages_private_reply",
            buildMetaError(textFallbackErr),
            textFallback.ctaMode
          );
        }
        console.warn("[meta-api] Instagram Graph private reply text fallback failed — trying direct DM fallback", {
          endpointName: "ig_messages_private_reply",
          error: getSafeMetaError(textFallbackErr),
        });
      }
    } else {
      console.warn("[meta-api] Instagram Graph private reply failed — trying direct DM fallback", {
        endpointName: "ig_messages_private_reply",
        status: primaryMeta.status,
        code: primaryMeta.code,
      });
    }

    try {
      const fallback = await tryDirectDm(igBusinessAccountId, commenterId, preferred.message, token);
      if (fallback === "ok") {
        return { ok: true, endpoint: "ig_messages_direct_dm", ctaMode: preferred.ctaMode };
      }
      return capabilityMissing("ig_messages_direct_dm", preferred.ctaMode);
    } catch (fallbackErr) {
      if (isMessagingAccessDisabledError(fallbackErr)) {
        return messagingAccessDisabled(
          "ig_messages_direct_dm",
          buildMetaError(fallbackErr),
          preferred.ctaMode
        );
      }

      if (usesTemplate && params.responseFormat !== "PRODUCT_CARD" && shouldTryTextFallback(fallbackErr)) {
        console.warn("[meta-api] Instagram Graph direct DM button template failed — trying text fallback", {
          endpointName: "ig_messages_direct_dm",
          error: getSafeMetaError(fallbackErr),
        });
        try {
          const fallbackText = await tryDirectDm(
            igBusinessAccountId,
            commenterId,
            textFallback.message,
            token
          );
          if (fallbackText === "ok") {
            return { ok: true, endpoint: "ig_messages_direct_dm", ctaMode: textFallback.ctaMode };
          }
          return capabilityMissing("ig_messages_direct_dm", textFallback.ctaMode);
        } catch (fallbackTextErr) {
          if (isMessagingAccessDisabledError(fallbackTextErr)) {
            return messagingAccessDisabled(
              "ig_messages_direct_dm",
              buildMetaError(fallbackTextErr),
              textFallback.ctaMode
            );
          }
          return {
            ok: false,
            reason: "meta_api_error",
            endpoint: "ig_messages_direct_dm",
            metaError: buildMetaError(fallbackTextErr),
            ctaMode: textFallback.ctaMode,
          };
        }
      }

      return {
        ok: false,
        reason: "meta_api_error",
        endpoint: "ig_messages_direct_dm",
        metaError: buildMetaError(fallbackErr),
        ctaMode: preferred.ctaMode,
      };
    }
  }
}

function capabilityMissing(endpoint: string, ctaMode: CtaMode): PrivateReplyResult {
  console.warn("[meta-api] dm_capability_missing on Instagram Graph", {
    endpointName: endpoint,
    requiredCapabilityHint:
      "instagram_business_manage_messages must be enabled in Meta App Dashboard with Standard or Advanced Access",
  });
  return {
    ok: false,
    reason: "dm_capability_missing",
    endpoint,
    metaError: { code: 3, message: "(#3) Application does not have the capability to make this API call" },
    ctaMode,
  };
}

function messagingAccessDisabled(
  endpoint: string,
  metaError: SafeMetaApiError,
  ctaMode: CtaMode
): PrivateReplyResult {
  console.warn("[meta-api] Instagram connected-tool message access is disabled", {
    endpointName: endpoint,
    status: metaError.status,
    code: metaError.code,
    subcode: metaError.subcode,
  });
  return {
    ok: false,
    reason: "dm_access_disabled",
    endpoint,
    metaError,
    ctaMode,
  };
}

export function formatPrivateReplyError(result: PrivateReplyResult & { ok: false }): string {
  if (result.reason === "dm_capability_missing") return "dm_capability_missing";
  if (result.reason === "dm_access_disabled") return "dm_access_disabled";
  const { status, code, subcode, message } = result.metaError;
  return [
    status ? `status=${status}` : null,
    code ? `code=${code}` : null,
    subcode ? `subcode=${subcode}` : null,
    message ? `message=${message}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
