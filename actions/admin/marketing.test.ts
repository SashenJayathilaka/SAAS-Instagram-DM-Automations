import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), process: vi.fn(), redirect: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireOwnerAdmin: mocks.auth }));
vi.mock("@/lib/marketing/delivery", () => ({ processMarketingQueue: mocks.process }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { processMarketingEmailsAction } from "./marketing";
beforeEach(() => vi.resetAllMocks());
describe("owner marketing queue control", () => {
  it("checks owner authorization before performing any delivery work", async () => {
    mocks.auth.mockRejectedValue(new Error("denied"));
    await expect(processMarketingEmailsAction()).rejects.toThrow("denied"); expect(mocks.process).not.toHaveBeenCalled();
  });
  it("reports the actual processed count and refreshes owner reporting", async () => {
    mocks.process.mockResolvedValue({ enabled: true, sent: 2 });
    await processMarketingEmailsAction(); expect(mocks.revalidate).toHaveBeenCalledWith("/admin/acquisition"); expect(mocks.redirect).toHaveBeenCalledWith("/admin/acquisition?run=sent-2");
  });
});
