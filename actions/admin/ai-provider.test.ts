import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  guard: vi.fn(), audit: vi.fn(), find: vi.fn(), update: vi.fn(),
  updateMany: vi.fn(), test: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/actions/admin/safe-actions", () => ({ requireAdminAction: mocks.guard, createAdminAuditLog: mocks.audit }));
vi.mock("@/lib/prisma", () => ({ client: {
  aiProviderConfig: { findUnique: mocks.find, update: mocks.update, updateMany: mocks.updateMany },
  $transaction: mocks.transaction,
} }));
vi.mock("@/lib/ai-reply", () => ({ testAiProvider: mocks.test }));
vi.mock("@/lib/ai-provider-crypto", () => ({
  decryptAiProviderSecret: () => "test-secret", aiProviderEncryptionReady: () => true, encryptAiProviderSecret: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { activateAiProviderAction, disableAiProviderAction, setAiProviderFallbackAction, testAiProviderAction } from "./ai-provider";

describe("AI provider health checks preserve routing", () => {
  let config: { id: string; enabled: boolean; model: string; encryptedApiKey: string; lastTestStatus: string };
  beforeEach(() => {
    vi.resetAllMocks();
    config = { id: "google", enabled: true, model: "gemini-3.5-flash-lite", encryptedApiKey: "encrypted", lastTestStatus: "CONNECTED" };
    mocks.guard.mockResolvedValue({ clerkId: "owner" });
    mocks.find.mockImplementation(async () => ({ ...config }));
    mocks.update.mockImplementation(async ({ data }) => Object.assign(config, data));
    mocks.updateMany.mockImplementation(async ({ data }) => { Object.assign(config, data); return { count: 1 }; });
    mocks.test.mockResolvedValue("Thanks for your feedback!");
  });
  it.each([true, false])("does not activate or pause a provider on successful test (enabled=%s)", async (enabled) => {
    config.enabled = enabled;
    expect((await testAiProviderAction("google")).status).toBe(200);
    expect(config.enabled).toBe(enabled);
    expect(config.lastTestStatus).toBe("CONNECTED");
  });
  it.each([429, 503])("keeps the selected provider active after a transient %s so future requests can recover", async (status) => {
    mocks.test.mockRejectedValue(Object.assign(new Error(`${status} temporarily unavailable`), { status }));
    expect((await testAiProviderAction("google")).status).toBe(400);
    expect(config.enabled).toBe(true);
    expect(config.lastTestStatus).toBe("FAILED");
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "AI_PROVIDER_TESTED", status: "FAILED" }));
    mocks.test.mockResolvedValue("Thanks!");
    expect((await testAiProviderAction("google")).status).toBe(200);
    expect(config.enabled).toBe(true);
  });
  it("does not enable an inactive provider after a failed test", async () => {
    config.enabled = false;
    mocks.test.mockRejectedValue(new Error("503 temporary outage"));
    await testAiProviderAction("google");
    expect(config.enabled).toBe(false);
  });
  it("still honors an explicit pause and rejects activation of an unverified provider", async () => {
    await disableAiProviderAction("google");
    expect(config.enabled).toBe(false);
    config.lastTestStatus = "FAILED";
    expect((await activateAiProviderAction("google")).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("requires owner authorization before a test", async () => {
    mocks.guard.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(testAiProviderAction("google")).rejects.toThrow("NOT_FOUND");
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.test).not.toHaveBeenCalled();
  });
  it("does not verify credentials that changed during an in-flight test", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    expect((await testAiProviderAction("google")).status).toBe(400);
    expect(mocks.updateMany.mock.calls[0][0].where).toEqual({ id: "google", model: config.model, encryptedApiKey: config.encryptedApiKey });
  });
  it("requires a successful connection test before approving a backup", async () => {
    config.lastTestStatus = "FAILED";
    expect((await setAiProviderFallbackAction("google", true)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
    config.lastTestStatus = "CONNECTED";
    expect((await setAiProviderFallbackAction("google", true)).status).toBe(200);
    expect(mocks.update.mock.calls[0][0]).toMatchObject({ where: { model: config.model, encryptedApiKey: config.encryptedApiKey, lastTestStatus: "CONNECTED" }, data: { fallbackEnabled: true } });
  });
  it("requires owner authorization before changing backup routing", async () => {
    mocks.guard.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(setAiProviderFallbackAction("google", true)).rejects.toThrow("NOT_FOUND");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("redacts the provider key from failed test results and audit records", async () => {
    mocks.test.mockRejectedValue(new Error("Rejected test-secret"));
    const result = await testAiProviderAction("google");
    expect(result.data).not.toContain("test-secret");
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain("test-secret");
  });
});
