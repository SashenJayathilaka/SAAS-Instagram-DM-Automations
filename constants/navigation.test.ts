import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRIMARY_NAVIGATION, primaryNavigationHref } from "./menu";

describe("primary navigation", () => {
  it("shares exact AP3K terminology and unchanged destinations across desktop and mobile", () => {
    expect(
      PRIMARY_NAVIGATION.map(({ label, segment }) => ({
        label,
        href: primaryNavigationHref("user_slug", segment),
      }))
    ).toEqual([
      { label: "Home", href: "/dashboard/user_slug" },
      { label: "Contacts", href: "/dashboard/user_slug/contacts" },
      { label: "Automations", href: "/dashboard/user_slug/automation" },
      { label: "AP3K AI", href: "/dashboard/user_slug/ai" },
      { label: "Inbox", href: "/dashboard/user_slug/inbox" },
      { label: "Billing", href: "/dashboard/user_slug/billing" },
      { label: "Refer & earn", href: "/dashboard/user_slug/referrals" },
      { label: "Settings", href: "/dashboard/user_slug/settings" },
    ]);

    expect(PRIMARY_NAVIGATION.map(({ label }) => label)).not.toContain("Campaigns");
    expect(PRIMARY_NAVIGATION.map(({ label }) => label)).not.toContain("Account");
  });

  it("renders the same shared navigation definition on desktop and mobile", () => {
    const desktop = readFileSync(
      join(process.cwd(), "components/global/sidebar/index.tsx"),
      "utf8"
    );
    const mobile = readFileSync(
      join(process.cwd(), "components/global/sidebar/items.tsx"),
      "utf8"
    );

    expect(desktop).toContain("PRIMARY_NAVIGATION.map");
    expect(mobile).toContain("PRIMARY_NAVIGATION.map");
    expect(desktop).toContain("primaryNavigationHref(slug, item.segment)");
    expect(mobile).toContain("primaryNavigationHref(slug, item.segment)");
  });
});
