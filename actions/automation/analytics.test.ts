import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), account: vi.fn(), analytics: vi.fn() }));
vi.mock("@/actions/user", () => ({ onCurrentUser: mocks.user }));
vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: mocks.account }));
vi.mock("@/lib/automation-analytics", () => ({ getAutomationAnalytics: mocks.analytics }));
import { onGetAutomationAnalytics } from "./analytics";
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "authenticated-owner" }); mocks.account.mockResolvedValue("selected-account"); mocks.analytics.mockResolvedValue(null); });
it("derives account scope from the authenticated identity, never a browser-provided account", async () => {
  await onGetAutomationAnalytics("automation");
  expect(mocks.account).toHaveBeenCalledWith("authenticated-owner");
  expect(mocks.analytics).toHaveBeenCalledWith("automation", "authenticated-owner", "selected-account");
});
it("does not read analytics if authentication fails", async () => {
  mocks.user.mockRejectedValue(new Error("unauthenticated"));
  await expect(onGetAutomationAnalytics("automation")).rejects.toThrow("unauthenticated");
  expect(mocks.account).not.toHaveBeenCalled(); expect(mocks.analytics).not.toHaveBeenCalled();
});
