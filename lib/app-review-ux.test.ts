import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isAppReviewMode } from "@/lib/app-review-mode";
import { getCampaignModeLabel } from "@/lib/campaign-mode-label";

const readRepoFile = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("App Review-safe UX", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("enables review mode only for the exact true flag", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_REVIEW_MODE", "true");
    expect(isAppReviewMode()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_APP_REVIEW_MODE", "false");
    expect(isAppReviewMode()).toBe(false);
  });

  it("uses customer-facing Comment and DM labels without legacy External DM copy", () => {
    expect(getCampaignModeLabel(true)).toEqual({
      short: "Comment",
      full: "Comment reply",
    });
    expect(getCampaignModeLabel(false)).toEqual({
      short: "DM",
      full: "AP3K DM",
    });
    expect(getCampaignModeLabel(true, true)).toEqual({
      short: "Comment",
      full: "Comment reply mode",
    });
  });

  it("keeps account connection and removal controls on the Instagram account page", () => {
    const source = readRepoFile(
      "app/(protected)/dashboard/[slug]/account/page.tsx",
    );
    expect(source).toContain("AccountConnectionActions");
    expect(source).toContain("RemoveInstagramAccountButton");
    expect(source).toContain("Removing this Instagram account");
  });

  it("uses browser-local timestamps for refreshed Instagram profiles", () => {
    const source = readRepoFile(
      "app/(protected)/dashboard/[slug]/account/page.tsx",
    );
    expect(source).toContain(
      'import LocalTime from "@/components/global/local-time"',
    );
    expect(source).toMatch(
      /<LocalTime\s+value=\{snapshot\.fetchedAt\}\s+prefix="Profile refreshed"\s*\/>/,
    );
  });

  it("keeps the automation list aligned with the approved Instagram response model", () => {
    const source = readRepoFile(
      "app/(protected)/dashboard/[slug]/automation/page.tsx",
    );
    expect(source).toContain("AutomationLibrary");
    expect(readFileSync("components/dashboard/automation-library.tsx", "utf8")).toContain("AutomationTable");
    expect(source).toContain("Automations");
    expect(source).not.toContain("External DM");
  });
});
