import { createHash, randomBytes } from "crypto";

export const META_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const META_OAUTH_STATE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export function generateMetaOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function hashMetaOAuthState(state: string) {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

export function normalizeMetaOAuthState(value?: string | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return META_OAUTH_STATE_PATTERN.test(trimmed) ? trimmed : null;
}
