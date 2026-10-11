vi.mock("@/lib/instagram-account-entitlements", () => ({ syncInstagramAccountEntitlements: vi.fn() }));
vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: vi.fn(async () => "current-integration"), INSTAGRAM_ACCOUNT_COOKIE: "ap3k_instagram_account" }));
vi.mock("next/headers", () => ({ cookies: () => ({ set: vi.fn() }) }));
vi.mock("@/lib/referral-program", () => ({ activateConnectionBenefits: vi.fn() }));
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeMetaOAuthState,
  createIntegration,
  createMetaOAuthState,
  getLatestMetaOAuthSelection,
  softDisconnectIntegrationForUser,
  updateIntegration,
} from "./queries";
import { client } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  client: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    integrations: {
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    metaOAuthSelection: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    automation: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

const mockClient = client as any;

describe("Meta OAuth state helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.user.findUnique.mockResolvedValue({ id: "user-1" });
    mockClient.metaOAuthSelection.create.mockResolvedValue({ id: "state-row" });
    mockClient.metaOAuthSelection.deleteMany.mockResolvedValue({ count: 1 });
    mockClient.metaOAuthSelection.findMany.mockResolvedValue([]);
  });

  it("stores the hashed state in the existing short-lived OAuth pending table", async () => {
    const expiresAt = new Date("2026-09-01T12:10:00.000Z");

    await createMetaOAuthState("workspace-clerk-user", "session-clerk-user", "state-hash", expiresAt);

    expect(mockClient.metaOAuthSelection.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      })
    );
    expect(mockClient.metaOAuthSelection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          expiresAt,
          accounts: expect.objectContaining({
            kind: "META_OAUTH_STATE",
            stateHash: "state-hash",
            sessionClerkId: "session-clerk-user",
          }),
        }),
      })
    );
  });

  it("consumes a matching state by deleting it once", async () => {
    await expect(
      consumeMetaOAuthState("workspace-clerk-user", "session-clerk-user", "state-hash")
    ).resolves.toBe(true);

    expect(mockClient.metaOAuthSelection.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
          AND: expect.arrayContaining([
            expect.objectContaining({
              accounts: expect.objectContaining({ path: ["stateHash"], equals: "state-hash" }),
            }),
            expect.objectContaining({
              accounts: expect.objectContaining({ path: ["sessionClerkId"], equals: "session-clerk-user" }),
            }),
          ]),
        }),
      })
    );
  });

  it("does not return OAuth state rows as pending account selections", async () => {
    mockClient.metaOAuthSelection.findMany.mockResolvedValue([
      {
        id: "state-row",
        expiresAt: new Date("2026-09-01T12:10:00.000Z"),
        accounts: { kind: "META_OAUTH_STATE", stateHash: "state-hash" },
      },
      {
        id: "selection-row",
        expiresAt: new Date("2026-09-01T12:10:00.000Z"),
        accounts: [{ pageId: "page-1" }],
      },
    ]);

    await expect(getLatestMetaOAuthSelection("workspace-clerk-user")).resolves.toMatchObject({
      id: "selection-row",
    });
  });
});

