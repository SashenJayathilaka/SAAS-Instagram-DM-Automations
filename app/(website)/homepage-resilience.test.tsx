import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/font/local", () => ({ default: () => ({ className: "" }) }));
vi.mock("next/font/google", () => ({ Inter: () => ({ className: "" }) }));
vi.mock("@/lib/i18n/server", () => ({ getServerLocale: () => "en" }));
vi.mock("@/lib/editorial-server", () => ({
  getPublishedPosts: vi
    .fn()
    .mockRejectedValue(new Error("database unavailable")),
}));
import LandingPage from "./page";
import { getPublishedPosts } from "@/lib/editorial-server";
it("renders the homepage without requesting the removed editorial feed", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const result = await LandingPage();
  expect(result).toBeTruthy();
  expect(getPublishedPosts).not.toHaveBeenCalled();
  expect(log).not.toHaveBeenCalled();
  log.mockRestore();
});
