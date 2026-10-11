import { afterEach, beforeEach, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("INSTAGRAM_APP_ID", "test-app");
  vi.stubEnv("INSTAGRAM_APP_SECRET", "test-secret-never-in-url");
  vi.stubEnv("INSTAGRAM_REDIRECT_URI", "https://ap3k.com/callback/instagram");
  vi.stubEnv("INSTAGRAM_LOGIN_SCOPES", "instagram_business_basic,instagram_business_manage_messages");
});
afterEach(() => vi.unstubAllEnvs());

it.each([
  "https://www.instagram.com/oauth/authorize",
  "https://instagram.com/oauth/authorize/",
  "https://api.instagram.com/oauth/authorize",
])("starts OAuth through the API host when configured with %s", async endpoint => {
  vi.stubEnv("INSTAGRAM_OAUTH_URL", endpoint);
  const { getInstagramLoginOAuthUrl } = await import("./instagram-login");
  const url = new URL(getInstagramLoginOAuthUrl("signed-state-with+/symbols"));
  expect(url.origin).toBe("https://api.instagram.com");
  expect(url.searchParams.get("state")).toBe("signed-state-with+/symbols");
  expect(url.searchParams.get("client_id")).toBe("test-app");
  expect(url.searchParams.get("redirect_uri")).toBe("https://ap3k.com/callback/instagram");
  expect(url.searchParams.get("response_type")).toBe("code");
  expect(url.searchParams.get("scope")).toBe("instagram_business_basic,instagram_business_manage_messages");
  expect(url.searchParams.get("force_authentication")).toBe("1");
  expect(url.searchParams.get("enable_fb_login")).toBe("0");
  expect(url.toString()).not.toContain("test-secret-never-in-url");
});
