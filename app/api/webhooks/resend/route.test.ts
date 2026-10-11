import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verify: vi.fn(), delivery: vi.fn(), lead: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { webhooks = { verify: mocks.verify }; } }));
vi.mock("@/lib/prisma", () => ({ client: { emailDelivery: { updateMany: mocks.delivery }, marketingLead: { updateMany: mocks.lead } } }));
vi.mock("@/lib/email/delivery", () => ({ getEmailConfiguration: () => ({ apiKey: "test", webhookSecret: "test" }) }));
import { POST } from "./route";

let row: Record<string, unknown>;
let suppressed: boolean;
beforeEach(() => {
  vi.resetAllMocks();
  row = { providerMessageId: "test-message", status: "SENT", deliveredAt: null, openedAt: null, clickedAt: null };
  suppressed = false;
  // Apply the actual atomic database predicate to an in-memory record. This
  // exercises event permutations rather than asserting implementation calls.
  mocks.delivery.mockImplementation(async ({ where, data }) => {
    if (where.providerMessageId !== row.providerMessageId) return { count: 0 };
    if (where.status?.in && !where.status.in.includes(row.status)) return { count: 0 };
    for (const field of ["deliveredAt", "openedAt", "clickedAt"]) {
      if (field in where && where[field] !== row[field]) return { count: 0 };
    }
    Object.assign(row, data);
    return { count: 1 };
  });
  mocks.lead.mockImplementation(async () => { suppressed = true; return { count: 1 }; });
});
async function event(type: string, when = "2026-09-29T06:00:00Z") {
  mocks.verify.mockReturnValue({ type, created_at: when, data: { email_id: "test-message", to: ["simulator@example.test"] } });
  return POST(new Request("https://ap3k.com/api/webhooks/resend", { method: "POST", body: "{}", headers: { "svix-id": "test", "svix-timestamp": "test", "svix-signature": "test" } }));
}
describe("Resend delivery event ordering", () => {
  it("keeps delivered after a late sent callback", async () => {
    await event("email.delivered");
    await event("email.sent");
    expect(row.status).toBe("DELIVERED");
    expect(row.deliveredAt).toEqual(new Date("2026-09-29T06:00:00Z"));
  });
  it("keeps clicked while filling earlier milestones arriving late", async () => {
    await event("email.clicked");
    await event("email.opened");
    await event("email.delivered");
    await event("email.sent");
    await event("email.failed");
    expect(row.status).toBe("CLICKED");
    expect(row.openedAt).toBeInstanceOf(Date);
    expect(row.deliveredAt).toBeInstanceOf(Date);
  });
  it.each(["bounced", "complained", "suppressed"])("preserves %s and suppression through later success callbacks", async terminal => {
    await event(`email.${terminal}`);
    await event("email.delivered");
    await event("email.opened");
    await event("email.clicked");
    await event("email.sent");
    await event("email.failed");
    expect(row.status).toBe(terminal.toUpperCase());
    expect(suppressed).toBe(true);
  });
  it("records a later successful delivery after a failure", async () => {
    await event("email.failed");
    await event("email.delivered");
    expect(row.status).toBe("DELIVERED");
  });
  it("does not overwrite the first recorded milestone on replay", async () => {
    await event("email.delivered");
    await event("email.delivered", "2026-09-29T07:00:00Z");
    expect(row.deliveredAt).toEqual(new Date("2026-09-29T06:00:00Z"));
  });
  it("rejects invalid signatures without changing delivery or consent", async () => {
    mocks.verify.mockImplementation(() => { throw new Error("invalid signature"); });
    const result = await POST(new Request("https://ap3k.com/api/webhooks/resend", { method: "POST", body: "{}", headers: { "svix-id": "test", "svix-timestamp": "test", "svix-signature": "test" } }));
    expect(result.status).toBe(400);
    expect(mocks.delivery).not.toHaveBeenCalled();
    expect(mocks.lead).not.toHaveBeenCalled();
  });
});
