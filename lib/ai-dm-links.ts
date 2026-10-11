import { normalizeLinkUrl, type LinkButton } from "@/lib/link-buttons";

export type AiLinkOption = {
  id: string;
  url: string;
  defaultLabel: string;
  sourceTitle: string;
};

const URL_PATTERN = /https?:\/\/[^\s<>"'`\])}]+/gi;

function defaultButtonLabel(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase().replace(/\/+$/, "");
    if (path.endsWith("/sign-up") || path.endsWith("/signup")) return "Get Started";
    if (path.endsWith("/pricing")) return "View Pricing";
    if (path.endsWith("/help")) return "Get Help";
    if (path.endsWith("/contact")) return "Contact Support";
    if (path.endsWith("/sign-in") || path.endsWith("/login")) return "Sign In";
    if (!path) return "Visit Website";
  } catch {
    // normalizeLinkUrl already validates URLs. Keep a neutral fallback if URL
    // parsing ever differs between runtimes.
  }
  return "Open Link";
}

function cleanModelLabel(value: unknown, fallback: string) {
  const clean = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return Array.from(clean || fallback).slice(0, 20).join("");
}

function urlsFromText(value: string) {
  return (value.match(URL_PATTERN) ?? [])
    .map((candidate) => candidate.replace(/[.,!?;:]+$/, ""))
    .map((candidate) => normalizeLinkUrl(candidate))
    .filter(Boolean);
}

/**
 * AI buttons may only use destinations explicitly supplied by the workspace
 * owner. The model sees opaque IDs, and the server maps the chosen ID back to
 * the validated URL after generation.
 */
export function collectAiLinkOptions(
  knowledge: Array<{ title?: string | null; content?: string | null }>,
  automationInstructions?: string | null
): AiLinkOption[] {
  const candidates = knowledge.flatMap((item) =>
    urlsFromText(item.content ?? "").map((url) => ({
      url,
      sourceTitle: item.title?.trim() || "Business knowledge",
    }))
  );

  if (automationInstructions?.trim()) {
    candidates.push(...urlsFromText(automationInstructions).map((url) => ({
      url,
      sourceTitle: "Automation guidance",
    })));
  }

  const unique = Array.from(new Map(candidates.map((item) => [item.url, item])).values()).slice(0, 20);
  return unique.map((item, index) => ({
    id: `link_${index + 1}`,
    url: item.url,
    defaultLabel: defaultButtonLabel(item.url),
    sourceTitle: item.sourceTitle.slice(0, 120),
  }));
}

function extractJsonObject(raw: string) {
  const withoutFence = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  return firstBrace >= 0 && lastBrace > firstBrace
    ? withoutFence.slice(firstBrace, lastBrace + 1)
    : withoutFence;
}

function stripUrls(value: string) {
  return value.replace(URL_PATTERN, "").replace(/\s+/g, " ").replace(/\s+([.,!?;:])/g, "$1").trim();
}

export function parseAiDmModelReply(
  raw: string,
  options: AiLinkOption[]
): { reply: string; linkButton?: LinkButton } {
  let reply = raw.trim();
  let requestedLinkId = "";
  let requestedLabel: unknown;

  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
    reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
    requestedLinkId = typeof parsed.linkId === "string" ? parsed.linkId.trim() : "";
    requestedLabel = parsed.buttonLabel;
  } catch {
    // Some OpenAI-compatible providers ignore JSON mode. Keep their plain-text
    // response useful while still enforcing the server-side URL allowlist.
  }

  let selected = options.find((option) => option.id === requestedLinkId);
  if (!selected) {
    const mentioned = urlsFromText(reply);
    selected = options.find((option) => mentioned.includes(option.url));
  }

  // URLs belong in Instagram's native button, not as an ugly raw link in the
  // message bubble. Unknown model-generated URLs are removed rather than sent.
  reply = stripUrls(reply).slice(0, 500).trim();
  const linkButton = selected
    ? {
        label: cleanModelLabel(requestedLabel, selected.defaultLabel),
        url: selected.url,
      }
    : undefined;

  return { reply, ...(linkButton ? { linkButton } : {}) };
}
