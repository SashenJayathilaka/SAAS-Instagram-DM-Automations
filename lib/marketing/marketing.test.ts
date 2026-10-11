import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { hashToken, validConfirmation, unsubscribeToken, validUnsubscribeToken } from "./tokens";
import { marketingEmail } from "./content";

const mocks = vi.hoisted(() => ({
  delivery: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
  lead: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  user: { findFirst: vi.fn() }, slot: { upsert: vi.fn(), deleteMany: vi.fn() }, send: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ client: { emailDelivery: mocks.delivery, marketingLead: mocks.lead, user: mocks.user, marketingRateLimit: mocks.slot } }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
import { deliverMarketingEmail, marketingReady, processMarketingQueue } from "./delivery";
const token = "a".repeat(64);
const payload = { from: "AP3K <updates@ap3k.com>", to: "subscriber@example.com", replyTo: "support@ap3k.com", subject: "Saved", html: "<p>Saved</p>", text: "Saved", headers: {} };
const lead = () => ({ id: "lead", email: "subscriber@example.com", confirmedAt: new Date(Date.now() - 6 * 86400000), confirmationHash: hashToken(token), expiresAt: new Date(Date.now() + 86400000), unsubscribedAt: null, suppressedAt: null, completedAt: null });
const row = (stage = "test") => ({ id: "delivery", category: "lead_nurture", templateId: `marketing_${stage}`, recipient: "subscriber@example.com", status: "PENDING", providerMessageId: null, errorCode: null, updatedAt: new Date(Date.now() - 600000), idempotencyKey: "stable-provider-key", metadata: { leadId: "lead", stage, payload, attempts: 0 } });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("RESEND_API_KEY", "test"); vi.stubEnv("RESEND_WEBHOOK_SECRET", "test"); vi.stubEnv("CRON_SECRET", "test-secret"); vi.stubEnv("AP3K_MARKETING_ENABLED", "true");
  mocks.delivery.findUnique.mockResolvedValue(row()); mocks.delivery.findFirst.mockResolvedValue(null); mocks.delivery.updateMany.mockResolvedValue({ count: 1 });
  mocks.lead.findUnique.mockResolvedValue(lead()); mocks.user.findFirst.mockResolvedValue(null); mocks.slot.upsert.mockResolvedValue({ count: 1 });
  mocks.send.mockResolvedValue({ data: { id: "provider-id" }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("launch-kit consent and delivery", () => {
  it.each(["2026-10-09T12:00:00Z", "2027-01-01T00:01:00Z", "2028-02-29T23:59:00Z"])("keeps monthly recipient caps through cleanup at %s", async instant => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(instant));
    const now = Date.now();
    const month = new Date(instant); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);
    const rows = [
      { id: "current-month-referral", windowStart: month, updatedAt: new Date(now - 3 * 86400000) },
      { id: "current-day-support", windowStart: new Date(now - 3600000), updatedAt: new Date(now) },
      { id: "recent-previous-window", windowStart: new Date(month.getTime() - 86400000), updatedAt: new Date(now - 3600000) },
      { id: "expired", windowStart: new Date(month.getTime() - 3 * 86400000), updatedAt: new Date(now - 3 * 86400000) },
    ];
    // Evaluate the actual deletion filter against representative stored counters.
    const deleted: string[] = [];
    mocks.slot.deleteMany.mockImplementation(async ({ where }) => {
      for (const row of rows) if (Object.entries(where).every(([field, comparison]) => row[field as "windowStart" | "updatedAt"] < (comparison as { lt: Date }).lt)) deleted.push(row.id);
      return { count: deleted.length };
    });
    mocks.lead.findMany.mockResolvedValue([]); mocks.delivery.findMany.mockResolvedValue([]);
    await processMarketingQueue();
    expect(deleted).toEqual(["expired"]);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects expired, tampered, wrong-purpose and cross-recipient tokens", () => {
    expect(validConfirmation(hashToken(token), token, new Date(Date.now() + 1000))).toBe(true);
    expect(validConfirmation(hashToken(token), token, new Date(Date.now() - 1))).toBe(false);
    expect(validConfirmation(hashToken(token), "b".repeat(64), new Date(Date.now() + 1000))).toBe(false);
    expect(validUnsubscribeToken("one", unsubscribeToken("one"))).toBe(true);
    expect(validUnsubscribeToken("two", unsubscribeToken("one"))).toBe(false);
    expect(validUnsubscribeToken("one", token)).toBe(false);
  });
  it("never sends from preview or when required delivery controls are absent", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); expect(marketingReady()).toBe(false);
    expect(await deliverMarketingEmail("delivery")).toBe("skipped"); expect(mocks.send).not.toHaveBeenCalled();
    vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("RESEND_WEBHOOK_SECRET", ""); expect(marketingReady()).toBe(false);
  });
  it.each(["unsubscribedAt", "suppressedAt"])("honors %s before claiming a send", async field => {
    mocks.lead.findUnique.mockResolvedValue({ ...lead(), [field]: new Date() });
    await deliverMarketingEmail("delivery"); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("requires confirmed opt-in for lessons and honors historical suppressions", async () => {
    mocks.lead.findUnique.mockResolvedValue({ ...lead(), confirmedAt: null }); await deliverMarketingEmail("delivery"); expect(mocks.send).not.toHaveBeenCalled();
    mocks.lead.findUnique.mockResolvedValue(lead()); mocks.delivery.findFirst.mockResolvedValue({ id: "bounce" }); await deliverMarketingEmail("delivery"); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("stops sales follow-ups when the subscriber becomes a customer", async () => {
    mocks.user.findFirst.mockResolvedValue({ id: "customer" });
    expect(await deliverMarketingEmail("delivery")).toBe("skipped"); expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.lead.update).toHaveBeenCalled();
  });
  it("delivers the requested kit even when an account already exists", async () => {
    mocks.delivery.findUnique.mockResolvedValue(row("kit")); mocks.user.findFirst.mockResolvedValue({ id: "customer" });
    expect(await deliverMarketingEmail("delivery")).toBe("sent");
  });
  it("does not send after losing the atomic claim or exhausting the daily cap", async () => {
    mocks.delivery.updateMany.mockResolvedValueOnce({ count: 0 }); await deliverMarketingEmail("delivery"); expect(mocks.send).not.toHaveBeenCalled();
    mocks.slot.upsert.mockResolvedValue({ count: 31 }); await deliverMarketingEmail("delivery"); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rechecks unsubscribe immediately before the provider call", async () => {
    mocks.lead.findUnique.mockResolvedValueOnce(lead()).mockResolvedValueOnce({ ...lead(), unsubscribedAt: new Date() });
    await deliverMarketingEmail("delivery"); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("uses the identical payload and idempotency key after ambiguous failure", async () => {
    const original = row(); mocks.delivery.findUnique.mockResolvedValue({ ...original, status: "FAILED", errorCode: "marketing_retry", metadata: { ...original.metadata, attempts: 1, firstAttemptAt: new Date().toISOString() } });
    expect(await deliverMarketingEmail("delivery")).toBe("sent"); expect(mocks.send).toHaveBeenCalledWith(payload, { idempotencyKey: "stable-provider-key" });
  });
  it("never retries outside the provider idempotency window", async () => {
    const original = row(); mocks.delivery.findUnique.mockResolvedValue({ ...original, metadata: { ...original.metadata, firstAttemptAt: new Date(Date.now() - 24 * 3600000).toISOString() } });
    await deliverMarketingEmail("delivery"); expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.delivery.updateMany.mock.calls.at(-1)?.[0].data.errorCode).toBe("marketing_retry_expired");
  });
  it("does not resend accepted email or obsolete confirmation tokens", async () => {
    mocks.delivery.findUnique.mockResolvedValue({ ...row(), providerMessageId: "already-sent" }); await deliverMarketingEmail("delivery");
    mocks.delivery.findUnique.mockResolvedValue(row("confirm")); mocks.lead.findUnique.mockResolvedValue({ ...lead(), confirmedAt: null }); await deliverMarketingEmail("delivery");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("spaces follow-ups and never catches up multiple lessons in one run", async () => {
    mocks.lead.findMany.mockResolvedValue([lead()]); mocks.delivery.findMany.mockResolvedValueOnce([{ templateId: "marketing_kit", sentAt: new Date() }]).mockResolvedValueOnce([]);
    await processMarketingQueue(); expect(mocks.delivery.upsert).not.toHaveBeenCalled();
  });
  it("includes company identity, unsubscribe, and audience-specific copy", () => {
    for (const stage of ["confirm", "kit", "test", "launch"] as const) {
      const content = marketingEmail(stage, "creator", "https://ap3k.com/confirm", "https://ap3k.com/unsubscribe");
      expect(content.html).toContain("AP3K LLC"); expect(content.text).toContain("30 N Gould"); expect(content.html).toContain("Unsubscribe");
    }
    expect(marketingEmail("kit", "ecommerce", "", "").text).toContain("PRODUCT");
    expect(marketingEmail("kit", "creator", "", "").text).toContain("GUIDE");
  });
});
