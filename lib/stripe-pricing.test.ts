import { afterEach, describe, expect, it, vi } from "vitest";
const prices = vi.hoisted(() => ({ list: vi.fn(), retrieve: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ stripe: { prices } }));
import { resolveStripePriceId } from "./stripe-pricing";
import { annualMonthlyEquivalent } from "./billing-plans";

afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
describe("AP3K LLC price catalog", () => {
  it.each([
    ["PRO", "month", 1500], ["PRO", "year", 12000],
    ["BUSINESS", "month", 2500], ["BUSINESS", "year", 21600],
  ] as const)("resolves %s %s at the published amount", async (plan, interval, amount) => {
    prices.list.mockResolvedValue({ data: [{ id: "price_current", active: true, currency: "usd", unit_amount: amount, recurring: { interval, interval_count: 1 } }] });
    expect(await resolveStripePriceId(plan, interval)).toBe("price_current");
    expect(prices.list).toHaveBeenCalledWith(expect.objectContaining({ lookup_keys: [`ap3k_${plan.toLowerCase()}_${interval}`] }));
  });
  it("shows annual monthly equivalents without charging those as annual totals", () => {
    expect(annualMonthlyEquivalent("PRO")).toBe(10);
    expect(annualMonthlyEquivalent("BUSINESS")).toBe(18);
  });
  it("rejects the previous account's price instead of charging the wrong amount", async () => {
    vi.stubEnv("STRIPE_PRICE_ID_PRO_MONTHLY", "price_old");
    prices.retrieve.mockResolvedValue({ active: true, currency: "usd", unit_amount: 900, recurring: { interval: "month", interval_count: 1 } });
    await expect(resolveStripePriceId("PRO", "month")).rejects.toThrow("does not match");
  });
  it("rejects a multi-year price with the same face value", async () => {
    prices.list.mockResolvedValue({ data: [{ id: "price_wrong", active: true, currency: "usd", unit_amount: 12000, recurring: { interval: "year", interval_count: 2 } }] });
    await expect(resolveStripePriceId("PRO", "year")).rejects.toThrow("does not match");
  });
});
