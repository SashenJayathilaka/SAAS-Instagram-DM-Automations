export const FALLBACK_TIME_ZONE = "UTC";

export function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function detectedTimeZone(): string {
  if (typeof Intl === "undefined") return FALLBACK_TIME_ZONE;
  const value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(value) ? value : FALLBACK_TIME_ZONE;
}

export function supportedTimeZones(): string[] {
  const api = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };
  const values = api.supportedValuesOf?.("timeZone") ?? [];
  return Array.from(new Set([FALLBACK_TIME_ZONE, ...values])).sort((a, b) => a.localeCompare(b));
}
