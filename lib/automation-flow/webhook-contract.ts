import type { FlowValues } from "./definition";

export const WEBHOOK_TEMPLATE_LIMIT = 8192;
export const WEBHOOK_BODY_LIMIT = 16384;
export const WEBHOOK_RESPONSE_LIMIT = 16384;
export const WEBHOOK_TIMEOUT_MS = 5000;

/** Conservative global-unicast IPv4 policy. IPv6-only destinations are unsupported. */
export function isPublicWebhookAddress(address: string): boolean {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return false;
  const parts = address.split(".").map(Number);
  if (parts.some(n => n > 255)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) || address === "168.63.129.16") return false;
  return true;
}
export function parseWebhookUrl(raw: string): URL | null {
  if (raw.length > 2048 || /[\u0000-\u0020]/.test(raw)) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || url.username || url.password || url.hash || (url.port && url.port !== "443")) return null;
    if (/^\d+(?:\.\d+){3}$/.test(host)) return isPublicWebhookAddress(host) ? url : null;
    if (host.includes(":") || !host.includes(".") || host.length > 253 ||
      !host.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
      /\.(?:localhost|local|internal|home|lan|test|invalid|example|onion|arpa)$/.test(host)) return null;
    return url;
  } catch { return null; }
}
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
function validJsonTree(value: unknown, depth = 0, count = { value: 0 }): value is JsonValue {
  if (++count.value > 256 || depth > 8) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(item => validJsonTree(item, depth + 1, count));
  if (typeof value !== "object") return false;
  return Object.entries(value).every(([key, item]) => !["__proto__", "prototype", "constructor"].includes(key) && !key.includes("{{") && validJsonTree(item, depth + 1, count));
}
export function parseWebhookBody(template: string): Record<string, JsonValue> | null {
  if (template.length > WEBHOOK_TEMPLATE_LIMIT) return null;
  try {
    const value: unknown = JSON.parse(template);
    return value && !Array.isArray(value) && typeof value === "object" && validJsonTree(value) ? value as Record<string, JsonValue> : null;
  } catch { return null; }
}
/** Interpolate only JSON string values, so contact text cannot alter the JSON shape. */
export function renderWebhookBody(template: string, values: FlowValues): string {
  const body = parseWebhookBody(template);
  if (!body) throw new Error("webhook_invalid_body");
  function resolve(value: JsonValue): JsonValue {
    if (typeof value === "string") return value.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_, key) => Object.prototype.hasOwnProperty.call(values, key) && typeof values[key] === "string" ? values[key] : "");
    if (Array.isArray(value)) return value.map(resolve);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolve(item)]));
    return value;
  }
  const serialized = JSON.stringify(resolve(body));
  if (new TextEncoder().encode(serialized).byteLength > WEBHOOK_BODY_LIMIT) throw new Error("webhook_body_too_large");
  return serialized;
}
