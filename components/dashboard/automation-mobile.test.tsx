import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AutomationTable from "./automation-table";

vi.mock("@/providers/i18n-provider", () => ({ useI18n: () => ({ locale: "en" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/actions/automation", () => ({ activateAutomation: vi.fn(), deleteAutomation: vi.fn(), duplicateAutomation: vi.fn() }));
vi.mock("@/actions/automation-tools", () => ({ getBacktrackInfo: vi.fn() }));
vi.mock("@/components/automations/saved-automation-tools", () => ({ default: () => null, showPublishedTools: () => false }));

const automation = { id: "example", name: "Creator guide", active: true, source: "COMMENT", posts: [{ postid: "ANY" }], listener: { commentReply: "Sent!" }, metrics: { runs: 40, leads: 32 } };
function mobile(active: boolean, showControls: boolean) {
  const html = renderToStaticMarkup(<AutomationTable slug="owner" automations={[{ ...automation, active }]} showControls={showControls} />);
  return html.match(/<article\b[\s\S]*?<\/article>/)?.[0] ?? "";
}
describe("mobile automation management", () => {
  it.each([true, false])("keeps management controls when table search is %s", showControls => {
    const html = mobile(true, showControls);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-label="Pause automation"');
    expect(html).toContain('aria-label="More automation actions"');
    expect(html).toContain("Enabled");
    expect(html).toContain("40");
    expect(html).toContain("32");
    expect(html).toContain('/dashboard/owner/automation/example/analytics');
    expect(html).not.toContain("Manage automation");
  });
  it("shows paused state and a start control for inactive automations", () => {
    const html = mobile(false, false);
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain('aria-label="Start automation"');
    expect(html).toContain("Paused");
  });
});
