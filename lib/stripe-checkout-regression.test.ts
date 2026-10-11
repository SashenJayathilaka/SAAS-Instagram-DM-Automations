import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PLAN_CARDS, checkoutHref } from "@/lib/billing-plans";

describe("Stripe checkout routing", () => {
  it("presents Free as an interval-independent zero-dollar plan", () => {
    const free = PLAN_CARDS.find((plan) => plan.id === "FREE");

    expect(free?.replyLimit).toBe(500);
    expect(free?.features).toContain("500 automated actions/month");
    expect(free?.features).toContain("Up to 5 active automations");
    expect(free?.features).toContain("No AI replies");
    expect(free?.features).toContain("Comment replies + DMs");

    const source = fs.readFileSync(
      path.join(process.cwd(), "components/global/pricing-experience.tsx"),
      "utf8"
    );
    expect(source).toContain("$0");
    expect(source).not.toContain("Free forever");
    expect(source).not.toContain("more included");
    expect(source).not.toContain('plan.id === "FREE" && <p');
  });

  it("publishes exactly Free, Pro, and Business without a Custom plan", () => {
    expect(PLAN_CARDS.map((plan) => plan.id)).toEqual(["FREE", "PRO", "BUSINESS"]);
    expect(PLAN_CARDS.map((plan) => plan.name)).not.toContain("Custom");

    const source = fs.readFileSync(
      path.join(process.cwd(), "components/global/pricing-experience.tsx"),
      "utf8"
    );
    expect(source).not.toContain("Let's talk");
    expect(source).not.toContain("Contact us");
  });

  it("builds checkout routes for every paid plan and billing interval", () => {
    expect(checkoutHref("PRO", "month")).toBe("/payment?plan=pro&interval=month");
    expect(checkoutHref("PRO", "year")).toBe("/payment?plan=pro&interval=year");
    expect(checkoutHref("BUSINESS", "month")).toBe("/payment?plan=business&interval=month");
    expect(checkoutHref("BUSINESS", "year")).toBe("/payment?plan=business&interval=year");
  });

  it("keeps Next.js redirect outside the Stripe session try/catch", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/(protected)/payment/page.tsx"),
      "utf8"
    );

    const createSessionIndex = source.indexOf("stripe.checkout.sessions.create");
    const catchIndex = source.indexOf("} catch (err) {", createSessionIndex);
    const redirectIndex = source.indexOf("if (checkoutUrl) redirect(checkoutUrl);");

    expect(createSessionIndex).toBeGreaterThan(-1);
    expect(catchIndex).toBeGreaterThan(createSessionIndex);
    expect(redirectIndex).toBeGreaterThan(catchIndex);
    expect(source.slice(createSessionIndex, catchIndex)).not.toContain("redirect(");
  });

  it("blocks duplicate checkout only when Stripe confirms a manageable subscription", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "app/(protected)/payment/page.tsx"),
      "utf8"
    );
    const route = fs.readFileSync(
      path.join(process.cwd(), "app/(protected)/api/payment/route.ts"),
      "utf8"
    );

    for (const source of [page, route]) {
      expect(source).toContain("getBillingLookup");
      expect(source).toContain("isManageableSubscriptionStatus");
      expect(source).not.toContain('existing.subscription.plan !== "FREE"');
    }
  });
});
