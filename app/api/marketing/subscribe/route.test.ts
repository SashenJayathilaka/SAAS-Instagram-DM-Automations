import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ ready: vi.fn(), slot: vi.fn(), queue: vi.fn(), deliver: vi.fn(), suppressed: vi.fn(), lead: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ client: { emailDelivery: { findFirst: mocks.suppressed }, marketingLead: mocks.lead } }));
vi.mock("@/lib/marketing/delivery", () => ({ marketingReady: mocks.ready, takeMarketingSlot: mocks.slot, queueMarketingEmail: mocks.queue, deliverMarketingEmail: mocks.deliver }));
import { POST } from "./route";
const input = { email: "subscriber@example.com", audience: "creator", consent: true, source: "launch-kit" };
const request = (body: unknown, origin = "https://ap3k.com") => new Request("https://ap3k.com/api/marketing/subscribe", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mocks.ready.mockReturnValue(true); mocks.slot.mockResolvedValue(true); mocks.suppressed.mockResolvedValue(null); mocks.lead.findUnique.mockResolvedValue(null); mocks.lead.create.mockImplementation(async ({ data }) => ({ id: "lead", ...data })); mocks.queue.mockResolvedValue({ id: "queued" }); });
describe("public marketing signup", () => {
  it("rejects cross-site submission, invalid addresses, and missing explicit consent", async () => {
    expect((await POST(request(input, "https://attacker.example"))).status).toBe(403);
    expect((await POST(request({ ...input, consent: false }))).status).toBe(400);
    expect((await POST(request({ ...input, email: "invalid" }))).status).toBe(400);
    expect(mocks.queue).not.toHaveBeenCalled();
  });
  it("stores consent and a token hash, and only queues confirmation", async () => {
    expect((await POST(request(input))).status).toBe(200);
    const data = mocks.lead.create.mock.calls[0][0].data;
    expect(data.consentVersion).toBe("launch-kit-v1-2026-09-29"); expect(data.confirmedAt).toBeUndefined();
    expect(mocks.queue.mock.calls[0][1]).toBe("confirm"); expect(data.confirmationHash).not.toBe(mocks.queue.mock.calls[0][2]);
  });
  it("silently drops honeypots and capped requests without sending", async () => {
    await POST(request({ ...input, website: "bot" })); expect(mocks.queue).not.toHaveBeenCalled();
    mocks.slot.mockResolvedValue(false); await POST(request(input)); expect(mocks.queue).not.toHaveBeenCalled();
  });
  it("never overwrites unsubscribe or confirms an existing address", async () => {
    mocks.lead.findUnique.mockResolvedValue({ unsubscribedAt: new Date() });
    await POST(request(input)); expect(mocks.lead.updateMany).not.toHaveBeenCalled(); expect(mocks.queue).not.toHaveBeenCalled();
  });
  it("fails closed if delivery controls or storage are unavailable", async () => {
    mocks.ready.mockReturnValue(false); expect((await POST(request(input))).status).toBe(503);
    mocks.ready.mockReturnValue(true); mocks.slot.mockRejectedValue(new Error("offline")); expect((await POST(request(input))).status).toBe(503); expect(mocks.queue).not.toHaveBeenCalled();
  });
});
