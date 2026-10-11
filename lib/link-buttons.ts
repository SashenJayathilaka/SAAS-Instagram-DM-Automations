export const MAX_LINK_BUTTONS = 3;
export const DEFAULT_LINK_BUTTON_LABEL = "Get the Link";

export type LinkButton = {
  label: string;
  url: string;
};

export function normalizeLinkUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return "";

  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function cleanLabel(value?: string | null) {
  return Array.from(value?.trim() || DEFAULT_LINK_BUTTON_LABEL).slice(0, 20).join("");
}

/**
 * Link buttons are stored in Listener.quickReplies as structured JSON. Older
 * automations only have ctaButtonTitle/ctaLink, so those fields remain the
 * fallback and are mirrored from the first button when saving.
 */
export function readLinkButtons(
  value: unknown,
  legacyLabel?: string | null,
  legacyUrl?: string | null
): LinkButton[] {
  const rows = Array.isArray(value)
    ? value
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
        .slice(0, MAX_LINK_BUTTONS)
        .map((item) => ({
          label: cleanLabel(typeof item.label === "string" ? item.label : undefined),
          url: typeof item.url === "string" ? item.url.trim() : "",
        }))
    : [];

  if (rows.length > 0) return rows;
  if (legacyUrl?.trim()) {
    return [{ label: cleanLabel(legacyLabel), url: legacyUrl.trim() }];
  }
  return [];
}

export function normalizeLinkButtons(
  value: unknown,
  legacyLabel?: string | null,
  legacyUrl?: string | null
): LinkButton[] {
  return readLinkButtons(value, legacyLabel, legacyUrl).map((button) => ({
    label: cleanLabel(button.label),
    url: normalizeLinkUrl(button.url),
  }));
}

export function linkButtonsAreComplete(buttons: LinkButton[]) {
  return (
    buttons.length >= 1 &&
    buttons.length <= MAX_LINK_BUTTONS &&
    buttons.every((button) => Boolean(button.label.trim()) && Boolean(normalizeLinkUrl(button.url)))
  );
}

export function readLegacyQuickReplies(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)))
        .slice(0, 4)
        .map((item) => Array.from(item).slice(0, 20).join(""))
    : [];
}
