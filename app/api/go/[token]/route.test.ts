import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ link: vi.fn(), click: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { automationTrackedLink: { findUnique: mocks.link } } }));
vi.mock("@/lib/automation-tracking", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/automation-tracking")>(), recordAutomationClick: mocks.click }));
import { GET, HEAD } from "./route";
const token = "00000000-0000-0000-0000-000000000001";
const context = { params: Promise.resolve({ token }) };
const request = (headers = {}) => new NextRequest(`https://ap3k.com/api/go/${token}?country=US`, { headers: { "user-agent": "Mozilla/5.0 Chrome/126", ...headers } });
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("VERCEL", "1"); mocks.link.mockResolvedValue({ automationId: "automation", recipientIgId: "contact", destination: "https://example.com/guide" }); vi.spyOn(console, "warn").mockImplementation(() => {}); });
it("redirects a human with no caching or referrer leakage and edge-provided country", async () => {
  const response = await GET(request({ "x-vercel-ip-country": "MA" }), context);
  expect(response.status).toBe(302); expect(response.headers.get("location")).toBe("https://example.com/guide");
  expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow"); expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(mocks.click).toHaveBeenCalledWith({ id: "00000000-0000-0000-0000-000000000001", automationId: "automation", recipientIgId: "contact" }, "MA");
});
it("redirects HEAD, preview bots, and prefetch without counting a click", async () => {
  expect((await HEAD(request(), context)).status).toBe(302);
  expect((await GET(request({ "user-agent": "facebookexternalhit/1.1" }), context)).status).toBe(302);
  expect((await GET(request({ purpose: "prefetch" }), context)).status).toBe(302);
  expect(mocks.click).not.toHaveBeenCalled();
});
it("still redirects when click persistence fails", async () => {
  mocks.click.mockRejectedValue(new Error("unavailable"));
  expect((await GET(request(), context)).headers.get("location")).toBe("https://example.com/guide");
});
it("does not trust country query parameters or geo headers outside Vercel", async () => {
  vi.stubEnv("VERCEL", ""); await GET(request({ "x-vercel-ip-country": "US" }), context);
  expect(mocks.click.mock.calls[0][1]).toBeNull();
});
it("rejects invalid tokens before DB lookup and missing or unsafe destinations", async () => {
  expect((await GET(request(), { params: Promise.resolve({ token: "../../etc" }) })).status).toBe(404); expect(mocks.link).not.toHaveBeenCalled();
  mocks.link.mockResolvedValue(null); expect((await GET(request(), context)).status).toBe(404);
  mocks.link.mockResolvedValue({ destination: "javascript:alert(1)" }); expect((await GET(request(), context)).status).toBe(404);
  expect(mocks.click).not.toHaveBeenCalled();
});