describe("softDisconnectIntegrationForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.$transaction.mockImplementation(async (operation: any) => operation(mockClient));
    mockClient.$queryRaw = vi.fn(async () => []);
    mockClient.subscription = { findUnique: vi.fn(async () => ({ plan: "FREE" })) };
    mockClient.integrations.update.mockResolvedValue({ id: "current-integration" });
    mockClient.integrations.findUnique.mockResolvedValue(null);
    mockClient.automation.updateMany.mockResolvedValue({ count: 2 });
    mockClient.user.update = vi.fn().mockResolvedValue({
      firstname: "A",
      lastname: "User",
      clerkId: "clerk-user-1",
    });
  });

  it("soft-disconnects only the current user's canonical Instagram integration and preserves history", async () => {
    mockClient.user.findUnique.mockResolvedValue({
      id: "user-1",
      integrations: [
        {
          id: "stale-disconnected",
          name: "INSTAGRAM",
          instagramId: "ig-old",
          pageId: "page-old",
          status: "DISCONNECTED",
          reconnectRequired: false,
          token: "old-token",
        },
        {
          id: "current-integration",
          name: "INSTAGRAM",
          instagramId: "ig-current",
          pageId: "page-current",
          status: "CONNECTED",
          reconnectRequired: false,
          token: "current-token",
        },
        {
          id: "other-provider",
          name: "STRIPE",
          instagramId: "ig-other",
          pageId: "page-other",
          status: "CONNECTED",
          reconnectRequired: false,
          token: "other-token",
        },
      ],
    });

    const result = await softDisconnectIntegrationForUser("clerk-user-1");

    expect(result).toEqual({ id: "current-integration", pausedCampaigns: 2 });
    expect(mockClient.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { clerkId: "clerk-user-1" },
    }));
    expect(mockClient.integrations.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "current-integration" },
      data: expect.objectContaining({
        status: "DISCONNECTED",
        disconnectedReason: "User disconnected Instagram from AP3K",
      }),
    }));
    expect(mockClient.automation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user-1", integrationId: "current-integration", archivedAt: null, active: true },
      data: expect.objectContaining({
        active: false,
        needsReview: true,
      }),
    }));
    expect(mockClient.integrations.delete).not.toHaveBeenCalled();
  });

  it("does not disconnect stale rows when no canonical connected integration exists", async () => {
    mockClient.user.findUnique.mockResolvedValue({
      id: "user-1",
      integrations: [
        {
          id: "soft-disconnected",
          name: "INSTAGRAM",
          instagramId: "ig-old",
          pageId: "page-old",
          status: "DISCONNECTED",
          reconnectRequired: false,
          token: "old-token",
        },
        {
          id: "missing-token",
          name: "INSTAGRAM",
          instagramId: "ig-current",
          pageId: "page-current",
          status: "CONNECTED",
          reconnectRequired: false,
          token: null,
        },
      ],
    });

    await expect(softDisconnectIntegrationForUser("clerk-user-1")).resolves.toBeNull();
    expect(mockClient.integrations.update).not.toHaveBeenCalled();
    expect(mockClient.automation.updateMany).not.toHaveBeenCalled();
  });

  it("preserves existing metaAppScopedUserId when reconnect lookup returns null", async () => {
    await updateIntegration(
      "x".repeat(24),
      new Date("2026-01-01"),
      "integration-1",
      "ig-1",
      undefined,
      undefined,
      "page-1",
      undefined,
      "business-1",
      null
    );

    expect(mockClient.integrations.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ metaAppScopedUserId: expect.anything() }),
    }));
  });

  it("preserves existing metaAppScopedUserId when reconnect lookup returns undefined", async () => {
    await updateIntegration(
      "x".repeat(24),
      new Date("2026-01-01"),
      "integration-1",
      "ig-1",
      undefined,
      undefined,
      "page-1",
      undefined,
      "business-1",
      undefined
    );

    expect(mockClient.integrations.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ metaAppScopedUserId: expect.anything() }),
    }));
  });

  it("preserves existing metaAppScopedUserId when reconnect lookup returns an empty string", async () => {
    await updateIntegration(
      "x".repeat(24),
      new Date("2026-01-01"),
      "integration-1",
      "ig-1",
      undefined,
      undefined,
      "page-1",
      undefined,
      "business-1",
      "   "
    );

    expect(mockClient.integrations.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ metaAppScopedUserId: expect.anything() }),
    }));
  });

  it("persists a valid new app-scoped user ID", async () => {
    await updateIntegration(
      "x".repeat(24),
      new Date("2026-01-01"),
      "integration-1",
      "ig-1",
      undefined,
      undefined,
      "page-1",
      undefined,
      "business-1",
      "  app-user-new  "
    );

    expect(mockClient.integrations.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ metaAppScopedUserId: "app-user-new" }),
    }));
  });

});


