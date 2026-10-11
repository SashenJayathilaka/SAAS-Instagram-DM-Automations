import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findManyIntegrations, updateIntegration, pauseAutomations } = vi.hoisted(() => ({
  findManyIntegrations: vi.fn(),
  updateIntegration: vi.fn(),
  pauseAutomations: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  client: {
    integrations: {
      findMany: (...args: any[]) => findManyIntegrations(...args),
      update: (...args: any[]) => updateIntegration(...args),
    },
    automation: {
      updateMany: (...args: any[]) => pauseAutomations(...args),
    },
  },
}));

import { GET } from "./route";

describe("Instagram token refresh cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "cron-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each(["", "cron-secret"])("rejects spoofed schedule headers when secret is %s", async (secret) => {
    vi.stubEnv("CRON_SECRET", secret);
    const response = await GET(new Request("https://ap3k.com/api/cron/instagram-token-refresh", {
      headers: { "x-vercel-cron-schedule": "27 4 * * *" },
    }) as any);
    expect(response.status).toBe(401);
    expect(findManyIntegrations).not.toHaveBeenCalled();
  });

  it("marks invalidated Meta tokens for reconnect and pauses active automations", async () => {
    findManyIntegrations.mockResolvedValue([
      {
        id: "integration-a",
        token: "long-lived-instagram-token-value",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ]);
    updateIntegration.mockResolvedValue({});
    pauseAutomations.mockResolvedValue({ count: 2 });

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 190,
          type: "OAuthException",
          message: "Error validating access token",
        },
      }),
    })));

    const response = await GET(
      new Request("https://ap3k.com/api/cron/instagram-token-refresh", {
        headers: { authorization: "Bearer cron-secret" },
      }) as any,
    );

    expect(response.status).toBe(207);
    expect(updateIntegration).toHaveBeenCalledWith({
      where: { id: "integration-a" },
      data: expect.objectContaining({
        reconnectRequired: true,
        oauthLastError: "instagram_token_invalidated",
        oauthLastErrorSource: "token_refresh",
      }),
    });
    expect(pauseAutomations).toHaveBeenCalledWith({
      where: { integrationId: "integration-a", active: true, archivedAt: null },
      data: expect.objectContaining({
        active: false,
        needsReview: true,
      }),
    });
  });
});
