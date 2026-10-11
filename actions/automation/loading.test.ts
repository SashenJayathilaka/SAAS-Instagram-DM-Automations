import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ current: vi.fn(), list: vi.fn(), refresh: vi.fn(), defer: vi.fn() }));
vi.mock("@/actions/user", () => ({ onCurrentUser: m.current }));
vi.mock("./queries", () => ({ getAutomation: m.list }));
vi.mock("@/lib/campaign-media-refresh", () => ({ refreshExpiredCampaignMediaListForClerkUser: m.refresh }));
vi.mock("@vercel/functions", () => ({ waitUntil: m.defer }));
import { getAllAutomation } from "./index";

beforeEach(() => {
  vi.clearAllMocks();
  m.current.mockResolvedValue({ id: "authenticated-owner" });
});
it("returns owned campaign data while Meta is still pending, without mutating the response", async () => {
  const campaigns = [{ id: "campaign", posts: [{ media: "saved-preview" }] }];
  m.list.mockResolvedValue({ automations: campaigns });
  let finish!: () => void;
  m.refresh.mockImplementation(async (_id, rows) => {
    await new Promise<void>(resolve => { finish = resolve; });
    rows[0].posts[0].media = "refreshed-preview";
  });
  const response = await getAllAutomation();
  expect(response).toEqual({ status: 200, data: campaigns });
  expect(m.list).toHaveBeenCalledWith("authenticated-owner");
  expect(m.defer).toHaveBeenCalledWith(expect.any(Promise));
  finish(); await m.defer.mock.calls[0][0];
  expect(response.data[0].posts[0].media).toBe("saved-preview");
});
it("keeps a failed media refresh from failing navigation", async () => {
  m.list.mockResolvedValue({ automations: [] });
  m.refresh.mockRejectedValue(new Error("Meta timeout"));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect((await getAllAutomation()).status).toBe(200);
  await expect(m.defer.mock.calls[0][0]).resolves.toBeUndefined();
  warning.mockRestore();
});
it("does not refresh data when no owned workspace exists", async () => {
  m.list.mockResolvedValue(null);
  expect(await getAllAutomation()).toEqual({ status: 404, data: [] });
  expect(m.refresh).not.toHaveBeenCalled();
});
