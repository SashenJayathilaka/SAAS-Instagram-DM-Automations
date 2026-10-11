import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { hashToken, unsubscribeToken } from "@/lib/marketing/tokens";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn(), queue: vi.fn(), deliver: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { marketingLead: mocks } }));
vi.mock("@/lib/marketing/delivery", () => ({ queueMarketingEmail: mocks.queue, deliverMarketingEmail: mocks.deliver }));
import { GET as confirmGet, POST as confirmPost } from "./confirm/route";
import { GET as unsubscribeGet, POST as unsubscribePost } from "./unsubscribe/route";
const id = "00000000-0000-4000-8000-000000000001", token = "b".repeat(64);
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("RESEND_WEBHOOK_SECRET", "test-secret");
  const lead = { id, confirmationHash: hashToken(token), expiresAt: new Date(Date.now() + 60000), confirmedAt: null, unsubscribedAt: null, suppressedAt: null };
  mocks.findUnique.mockResolvedValue(lead); mocks.findUniqueOrThrow.mockResolvedValue({ ...lead, confirmedAt: new Date() }); mocks.queue.mockResolvedValue({ id: "delivery" });
});
afterEach(() => vi.unstubAllEnvs());
describe("confirmation and unsubscribe boundaries", () => {
  it("does not subscribe or send when an email scanner follows GET", async () => {
    const result = await confirmGet(new Request(`https://ap3k.com/api/marketing/confirm?id=${id}&token=${token}`));
    expect(result.status).toBe(200); expect(await result.text()).toContain('method="post"');
    expect(mocks.updateMany).not.toHaveBeenCalled(); expect(mocks.queue).not.toHaveBeenCalled();
    expect(result.headers.get("referrer-policy")).toBe("no-referrer"); expect(result.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
  it("requires a valid confirmation token and a same-site browser POST", async () => {
    const bad = await confirmPost(new Request(`https://ap3k.com/api/marketing/confirm?id=${id}&token=wrong`, { method: "POST" })); expect(bad.status).toBe(400);
    const cross = await confirmPost(new Request(`https://ap3k.com/api/marketing/confirm?id=${id}&token=${token}`, { method: "POST", headers: { origin: "https://other.example" } })); expect(cross.status).toBe(403);
    expect(mocks.queue).not.toHaveBeenCalled();
  });
  it("records confirmation before queuing only the requested kit", async () => {
    const result = await confirmPost(new Request(`https://ap3k.com/api/marketing/confirm?id=${id}&token=${token}`, { method: "POST" })); expect(result.status).toBe(200);
    expect(mocks.updateMany.mock.calls[0][0].where).toMatchObject({ confirmedAt: null, unsubscribedAt: null, suppressedAt: null });
    expect(mocks.queue.mock.calls[0][1]).toBe("kit");
  });
  it("accepts mailbox one-click POST without login and protects against link scanners", async () => {
    const url = `https://ap3k.com/api/marketing/unsubscribe?id=${id}&token=${unsubscribeToken(id)}`;
    expect((await unsubscribeGet(new Request(url))).status).toBe(200); expect(mocks.updateMany).not.toHaveBeenCalled();
    expect((await unsubscribePost(new Request(url, { method: "POST", body: "List-Unsubscribe=One-Click" }))).status).toBe(200);
    expect(mocks.updateMany.mock.calls[0][0]).toMatchObject({ where: { id, unsubscribedAt: null }, data: { unsubscribedAt: expect.any(Date) } });
  });
  it("does not change any subscriber from an invalid unsubscribe token", async () => {
    expect((await unsubscribePost(new Request(`https://ap3k.com/api/marketing/unsubscribe?id=${id}&token=bad`, { method: "POST" }))).status).toBe(400); expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
