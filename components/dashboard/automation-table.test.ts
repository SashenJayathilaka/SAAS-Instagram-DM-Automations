import { describe, expect, it } from "vitest";
import { getCampaignModeLabel } from "@/lib/campaign-mode-label";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("campaign table display helpers", () => {
  it("returns non-wrapping short labels for campaign modes", () => {
    expect(getCampaignModeLabel(true)).toEqual({ short: "Comment", full: "Comment reply" });
    expect(getCampaignModeLabel(false)).toEqual({ short: "DM", full: "AP3K DM" });
  });

  it("does not label needs-review campaigns as public-reply active in review mode", () => {
    const source = readFileSync(join(process.cwd(), "components/dashboard/automation-table.tsx"), "utf8");

    expect(getCampaignModeLabel(true, true)).toEqual({ short: "Comment", full: "Comment reply mode" });
    expect(getCampaignModeLabel(false, true)).toEqual({ short: "Comment", full: "Comment reply active" });
    expect(source).toMatch(/className="hidden xl:block(?: [^"]*)?"/);
  });
});
