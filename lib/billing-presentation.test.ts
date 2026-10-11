import { describe, expect, it } from "vitest";
import { getBillingUsagePresentation } from "@/lib/billing-presentation";

describe("billing usage presentation", () => {
  it("shows an unused connected-account allowance as neutral success", () => {
    expect(getBillingUsagePresentation(
      { used: 0, limit: 1, remaining: 1, percent: 0, blocked: false },
      "accounts"
    )).toEqual({
      tone: "green",
      value: "0 of 1 accounts connected",
      description: "1 remaining",
    });
  });

  it("shows a correctly used account allowance as reached, not an error", () => {
    expect(getBillingUsagePresentation(
      { used: 1, limit: 1, remaining: 0, percent: 100, blocked: true },
      "accounts",
      "Free supports 1 account."
    )).toEqual({
      tone: "amber",
      value: "1 of 1 accounts connected",
      description: "Plan account limit reached",
    });
  });

  it("keeps an actually blocked reply allowance red", () => {
    expect(getBillingUsagePresentation(
      { used: 50, limit: 50, remaining: 0, percent: 100, blocked: true },
      "default"
    )).toEqual({
      tone: "red",
      value: "50 / 50",
      description: "Limit reached",
    });
  });

  it("shows unlimited campaign usage without remaining-count copy", () => {
    expect(getBillingUsagePresentation(
      { used: 1, limit: "unlimited", remaining: null, percent: 0, blocked: false }
    )).toEqual({
      tone: "green",
      value: "1 / Unlimited",
      description: "Unlimited",
    });
  });

  it("keeps a finite effective campaign limit internally consistent", () => {
    expect(getBillingUsagePresentation(
      { used: 1, limit: 3, remaining: 2, percent: 33, blocked: false }
    )).toEqual({
      tone: "green",
      value: "1 / 3",
      description: "2 remaining",
    });
  });
});
