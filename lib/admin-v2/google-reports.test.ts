import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ guard: vi.fn(), fetch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
}));
vi.mock("@/lib/admin", () => ({ requireOwnerAdmin: mocks.guard }));
import { getGoogleReports } from "./google-reports";

describe("private Google reporting connection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubEnv("ADMIN_GOOGLE_SERVICE_ACCOUNT_JSON", "");
    vi.stubEnv("ADMIN_GA4_PROPERTY_ID", "");
    vi.stubEnv("ADMIN_GSC_SITE_URL", "https://ap3k.com/");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("requires owner access even when reports are cached", async () => {
    mocks.guard.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(getGoogleReports()).rejects.toThrow("NOT_FOUND");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("shows setup-required without fabricated data when credentials are absent", async () => {
    const data = await getGoogleReports();
    expect(data.ga.connected).toBe(false);
    expect(data.gsc.rows).toEqual([]);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("never leaks malformed credentials into the result", async () => {
    vi.stubEnv("ADMIN_GOOGLE_SERVICE_ACCOUNT_JSON", "sensitive-invalid-json");
    const data = await getGoogleReports();
    expect(JSON.stringify(data)).not.toContain("sensitive-invalid-json");
    expect(data.ga.message).toContain("authentication failed");
  });
  it("reads real channel and query rows through fixed read-only reporting endpoints", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    vi.stubEnv(
      "ADMIN_GOOGLE_SERVICE_ACCOUNT_JSON",
      JSON.stringify({
        client_email: "reports@example.test",
        private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
      }),
    );
    vi.stubEnv("ADMIN_GA4_PROPERTY_ID", "1234");
    mocks.fetch.mockImplementation(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.includes("oauth2")
              ? { access_token: "test-token" }
              : url.includes("analyticsdata")
                ? {
                    rows: [
                      {
                        dimensionValues: [{ value: "Organic Search" }],
                        metricValues: [
                          { value: "12" },
                          { value: "10" },
                          { value: "2" },
                        ],
                      },
                    ],
                  }
                : {
                    rows: [
                      {
                        keys: ["instagram dm automation"],
                        clicks: 2,
                        impressions: 40,
                        ctr: 0.05,
                        position: 12.4,
                      },
                    ],
                  },
          ),
          { status: 200 },
        ),
    );
    const data = await getGoogleReports();
    expect(data.ga.rows[0]).toEqual({
      label: "Organic Search",
      values: ["12", "10", "2"],
    });
    expect(data.gsc.rows[0].values).toEqual(["2", "40", "5.0%", "12.4"]);
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(data)).not.toContain("test-token");
  });
});
