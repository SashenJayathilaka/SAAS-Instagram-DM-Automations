import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: unknown) => handler,
  createRouteMatcher: () => (request: NextRequest) => request.nextUrl.pathname.startsWith("/dashboard"),
}));
import middleware from "../middleware";
const run = middleware as unknown as (auth: unknown, req: NextRequest) => Promise<Response>;
function request(path: string, method = "GET") {
  return new NextRequest(`https://ap3k.com${path}`, {method, headers:{cookie:"ap3k_locale=en"}});
}
function session(userId: string | null = "user_123") {
  return Object.assign(vi.fn(async () => ({userId})), {protect:vi.fn(async () => {})});
}
describe("dashboard entry routing", () => {
  it("protects the request before redirecting directly to the session owner's workspace", async () => {
    const auth = session(); const response = await run(auth,request("/dashboard"));
    expect(auth.protect).toHaveBeenCalled();
    expect(auth.protect.mock.invocationCallOrder[0]).toBeLessThan(auth.mock.invocationCallOrder[0]);
    expect(response.headers.get("location")).toBe("https://ap3k.com/dashboard/user_123");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("preserves approved email destinations while rejecting external or foreign paths", async () => {
    expect((await run(session(),request("/dashboard?next=%2Fbilling"))).headers.get("location")).toBe("https://ap3k.com/dashboard/user_123/billing");
    for (const target of ["https://evil.example", "//evil.example", "/dashboard/user_other"]) {
      expect((await run(session(),request(`/dashboard?next=${encodeURIComponent(target)}`))).headers.get("location")).toBe("https://ap3k.com/dashboard/user_123");
    }
  });
  it("does not bypass failed authentication", async () => {
    const auth = session(null); auth.protect.mockRejectedValue(new Error("unauthenticated"));
    await expect(run(auth,request("/dashboard"))).rejects.toThrow("unauthenticated");
    expect(auth).not.toHaveBeenCalled();
  });
  it("routes the homepage Flow Builder CTA to the current user's flow editor", async () => {
    const target = encodeURIComponent("/automation/new?type=flow");
    expect((await run(session(), request(`/dashboard?next=${target}`))).headers.get("location")).toBe("https://ap3k.com/dashboard/user_123/automation/new?type=flow");
    const unsupported = encodeURIComponent("/automation/new?type=flow&redirect=https://evil.example");
    expect((await run(session(), request(`/dashboard?next=${unsupported}`))).headers.get("location")).toBe("https://ap3k.com/dashboard/user_123");
  });
  it("leaves canonical pages and server-action POST requests to their normal handlers", async () => {
    for (const req of [request("/dashboard/user_123"),request("/dashboard","POST")]) {
      expect((await run(session(),req)).headers.get("location")).toBeNull();
    }
  });
});
