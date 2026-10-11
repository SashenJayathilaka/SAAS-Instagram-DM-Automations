import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailDelivery } from "@prisma/client";
import { ownerAlertContent, ownerAlertConfiguration, type OwnerAlert } from "./owner-alert-content";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), upsert: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { emailDelivery: mocks } }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock("./render", () => ({ renderAp3kEmail: vi.fn(async () => ({ subject: "Owner update", html: "<p>Customer update</p>", text: "Customer update" })) }));
import { canAttemptOwnerAlert, deliverOwnerAlert, enqueueOwnerAlert, ownerAlertKey } from "./owner-alerts";

const alert: OwnerAlert = { kind: "signup", key: "user-1", occurredAt: "2026-09-20T12:00:00Z", email: "customer@example.com" };
function row(overrides: Partial<EmailDelivery> = {}): EmailDelivery {
  return { id: "delivery-1", category: "owner_alert", templateId: "owner_signup", recipient: "owner@example.com", status: "PENDING", providerMessageId: null, errorCode: null, updatedAt: new Date(Date.now() - 10_000), idempotencyKey: "ap3k:owner:test:123", metadata: { version: 1, attempts: 0, content: ownerAlertContent(alert) }, ...overrides } as EmailDelivery;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("AP3K_OWNER_ALERTS_ENABLED", "true"); vi.stubEnv("AP3K_OWNER_ALERT_EMAIL", "owner@example.com"); vi.stubEnv("RESEND_API_KEY", "test-key");
  mocks.findFirst.mockResolvedValue(null); mocks.updateMany.mockResolvedValue({ count: 1 }); mocks.update.mockResolvedValue({});
  mocks.send.mockResolvedValue({ data: { id: "email-1" }, error: null });
});

describe("important owner alerts", () => {
  it("disables delivery in previews and uses the configured owner address only", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(ownerAlertConfiguration().enabled).toBe(false);
    expect(await enqueueOwnerAlert(alert)).toBeNull();
    expect(mocks.upsert).not.toHaveBeenCalled();
    vi.stubEnv("VERCEL_ENV", "production");
    await enqueueOwnerAlert(alert);
    expect(mocks.upsert.mock.calls[0][0].create.recipient).toBe("owner@example.com");
    expect(mocks.upsert.mock.calls[0][0].create.recipient).not.toBe(alert.email);
  });
  it("keeps one key per business event, even across provider retries", () => {
    expect(ownerAlertKey(alert, "owner@example.com")).toBe(ownerAlertKey({ ...alert }, "owner@example.com"));
    expect(ownerAlertKey(alert, "owner@example.com")).not.toBe(ownerAlertKey({ ...alert, kind: "payment" }, "owner@example.com"));
  });
  it("formats currency in its actual minor units and labels the admin CTA", () => {
    expect(ownerAlertContent({ ...alert, kind: "payment", amount: 900, currency: "usd", userId: "id-1" }).subject).toContain("$9.00");
    expect(ownerAlertContent({ ...alert, kind: "payment", amount: 900, currency: "jpy" }).subject).toContain("¥900");
    expect(ownerAlertContent({ ...alert, userId: "id-1" }).cta?.url).toBe("https://ap3k.com/admin/users/id-1");
  });
  it("never retries sent, suppressed, permanent failures, or expired ambiguous sends", () => {
    for (const status of ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED", "SUPPRESSED", "SKIPPED"] as const) expect(canAttemptOwnerAlert(row({ status }))).toBe(false);
    expect(canAttemptOwnerAlert(row({ status: "FAILED", errorCode: "owner_provider_rejected" }))).toBe(false);
    expect(canAttemptOwnerAlert(row({ metadata: { version: 1, attempts: 1, firstAttemptAt: new Date(Date.now() - 24 * 3600_000).toISOString() } }))).toBe(false);
    expect(canAttemptOwnerAlert(row({ errorCode: "owner_sending", updatedAt: new Date() }))).toBe(false);
  });
  it("only the worker that claims a pending message can send it", async () => {
    mocks.findUnique.mockResolvedValue(row()); mocks.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await deliverOwnerAlert("delivery-1")).toBe("skipped");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("reuses the exact saved payload and provider key after an ambiguous failure", async () => {
    const payload = { from: "AP3K <updates@ap3k.com>", to: "owner@example.com", replyTo: "support@ap3k.com", subject: "Original", html: "<p>Original</p>", text: "Original" };
    mocks.findUnique.mockResolvedValue(row({ status: "FAILED", errorCode: "owner_retry", metadata: { version: 1, attempts: 1, content: ownerAlertContent(alert), payload, firstAttemptAt: new Date().toISOString() } as any }));
    expect(await deliverOwnerAlert("delivery-1")).toBe("sent");
    expect(mocks.send).toHaveBeenCalledWith(payload, { idempotencyKey: "ap3k:owner:test:123" });
  });
  it("queues transient provider failures without throwing into the customer flow", async () => {
    mocks.findUnique.mockResolvedValue(row()); mocks.send.mockResolvedValue({ data: null, error: { name: "rate_limit_exceeded", statusCode: 429 } });
    expect(await deliverOwnerAlert("delivery-1")).toBe("queued");
    expect(mocks.updateMany.mock.calls.at(-1)?.[0].data.errorCode).toBe("owner_retry");
  });
});
