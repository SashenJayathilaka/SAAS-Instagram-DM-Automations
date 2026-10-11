import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("canonical admin consolidation", () => {
  it("makes /admin the protected canonical shell", () => {
    const layout = read("app/(protected)/admin/layout.tsx");
    expect(layout).toContain("await requireOwnerAdmin()");
    expect(layout).toContain('dynamic = "force-dynamic"');
    expect(layout).toContain("index: false");
  });

  it("retires the V1 monolith from /admin", () => {
    const page = read("app/(protected)/admin/page.tsx");
    expect(page).toContain("redirect(");
    expect(page).not.toContain("client.webhookEvent");
    expect(page).not.toContain("AdminShell");
  });

  it("maps important V1 sections into the canonical dashboard", () => {
    const page = read("app/(protected)/admin/page.tsx");
    expect(page).toContain('subscriptions: "billing"');
    expect(page).toContain('integrations: "accounts"');
    expect(page).toContain('webhooks: "diagnostics"');
    expect(page).toContain('compliance: "system"');
    expect(page).toContain('danger: "system"');
  });

  it("redirects both legacy admin URLs to /admin", () => {
    const config = read("next.config.mjs");
    expect(config).toContain('source: "/ap3k-admin-v2/:path*"');
    expect(config).toContain('destination: "/admin/:path*"');
    expect(config).toContain('source: "/ap3k-admin"');
  });

  it("adds no-cache and no-index headers to admin pages", () => {
    const config = read("next.config.mjs");
    expect(config).toContain("noindex, nofollow, noarchive");
    expect(config).toContain("private, no-store");
    expect(config).toContain("no-referrer");
  });

  it("keeps canonical admin access behind the existing owner authorization helper", () => {
    const layout = read("app/(protected)/admin/layout.tsx");
    expect(layout).toContain('from "@/lib/admin"');
    expect(layout).toContain("requireOwnerAdmin");
  });

  it("operational admin queries never select integration tokens", () => {
    const queries = read("lib/admin-v2/operations-queries.ts");
    const selectedToken = queries
      .split("\n")
      .some((line) => line.trim().startsWith("token:") || line.trim() === "token,");
    expect(selectedToken).toBe(false);
    expect(queries).toContain("BILLING_LIMIT = 100");
  });

  it("restores billing and system visibility without restoring a danger-zone monolith", () => {
    expect(read("app/(protected)/admin/billing/page.tsx")).toContain("Plans & subscription access");
    const system = read("app/(protected)/admin/system/page.tsx");
    expect(system).toContain("System & safety");
    expect(system).toContain("Operational control");
  });
});
