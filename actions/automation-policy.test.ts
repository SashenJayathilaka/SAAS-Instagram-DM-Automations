import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ user: vi.fn(), integration: vi.fn(), scope: vi.fn(), reserve: vi.fn(), finish: vi.fn(), generate: vi.fn(), rate: vi.fn(), automation: vi.fn() }));
vi.mock("@/actions/user", () => ({ onCurrentUser: async () => ({ id: "clerk" }) }));
vi.mock("@/lib/prisma", () => ({ client: { user: { findUnique: m.user }, integrations: { findFirst: m.integration }, automation: { findFirst: m.automation } } }));
vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: m.scope }));
vi.mock("@/lib/webhook-rate-limit", () => ({ consumeWebhookAccountRateLimit: m.rate }));
vi.mock("@/lib/automation-policy-quota", () => ({ reservePolicyScan: m.reserve, finishPolicyScan: m.finish }));
vi.mock("@/lib/ai-policy-scan", () => ({ generateAutomationPolicyScan: m.generate }));
vi.mock("@/lib/automation-policy-input", () => ({ mapSavedAutomationPolicy: vi.fn() }));
import { getSavedPolicyInput, scanAutomationPolicy } from "./automation-policy";
const account = "ecbcaf2e-7e22-4f78-a82b-066171489842";
const input = { integrationId: account, sections: [{ id: "reply", label: "Auto Reply", texts: ["Thanks!"] }] };
beforeEach(() => {
  vi.clearAllMocks(); m.scope.mockResolvedValue(account); m.user.mockResolvedValue({ id: "owner", status: "ACTIVE" });
  m.integration.mockResolvedValue({ id: account }); m.rate.mockResolvedValue({ allowed: true });
  m.reserve.mockResolvedValue({ ok: true, id: "reservation", used: 1, limit: 3 }); m.finish.mockResolvedValue(undefined); m.generate.mockResolvedValue([]);
});
describe("policy scan authorization and quota", () => {
  it("allows a free scan without touching publication or reply quota", async () => {
    expect(await scanAutomationPolicy(input)).toEqual({ ok: true, findings: [], used: 1, limit: 3 });
    expect(m.reserve).toHaveBeenCalledWith("owner"); expect(m.finish).toHaveBeenCalledWith("reservation", true);
    expect(m.integration).toHaveBeenCalledWith(expect.objectContaining({ where: { id: account, userId: "owner", planLocked: false } }));
  });
  it("denies exhausted allowance without a provider request", async () => {
    m.reserve.mockResolvedValue({ ok: false, used: 3, limit: 3 });
    expect(await scanAutomationPolicy(input)).toMatchObject({ ok: false, code: "LIMIT", used: 3 }); expect(m.generate).not.toHaveBeenCalled();
  });
  it("refunds provider failure and malformed model responses", async () => {
    m.generate.mockRejectedValue(new Error("provider key secret"));
    const result = await scanAutomationPolicy(input);
    expect(result).toMatchObject({ ok: false, code: "ERROR" }); expect(JSON.stringify(result)).not.toContain("secret");
    expect(m.finish).toHaveBeenCalledWith("reservation", false);
  });
  it.each(["suspended", "account-switch", "not-owner"])("rejects %s before reservation", async scenario => {
    if (scenario === "suspended") m.user.mockResolvedValue({ id: "owner", status: "SUSPENDED" });
    if (scenario === "account-switch") m.scope.mockResolvedValue("different");
    if (scenario === "not-owner") m.integration.mockResolvedValue(null);
    expect(await scanAutomationPolicy(input)).toMatchObject({ ok: false }); expect(m.reserve).not.toHaveBeenCalled();
  });
  it("never trusts client plan data", async () => {
    expect(await scanAutomationPolicy({ ...input, plan: "BUSINESS" } as typeof input)).toMatchObject({ ok: false });
    expect(m.reserve).not.toHaveBeenCalled();
  });
  it("scopes saved automation lookup to its owner and selected account", async () => {
    m.automation.mockResolvedValue(null);
    expect(await getSavedPolicyInput(account)).toBeNull();
    expect(m.automation).toHaveBeenCalledWith(expect.objectContaining({ where: { id: account, userId: "owner", integrationId: account, archivedAt: null } }));
  });
});
