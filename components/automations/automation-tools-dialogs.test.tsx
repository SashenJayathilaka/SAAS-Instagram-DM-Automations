import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PolicyScanDialog } from "./policy-scan-dialog";
import { PublishedDialog } from "./automation-tools-dialogs";
import type { PolicyScanResult } from "@/lib/automation-policy";

const state = vi.hoisted(() => ({ scan: null as PolicyScanResult | null, buttons: [] as Array<{ onClick?: () => void; children?: React.ReactNode }> }));
vi.mock("react", async importOriginal => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react, useState: (initial: unknown) => react.useState(initial === null ? state.scan : initial) };
});
vi.mock("@/actions/automation-policy", () => ({ scanAutomationPolicy: vi.fn() }));
vi.mock("@/actions/automation-tools", () => ({ getBacktrackInfo: vi.fn(), startBacktrack: vi.fn() }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => {
    state.buttons = [];
    const visit = (nodes: React.ReactNode) => React.Children.forEach(nodes, node => {
      if (!React.isValidElement(node)) return;
      const element = node as React.ReactElement<{ onClick?: () => void; children?: React.ReactNode }>;
      if (element.type === "button") state.buttons.push(element.props);
      visit(element.props.children);
    });
    visit(children);
    return <div>{children}</div>;
  },
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
const input = { integrationId: "account", sections: [{ id: "message", label: "Direct Message", texts: ["Visit https://ap3k.com"] }] };
function scan(result: PolicyScanResult | null, publishing = true, fixing = false) {
  state.scan = result;
  return renderToStaticMarkup(<PolicyScanDialog open onOpenChange={vi.fn()} input={input} slug="owner" onPublish={publishing ? vi.fn() : undefined} onApply={fixing ? vi.fn() : undefined} />);
}

describe("automation safety dialog publication decisions", () => {
  it("never claims the loading or failed scan passed", () => {
    const pending = scan(null);
    expect(pending).toContain("Scanning…");
    expect(pending).not.toContain("No risks found");
    expect(pending).not.toContain("Publish anyway");
    const failed = scan({ ok: false, code: "ERROR", error: "Provider unavailable" });
    expect(failed).toContain("Provider unavailable");
    expect(failed).toContain("Retry scan");
    expect(failed).not.toContain("Looks good");
  });
  it("shows the free allowance and an explicit skip without adding publishing to list-only scans", () => {
    const result: PolicyScanResult = { ok: false, code: "LIMIT", error: "Limit", used: 3, limit: 3 };
    expect(scan(result)).toContain("3 of 3 free scans used");
    expect(scan(result)).toContain('href="/dashboard/owner/billing"');
    expect(scan(result)).toContain("Skip check and publish");
    expect(scan(result, false)).not.toContain("Skip check and publish");
  });
  it("offers automatic fixes only when actionable replacements exist", () => {
    const finding = { sectionId: "message", textIndex: 0, title: "Review wording", reason: "Avoid pressure", quote: "Visit" };
    expect(scan({ ok: true, findings: [finding], used: 1, limit: 3 }, true, true)).not.toContain("Fix issues");
    const html = scan({ ok: true, findings: [{ ...finding, replacement: "See https://ap3k.com" }], used: 1, limit: 3 }, true, true);
    expect(html).toContain("Fix issues");
    expect(html).toContain("Publish anyway");
    expect(scan({ ok: true, findings: [{ ...finding, sectionId: "productLink", replacement: "Visit https://ap3k.com" }], used: 1, limit: 3 }, true, true)).not.toContain("Fix issues");
  });
  it("keeps a clean scan advisory and uses Done for saved-automation scans", () => {
    const html = scan({ ok: true, findings: [], used: 0, limit: null }, false);
    expect(html).toContain("No risks found");
    expect(html).toContain("AI guidance, not Meta approval");
    expect(html).toContain("Done");
    expect(html).not.toContain(">Publish<");
  });
  it("lets next-step callbacks transition the parent without closing its controller", () => {
    const close = vi.fn(), backtrack = vi.fn(), safety = vi.fn();
    renderToStaticMarkup(<PublishedDialog open onOpenChange={close} onBacktrack={backtrack} onScan={safety} preferenceKey="owner:hide-next-steps" />);
    state.buttons[0].onClick?.();
    expect(backtrack).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
    state.buttons[1].onClick?.();
    expect(safety).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
  });
  it("does not offer backtracking for ineligible published automations", () => {
    const html = renderToStaticMarkup(<PublishedDialog open onOpenChange={vi.fn()} onScan={vi.fn()} preferenceKey="owner:hide-next-steps" />);
    expect(html).toContain("Automation published");
    expect(html).toContain("Run a safety scan");
    expect(html).not.toContain("Backtrack comments");
  });
});
