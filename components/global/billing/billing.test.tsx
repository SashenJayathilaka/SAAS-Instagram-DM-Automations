import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Billing from "./index";
import BillingPlans from "./plans";
import { makeUsageMetric, type UsageSummary } from "@/lib/plan-limits";
import type { BillingSnapshot } from "@/lib/billing-snapshot";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/providers/i18n-provider", () => ({
  useI18n: () => ({ locale: "en" }),
}));
const billing: BillingSnapshot = {
  status: "active",
  interval: "year",
  renewsAt: "2027-09-11T00:00:00Z",
  cancelAtPeriodEnd: false,
  lookupKey: null,
};
const usage: UsageSummary = {
  plan: "BUSINESS",
  planLabel: "Business",
  periodLabel: "September 2026",
  periodStart: new Date("2026-09-01"),
  periodEnd: new Date("2026-10-01"),
  enforcementStart: new Date("2026-09-01"),
  staticReplies: makeUsageMetric(7357, 20000),
  aiReplies: makeUsageMetric(50, 2000),
  activeCampaigns: makeUsageMetric(43, "unlimited"),
  connectedAccounts: makeUsageMetric(2, 10),
};

describe("focused billing screen", () => {
  it("renders one portal action, real usage, annual billing and no duplicate checkout or comparison table", () => {
    const html = renderToStaticMarkup(
      <Billing
        current="BUSINESS"
        usage={usage}
        billingState="subscription"
        billing={billing}
      />,
    );
    expect(html.match(/>Manage subscription</g)).toHaveLength(1);
    expect(html).toContain("7,357");
    expect(html).toContain("Sep 11, 2027");
    expect(html).toContain("Oct 1, 2026");
    expect(html).toContain("billed yearly");
    expect(html.match(/role="progressbar"/g)).toHaveLength(3);
    expect(html).not.toContain("/payment?");
    expect(html).not.toContain("<table");
  });
  it("uses the selected interval in free-account upgrade destinations", () => {
    for (const interval of ["month", "year"] as const) {
      const html = renderToStaticMarkup(
        <BillingPlans
          current="FREE"
          initialInterval={interval}
          existingPaid={false}
          internalAccess={false}
          disabled={false}
        />,
      );
      expect(html).toContain(`/payment?plan=pro&amp;interval=${interval}`);
      expect(html).toContain(`/payment?plan=business&amp;interval=${interval}`);
    }
  });
  it.each(["past_due", "unpaid", "paused", "incomplete"])(
    "does not advertise %s as an active subscription",
    (status) => {
      const html = renderToStaticMarkup(
        <Billing
          current="PRO"
          billingState="subscription"
          billing={{ ...billing, status }}
        />,
      );
      expect(html).not.toContain(">Active<");
      expect(html).toContain("Your subscription needs attention");
    },
  );
  it("blocks checkout when billing cannot be verified or access is complimentary", () => {
    for (const state of ["none", "unavailable"] as const) {
      const html = renderToStaticMarkup(
        <Billing current="PRO" billingState={state} />,
      );
      expect(html).not.toContain("/payment?");
      expect(html).not.toContain(">Manage subscription<");
    }
  });
  it("shows cancellation date as access end and handles missing usage explicitly", () => {
    const html = renderToStaticMarkup(
      <Billing
        current="PRO"
        billingState="subscription"
        billing={{ ...billing, cancelAtPeriodEnd: true }}
      />,
    );
    expect(html).toContain("Access until");
    expect(html).toContain("Cancels at period end");
    expect(html).not.toContain("Next renewal");
    expect(html).toContain("Usage is temporarily unavailable");
  });
});
