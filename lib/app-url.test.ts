import { afterEach, describe, expect, it, vi } from "vitest";
import { getApplicationUrl } from "@/lib/app-url";

describe("getApplicationUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the configured canonical host in production and removes trailing paths", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_HOST_URL", "https://ap3k.com/some-path/");
    vi.stubEnv("VERCEL_URL", "deployment.vercel.app");

    expect(getApplicationUrl()).toBe("https://ap3k.com");
  });

  it("uses the current Vercel deployment URL for previews", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_HOST_URL", "https://ap3k.com");
    vi.stubEnv("VERCEL_URL", "ap3k-git-polish.vercel.app");

    expect(getApplicationUrl()).toBe("https://ap3k-git-polish.vercel.app");
  });

  it("falls back to the local development origin", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_HOST_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("PORT", "3100");

    expect(getApplicationUrl()).toBe("http://localhost:3100");
  });
});
