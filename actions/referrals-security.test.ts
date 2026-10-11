import { beforeEach, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  currentUser: vi.fn(), user: { findUnique: vi.fn() },
  referralInvite: { count: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  marketingRateLimit: { upsert: vi.fn() }, send: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: m.currentUser }));
vi.mock("@/lib/prisma", () => ({ client: { ...m, $transaction: (fn: (tx: typeof m) => unknown) => fn(m) } }));
vi.mock("@/lib/referral-program", () => ({ getOrCreateReferralPartner: async () => ({ id: "partner", code: "AP3K-SYNTHETIC" }) }));
vi.mock("@/lib/admin", () => ({ requireOwnerAdmin: vi.fn() }));
vi.mock("@/lib/email/delivery", () => ({ getEmailConfiguration: () => ({ apiKey: "test", from: "test@example.com" }) }));
vi.mock("@/lib/app-url", () => ({ getApplicationUrl: () => "https://ap3k.com" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: m.send }; } }));
import { sendReferralInvite } from "./referrals";

beforeEach(() => {
  vi.resetAllMocks();
  m.currentUser.mockResolvedValue({ id: "clerk" });
  m.user.findUnique.mockResolvedValue({ id: "owner", email: "owner@example.com", status: "ACTIVE" });
  m.referralInvite.count.mockResolvedValue(0);
  m.referralInvite.findUnique.mockResolvedValue(null);
  m.referralInvite.findFirst.mockResolvedValue(null);
  m.referralInvite.create.mockResolvedValue({ id: "invite" });
  m.marketingRateLimit.upsert.mockResolvedValue({ count: 1 });
  m.send.mockResolvedValue({ data: { id: "synthetic" }, error: null });
});

it("blocks a repeat across partners even if cleanup erased its monthly counter", async () => {
  m.referralInvite.findFirst.mockResolvedValue({ id: "other-partner-invite" });
  expect(await sendReferralInvite("recipient@example.com")).toMatchObject({ ok: false, error: "This email has already received a recent invitation." });
  expect(m.referralInvite.findFirst).toHaveBeenCalledWith({
    where: { recipient: "recipient@example.com", day: { gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)) } },
    select: { id: true },
  });
  expect(m.marketingRateLimit.upsert).not.toHaveBeenCalled();
  expect(m.referralInvite.create).not.toHaveBeenCalled();
  expect(m.send).not.toHaveBeenCalled();
});

it("keeps the atomic cross-partner cap when no invitation history remains", async () => {
  m.marketingRateLimit.upsert.mockResolvedValue({ count: 2 });
  expect(await sendReferralInvite("recipient@example.com")).toMatchObject({ ok: false });
  expect(m.referralInvite.create).not.toHaveBeenCalled();
  expect(m.send).not.toHaveBeenCalled();
});

it("preserves an eligible deliberate invitation", async () => {
  expect(await sendReferralInvite("recipient@example.com")).toEqual({ ok: true });
  expect(m.send).toHaveBeenCalledTimes(1);
  expect(m.send).toHaveBeenCalledWith(expect.objectContaining({ to: "recipient@example.com" }), { idempotencyKey: "ap3k-referral-invite-invite" });
});

it("rejects suspended sessions before reserving or emailing", async () => {
  m.user.findUnique.mockResolvedValue({ id: "owner", status: "SUSPENDED" });
  expect(await sendReferralInvite("recipient@example.com")).toMatchObject({ ok: false });
  expect(m.referralInvite.count).not.toHaveBeenCalled();
  expect(m.send).not.toHaveBeenCalled();
});
