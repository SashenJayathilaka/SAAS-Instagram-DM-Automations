import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPlanLimits } from "@/lib/plan-limits";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("production polish UI contracts", () => {
  it("respects reduced-motion preferences for reveal animations", () => {
    const motion = source("components/global/motion/fade-in.tsx");
    expect(motion).toContain("useReducedMotion");
    expect(motion).toContain("initial={reduceMotion ? false");
    expect(motion).toContain("whileInView");
  });

  it("keeps authentication management inside Clerk", () => {
    const settings = source(
      "app/(protected)/dashboard/[slug]/settings/page.tsx",
    );
    const manager = source("components/settings/manage-sign-in-settings.tsx");
    expect(settings).not.toContain("Current password");
    expect(settings).not.toContain("SignOutButton");
    expect(manager).toContain("openUserProfile()");
    expect(manager).toContain("Manage sign-in settings");
  });

  it("keeps the mobile navigation accessible and branded", () => {
    const navbar = source("components/global/navbar/index.tsx");
    const sheet = source("components/global/sheet/index.tsx");
    expect(navbar).toContain('triggerLabel={t("openNavigation")}');
    expect(navbar).toContain("<AP3KLogo");
    expect(sheet).toContain("aria-label={triggerLabel}");
    expect(sheet).toContain('<SheetTitle className="sr-only">');
  });

  it("makes the notification bell an interactive, accessible workspace menu", () => {
    const notification = source(
      "components/global/navbar/notification/index.tsx",
    );
    expect(notification).toContain("<PopoverTrigger asChild>");
    expect(notification).toContain(
      "<Popover open={open} onOpenChange={setOpen}>",
    );
    expect(notification).toContain(
      "const closeNotifications = () => setOpen(false)",
    );
    expect(notification.match(/onClick=\{closeNotifications\}/g)).toHaveLength(
      2,
    );
    expect(notification).toContain('aria-label={translateUi("Open notifications", locale)}');
    expect(notification).toContain("You're all caught up");
    expect(notification).toContain("/inbox");
    expect(notification).toContain("/billing");
    expect(notification).not.toContain("Notifications coming later");
  });

  it("separates internal access from real Stripe subscription management", () => {
    const page = source("app/(protected)/dashboard/[slug]/billing/page.tsx");
    const billing = source("components/global/billing/index.tsx");
    const manageButton = source(
      "components/global/billing/manage-billing-button.tsx",
    );
    expect(page).toContain("getBillingLookup(customerId)");
    expect(page).toContain("billingState={billingLookup.state}");
    expect(page).not.toContain('customerId || currentPlan !== "FREE"');
    expect(billing).toContain('billingState === "subscription"');
    expect(billing).toContain('billingState === "none"');
    expect(billing).toContain("Internal plan access");
    expect(billing).toContain("No recurring charge");
    expect(manageButton).not.toContain("Check billing status");
  });

  it("presents the free plan as zero dollars without a billing interval", () => {
    const pricing = source("components/global/pricing-experience.tsx");
    const paymentCard = source("components/global/billing/payment-card.tsx");
    expect(pricing).toContain("$0");
    expect(pricing).not.toContain("Free forever");
    expect(pricing).toContain("No credit card required");
    expect(paymentCard).toContain("$0");
    expect(paymentCard).not.toContain("Free forever");
    expect(paymentCard).not.toContain("$0/month");
  });

  it("keeps plan entitlements aligned with the product model", () => {
    expect(getPlanLimits("FREE")).toMatchObject({
      connectedInstagramAccounts: 1,
      activeCampaigns: 5,
      staticRepliesPerMonth: 500,
      aiRepliesPerMonth: 0,
    });
    expect(getPlanLimits("PRO")).toMatchObject({
      connectedInstagramAccounts: 3,
      staticRepliesPerMonth: 5000,
    });
    expect(getPlanLimits("BUSINESS")).toMatchObject({
      connectedInstagramAccounts: 6,
      staticRepliesPerMonth: 20000,
    });
  });

  it("starts every new comment automation action disabled", () => {
    const wizard = source("hooks/use-wizard.ts");
    expect(wizard).toContain("sendPrivateDm: false");
    expect(wizard).toContain("publicReplyEnabled: false");
    expect(wizard).toContain("aiReplyEnabled: false");
    expect(wizard).toContain("openingDmEnabled: false");
  });

  it("labels AI DM automations accurately in the automation table", () => {
    const table = source("components/dashboard/automation-table.tsx");
    expect(table).toMatch(
      /automation\.listener\?\.aiDmReplyEnabled\s*\?\s*"AI DM replies active"/,
    );
    expect(table).toContain("{modeLabel}");
  });
});
