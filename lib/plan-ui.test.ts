import { describe, expect, it } from "vitest";
import { formatConnectedAccountsHelper, formatUsageMetricValue } from "@/lib/plan-limits";

describe("plan UI formatting", () => {
  it("formats Creator plan strip metrics cleanly", () => {
    expect(formatUsageMetricValue({ used: 10, limit: 5000 })).toBe("10 / 5,000");
    expect(formatUsageMetricValue({ used: 1, limit: "unlimited" })).toBe("1 / Unlimited");
    expect(formatUsageMetricValue({ used: 1, limit: 1 })).toBe("1 / 1");
    expect(formatConnectedAccountsHelper("Pro", { limit: 1 })).toBe("Monthly reply and AI allowances are shared across your subscription.");
  });
});
