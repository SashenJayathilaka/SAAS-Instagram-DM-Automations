import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), account: vi.fn(), user: vi.fn(), integration: vi.fn(), rate: vi.fn(), reserve: vi.fn(), complete: vi.fn(), release: vi.fn(), generate: vi.fn() }));
vi.mock("@/actions/user", () => ({ onCurrentUser: mocks.auth }));
vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: mocks.account }));
vi.mock("@/lib/prisma", () => ({ client: { user: { findUnique: mocks.user }, integrations: { findFirst: mocks.integration } } }));
vi.mock("@/actions/usage/queries", () => ({ reserveAiReplyQuota: mocks.reserve, completeAiReplyReservation: mocks.complete, releaseAiReplyReservation: mocks.release }));
vi.mock("@/lib/webhook-rate-limit", () => ({ consumeWebhookAccountRateLimit: mocks.rate }));
vi.mock("@/lib/automation-flow/ai", async importOriginal => ({ ...(await importOriginal<object>()), generateFlowAssistantDraft: mocks.generate }));
import { generateAutomationFlow } from "./flow-assistant";
const integrationId = "c6c9b7d5-6a95-4e3a-aeee-268147c1e8ab";
const input = { integrationId, prompt: "Ask for an email" };
const draft = { name: "Email", summary: "Collect email", trigger: { source: "DM", keyword: "EMAIL", anyMessage: false }, flow: { version: 1, oncePerContact: false, entry: "email", nodes: [{ id: "email", kind: "email", label: "Email", x: 0, y: 0, text: "Your email?", next: null, skip: null }] }, needsInput: false, warnings: [] };
describe("flow assistant account boundary and quotas", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ id: "clerk-owner" });
    mocks.account.mockResolvedValue(integrationId);
    mocks.user.mockResolvedValue({ id: "owner", status: "ACTIVE", subscription: { plan: "PRO" } });
    mocks.integration.mockResolvedValue({ id: integrationId, planLocked: false });
    mocks.rate.mockResolvedValue({ allowed: true });
    mocks.reserve.mockResolvedValue({ ok: true, reservationId: "reservation" });
    mocks.generate.mockResolvedValue(draft);
  });
  it("requires sign-in, the selected owned account and an eligible plan before AI usage", async () => {
    mocks.auth.mockRejectedValueOnce(new Error("unauthenticated"));
    expect((await generateAutomationFlow(input)).status).toBe(401);
    mocks.account.mockResolvedValueOnce("other-account");
    expect((await generateAutomationFlow(input)).status).toBe(409);
    mocks.user.mockResolvedValueOnce({ id: "owner", status: "ACTIVE", subscription: { plan: "FREE" } });
    expect((await generateAutomationFlow(input)).status).toBe(403);
    mocks.integration.mockResolvedValueOnce(null);
    expect((await generateAutomationFlow(input)).status).toBe(403);
    expect(mocks.integration).toHaveBeenCalledWith({ where: { id: integrationId, userId: "owner" } });
    expect(mocks.reserve).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("blocks suspended and locked accounts", async () => {
    mocks.user.mockResolvedValueOnce({ id: "owner", status: "SUSPENDED", subscription: { plan: "BUSINESS" } });
    expect((await generateAutomationFlow(input)).status).toBe(403);
    mocks.integration.mockResolvedValueOnce({ id: integrationId, planLocked: true });
    expect((await generateAutomationFlow(input)).status).toBe(403);
    expect(mocks.rate).not.toHaveBeenCalled();
  });
  it("enforces burst and monthly limits before invoking the provider", async () => {
    mocks.rate.mockResolvedValueOnce({ allowed: false });
    expect((await generateAutomationFlow(input)).status).toBe(429);
    expect(mocks.reserve).not.toHaveBeenCalled();
    mocks.reserve.mockResolvedValueOnce({ ok: false, reservationId: null });
    expect((await generateAutomationFlow(input)).status).toBe(429);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("returns an unsaved proposal and charges one generation without invoking any automation write or send", async () => {
    // Prisma mock deliberately exposes no automation writes or message sender: generation must be pure draft output.
    const result = await generateAutomationFlow(input);
    expect(result).toMatchObject({ status: 200, flow: draft.flow });
    expect(mocks.complete).toHaveBeenCalledWith("reservation", expect.objectContaining({ outcome: "flow_draft_generated", integrationId }));
    expect(mocks.release).not.toHaveBeenCalled();
    expect(mocks.rate).toHaveBeenCalledWith([`flow-assistant:owner:${integrationId}`], { limit: 6 });
  });
  it("releases failed requests and never returns raw database/provider secrets", async () => {
    mocks.generate.mockRejectedValueOnce(new Error("The AI provider timed out. Please try again."));
    expect(await generateAutomationFlow(input)).toMatchObject({ status: 503, error: "The AI provider timed out. Please try again." });
    expect(mocks.release).toHaveBeenCalledWith("reservation");
    mocks.generate.mockRejectedValueOnce(new Error("request Authorization: secret"));
    const failed = await generateAutomationFlow(input);
    expect(failed.status).toBe(503);
    expect(failed.error).not.toContain("secret");
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