describe("multi-account OAuth persistence", () => {
  let user: any;
  let tx: any;
  const token = "instagram-token-that-is-long-enough";
  const expiry = new Date("2030-01-01");
  beforeEach(() => {
    vi.clearAllMocks();
    user = { id: "user-1", clerkId: "clerk-1", subscription: { plan: "PRO" }, integrations: [{ id: "account-a", name: "INSTAGRAM", instagramId: "ig-a", status: "CONNECTED" }] };
    tx = {
      $queryRaw: vi.fn(async () => [{ id: user.id }]),
      user: { findUniqueOrThrow: vi.fn(async () => user) },
      integrations: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async ({ data }) => ({ id: "account-b", ...data })),
        update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data })),
      },
      automation: { updateMany: vi.fn() },
    };
    mockClient.$transaction.mockImplementation(async (callback: any) => callback(tx));
  });

  it("adds a distinct account without replacing or pausing the first account", async () => {
    const result = await createIntegration("clerk-1", token, expiry, "ig-b");
    expect(result.integrationId).toBe("account-b");
    expect(tx.integrations.create).toHaveBeenCalledWith({ data: expect.objectContaining({ instagramId: "ig-b", userId: "user-1" }) });
    expect(tx.integrations.update).not.toHaveBeenCalled();
    expect(tx.automation.updateMany).not.toHaveBeenCalled();
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
  });

  it("refreshes the same immutable Instagram ID without consuming another slot", async () => {
    user.subscription.plan = "FREE";
    await createIntegration("clerk-1", token, expiry, "ig-a", "new_username");
    expect(tx.integrations.update).toHaveBeenCalledWith({ where: { id: "account-a" }, data: expect.objectContaining({ instagramUsername: "new_username" }) });
    expect(tx.integrations.create).not.toHaveBeenCalled();
  });

  it.each([["FREE", 1], ["PRO", 3], ["BUSINESS", 10]])("enforces %s account capacity inside the serialized transaction", async (plan, limit) => {
    user.subscription.plan = plan;
    user.integrations = Array.from({ length: limit as number }, (_, i) => ({ id: `account-${i}`, instagramId: `ig-${i}`, name: "INSTAGRAM", status: "CONNECTED" }));
    await expect(createIntegration("clerk-1", token, expiry, "ig-new")).rejects.toMatchObject({ code: "PLAN_LIMIT_REACHED" });
    expect(tx.integrations.create).not.toHaveBeenCalled();
    expect(tx.integrations.update).not.toHaveBeenCalled();
  });

  it("never claims another customer's Instagram connection", async () => {
    tx.integrations.findUnique.mockResolvedValue({ userId: "other-user" });
    await expect(createIntegration("clerk-1", token, expiry, "ig-b")).rejects.toMatchObject({ code: "DUPLICATE_INSTAGRAM_ACCOUNT" });
    expect(tx.integrations.create).not.toHaveBeenCalled();
  });

  it("allows reconnecting a disconnected account only when a slot is available", async () => {
    user.subscription.plan = "FREE";
    user.integrations.push({ id: "account-b", instagramId: "ig-b", name: "INSTAGRAM", status: "DISCONNECTED" });
    await expect(createIntegration("clerk-1", token, expiry, "ig-b")).rejects.toMatchObject({ code: "PLAN_LIMIT_REACHED" });
    user.integrations[0].status = "DISCONNECTED";
    await expect(createIntegration("clerk-1", token, expiry, "ig-b")).resolves.toMatchObject({ integrationId: "account-b" });
  });

  it("does not use usernames to merge two Instagram identities", async () => {
    user.integrations[0].instagramUsername = "reused_name";
    await createIntegration("clerk-1", token, expiry, "ig-b", "reused_name");
    expect(tx.integrations.create).toHaveBeenCalledOnce();
    expect(tx.integrations.update).not.toHaveBeenCalled();
  });
});
