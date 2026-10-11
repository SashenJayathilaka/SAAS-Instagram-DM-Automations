import { describe, expect, it } from "vitest";
import { FALLBACK_TIME_ZONE, isValidTimeZone, supportedTimeZones } from "./time-zone";

describe("time zone utilities", () => {
  it("accepts IANA zones and rejects invalid or oversized values", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Europe/Paris")).toBe(true);
    expect(isValidTimeZone("Not/A_Time_Zone")).toBe(false);
    expect(isValidTimeZone("x".repeat(65))).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
  });

  it("always includes the UTC fallback in the selectable list", () => {
    const zones = supportedTimeZones();
    expect(zones).toContain(FALLBACK_TIME_ZONE);
    expect(new Set(zones).size).toBe(zones.length);
  });
});
