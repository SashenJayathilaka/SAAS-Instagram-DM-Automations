import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindSnapshotFirst = vi.fn();
const mockCreateSnapshot = vi.fn();
const mockFindIntegrationFirst = vi.fn();
const mockUpdateIntegration = vi.fn();
const mockPauseAutomations = vi.fn();
const mockGetInstagramBusinessProfile = vi.fn();

vi.mock("@/lib/prisma", () => ({
  client: {
    instagramAccountSnapshot: {
      findFirst: (...args: any[]) => mockFindSnapshotFirst(...args),
      create: (...args: any[]) => mockCreateSnapshot(...args),
    },
    integrations: {
      findFirst: (...args: any[]) => mockFindIntegrationFirst(...args),
      update: (...args: any[]) => mockUpdateIntegration(...args),
    },
    automation: {
      updateMany: (...args: any[]) => mockPauseAutomations(...args),
    },
  },
}));

vi.mock("@/lib/fetch", () => ({
  getInstagramBusinessProfile: (...args: any[]) => mockGetInstagramBusinessProfile(...args),
  getSafeMetaError: (error: any) => error?.safe ?? { message: error?.message ?? String(error) },
  META_GRAPH_VERSION: "v25.0",
}));

import {
  getInstagramSnapshotComparison,
  getInstagramSnapshotComparisonWithRefresh,
  getInstagramSnapshotComparisonWithMissingRefresh,
  getInstagramSnapshotComparisonForUser,
  getLatestInstagramSnapshot,
  getProfileSnapshotDisplay,
  getProfileSnapshotStatus,
  refreshInstagramProfileSnapshotForUser,
} from "@/lib/instagram-profile-snapshot";

const now = new Date("2026-05-24T12:00:00Z");

function snapshot(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? "snap-1",
    integrationId: overrides.integrationId ?? "integration-a",
    instagramId: overrides.instagramId ?? "ig-1",
    username: overrides.username ?? "ap3k",
    profilePictureUrl: overrides.profilePictureUrl ?? "https://example.com/avatar.jpg",
    followersCount: Object.prototype.hasOwnProperty.call(overrides, "followersCount") ? overrides.followersCount : 100,
    mediaCount: Object.prototype.hasOwnProperty.call(overrides, "mediaCount") ? overrides.mediaCount : 10,
    accountType: overrides.accountType ?? "BUSINESS",
    source: "meta_graph",
    fetchedAt: overrides.fetchedAt ?? now,
    createdAt: overrides.createdAt ?? now,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("instagram profile snapshots", () => {
  it("latest snapshot returns newest by fetchedAt", async () => {
    mockFindSnapshotFirst.mockResolvedValue(snapshot({ id: "newest" }));

    const latest = await getLatestInstagramSnapshot("integration-a");

    expect(latest?.id).toBe("newest");
    expect(mockFindSnapshotFirst).toHaveBeenCalledWith({
      where: { integrationId: "integration-a" },
      orderBy: { fetchedAt: "desc" },
    });
  });

  it("follower comparison calculates absolute and percent growth", async () => {
    mockFindSnapshotFirst
      .mockResolvedValueOnce(snapshot({ followersCount: 150 }))
      .mockResolvedValueOnce(snapshot({ followersCount: 100 }));

    const result = await getInstagramSnapshotComparison("integration-a", "7d", now);

    expect(result.followerChange).toBe(50);
    expect(result.followerChangePercent).toBe(50);
    expect(result.change).toEqual({ value: 50, label: "+50%", tone: "positive" });
  });

  it("no previous snapshot returns neutral change", async () => {
    mockFindSnapshotFirst
      .mockResolvedValueOnce(snapshot({ followersCount: 150 }))
      .mockResolvedValueOnce(null);

    const result = await getInstagramSnapshotComparison("integration-a", "7d", now);

    expect(result.followerChange).toBeNull();
    expect(result.change).toEqual({ value: null, label: "—", tone: "neutral" });
  });

  it("tenant scoped comparison refuses cross-user integration", async () => {
    mockFindIntegrationFirst.mockResolvedValue(null);

    const result = await getInstagramSnapshotComparisonForUser("user-a", "integration-b", "month", now);

    expect(result).toBeNull();
    expect(mockFindIntegrationFirst).toHaveBeenCalledWith({
      where: { id: "integration-b", userId: "user-a" },
      select: { id: true },
    });
  });

  it("refresh helper returns cached snapshot when fresh", async () => {
    const fresh = snapshot({ fetchedAt: new Date("2026-05-24T10:00:00Z") });
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: "ig-1",
      instagramUsername: "olduser",
      profilePictureUrl: null,
      snapshots: [fresh],
    });

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(result.cached).toBe(true);
    expect(result.data?.followersCount).toBe(100);
    expect(mockGetInstagramBusinessProfile).not.toHaveBeenCalled();
  });

  it("refresh helper fetches and stores profile stats when stale", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: "ig-1",
      instagramUsername: "olduser",
      profilePictureUrl: null,
      snapshots: [snapshot({ fetchedAt: new Date("2026-05-23T00:00:00Z") })],
    });
    mockGetInstagramBusinessProfile.mockResolvedValue({
      data: {
        id: "ig-1",
        username: "realuser",
        profile_picture_url: "https://example.com/real.jpg",
        followers_count: 120,
        media_count: 14,
      },
    });
    mockCreateSnapshot.mockImplementation(async ({ data }) => snapshot({ ...data, id: "snap-new", createdAt: now }));
    mockUpdateIntegration.mockResolvedValue({});

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(mockGetInstagramBusinessProfile).toHaveBeenCalledWith(
      "ig-1",
      "page-token-secret",
      "id,username,profile_picture_url,followers_count,media_count"
    );
    expect(mockCreateSnapshot).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: "realuser",
        profilePictureUrl: "https://example.com/real.jpg",
        followersCount: 120,
        mediaCount: 14,
        accountType: null,
      }),
    });
    expect(JSON.stringify(result)).not.toContain("page-token-secret");
    expect(result.cached).toBe(false);
    expect(getProfileSnapshotStatus(snapshot({ followersCount: 120, mediaCount: 14 }), now)).toEqual({ label: "Fresh", ok: true });
  });

  it("refresh helper handles Meta permission errors safely", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: "ig-1",
      instagramUsername: "olduser",
      profilePictureUrl: null,
      snapshots: [],
    });
    mockGetInstagramBusinessProfile.mockRejectedValue({
      safe: { status: 400, code: 10, message: "Permissions error" },
    });

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(result.error).toBe("Meta did not return follower/post fields. Reconnect Instagram or check account permissions.");
    expect(result.diagnostics?.attempts).toHaveLength(3);
    expect(JSON.stringify(result)).not.toContain("page-token-secret");
  });

  it("refresh helper returns reconnect message and pauses automations when token is expired", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-05-01T00:00:00Z"),
      instagramId: "ig-1",
      instagramUsername: "olduser",
      profilePictureUrl: null,
      snapshots: [],
    });
    mockUpdateIntegration.mockResolvedValue({});
    mockPauseAutomations.mockResolvedValue({ count: 2 });

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(result.status).toBe(401);
    expect(result.error).toBe("Reconnect Instagram to refresh profile stats.");
    expect(mockUpdateIntegration).toHaveBeenCalledWith({
      where: { id: "integration-a" },
      data: expect.objectContaining({
        reconnectRequired: true,
        oauthLastError: "instagram_token_expired",
        oauthLastErrorSource: "profile_snapshot",
      }),
    });
    expect(mockPauseAutomations).toHaveBeenCalledWith({
      where: { integrationId: "integration-a", active: true, archivedAt: null },
      data: expect.objectContaining({
        active: false,
        needsReview: true,
      }),
    });
    expect(JSON.stringify(result)).not.toContain("page-token-secret");
  });

  it("marks the integration for reconnect when Meta invalidates the token", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: "ig-1",
      instagramUsername: "olduser",
      profilePictureUrl: null,
      oauthResolutionDiagnostics: null,
      snapshots: [],
    });
    mockGetInstagramBusinessProfile.mockRejectedValue({
      safe: {
        status: 400,
        code: 190,
        message: "Error validating access token",
        type: "OAuthException",
      },
    });
    mockUpdateIntegration.mockResolvedValue({});
    mockPauseAutomations.mockResolvedValue({ count: 1 });

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(result.error).toBe("Reconnect Instagram to refresh profile stats.");
    expect(mockUpdateIntegration).toHaveBeenCalledWith({
      where: { id: "integration-a" },
      data: expect.objectContaining({
        reconnectRequired: true,
        oauthLastError: "instagram_token_invalidated",
        oauthLastErrorSource: "profile_snapshot",
      }),
    });
    expect(mockPauseAutomations).toHaveBeenCalledWith({
      where: { integrationId: "integration-a", active: true, archivedAt: null },
      data: expect.objectContaining({
        active: false,
        needsReview: true,
      }),
    });
  });

  it("refresh helper saves partial snapshot when followers missing but username present", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: "ig-1",
      instagramUsername: "olduser",
      profilePictureUrl: null,
      snapshots: [snapshot({ fetchedAt: new Date("2026-05-23T00:00:00Z") })],
    });
    mockGetInstagramBusinessProfile.mockResolvedValue({
      data: {
        id: "ig-1",
        username: "partialuser",
        profile_picture_url: "https://example.com/partial.jpg",
      },
    });
    mockCreateSnapshot.mockImplementation(async ({ data }) =>
      snapshot({ ...data, id: "snap-partial", followersCount: null, mediaCount: null, createdAt: now })
    );
    mockUpdateIntegration.mockResolvedValue({});

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(mockCreateSnapshot).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: "partialuser",
        profilePictureUrl: "https://example.com/partial.jpg",
        followersCount: null,
        mediaCount: null,
      }),
    });
    expect(result.cached).toBe(false);
    expect(result.message).toBe("Instagram profile synced successfully. Follower count unavailable from Meta.");
    expect(JSON.stringify(result)).not.toContain("page-token-secret");
  });

  it("unsupported followers_count retries a smaller field set and stores partial media snapshot", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: "ig-1",
      instagramUsername: "olduser",
      profilePictureUrl: null,
      snapshots: [snapshot({ fetchedAt: new Date("2026-05-23T00:00:00Z") })],
      oauthResolutionDiagnostics: { oauth: "kept" },
    });
    mockGetInstagramBusinessProfile
      .mockRejectedValueOnce({
        safe: { status: 400, code: 100, message: "(#100) Tried accessing nonexisting field followers_count" },
      })
      .mockResolvedValueOnce({
        data: {
          id: "ig-1",
          username: "mediauser",
          profile_picture_url: "https://example.com/media.jpg",
          media_count: 9,
        },
      });
    mockCreateSnapshot.mockImplementation(async ({ data }) => snapshot({ ...data, id: "snap-media", followersCount: null, createdAt: now }));
    mockUpdateIntegration.mockResolvedValue({});

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(mockGetInstagramBusinessProfile).toHaveBeenNthCalledWith(
      1,
      "ig-1",
      "page-token-secret",
      "id,username,profile_picture_url,followers_count,media_count"
    );
    expect(mockGetInstagramBusinessProfile).toHaveBeenNthCalledWith(
      2,
      "ig-1",
      "page-token-secret",
      "id,username,profile_picture_url,media_count"
    );
    expect(result.data?.mediaCount).toBe(9);
    expect(result.data?.followersCount).toBeNull();
    expect(result.message).toBe("Instagram profile synced successfully. Follower count unavailable from Meta.");
    expect(result.diagnostics?.returnedFieldNames).toEqual(["id", "media_count", "profile_picture_url", "username"]);
    expect(mockUpdateIntegration).toHaveBeenCalledWith({
      where: { id: "integration-a" },
      data: expect.objectContaining({
        oauthResolutionDiagnostics: expect.objectContaining({
          oauth: "kept",
          profileSnapshotRefresh: expect.objectContaining({
            igIdUsed: "ig-1",
            tokenPresent: true,
            graphApiVersion: "v25.0",
            returnedFieldNames: ["id", "media_count", "profile_picture_url", "username"],
          }),
        }),
      }),
    });
    expect(JSON.stringify(result)).not.toContain("page-token-secret");
  });

  it("username and profile picture only still stores a partial snapshot", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: "ig-1",
      instagramUsername: "olduser",
      profilePictureUrl: null,
      snapshots: [snapshot({ fetchedAt: new Date("2026-05-23T00:00:00Z") })],
    });
    mockGetInstagramBusinessProfile
      .mockRejectedValueOnce({
        safe: { status: 400, code: 100, message: "(#100) followers_count is unsupported" },
      })
      .mockRejectedValueOnce({
        safe: { status: 400, code: 100, message: "(#100) media_count is unsupported" },
      })
      .mockResolvedValueOnce({
        data: {
          id: "ig-1",
          username: "basicuser",
          profile_picture_url: "https://example.com/basic.jpg",
        },
      });
    mockCreateSnapshot.mockImplementation(async ({ data }) =>
      snapshot({ ...data, id: "snap-basic", followersCount: null, mediaCount: null, createdAt: now })
    );
    mockUpdateIntegration.mockResolvedValue({});

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(mockGetInstagramBusinessProfile).toHaveBeenNthCalledWith(
      3,
      "ig-1",
      "page-token-secret",
      "id,username,profile_picture_url"
    );
    expect(result.data?.username).toBe("basicuser");
    expect(result.data?.profilePictureUrl).toBe("https://example.com/basic.jpg");
    expect(result.data?.followersCount).toBeNull();
    expect(result.data?.mediaCount).toBeNull();
    expect(result.message).toBe("Instagram profile synced successfully. Follower count unavailable from Meta.");
    expect(JSON.stringify(result)).not.toContain("page-token-secret");
  });

  it("account_type unsupported error does not fail fallback profile-only storage", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: "17841456116770575",
      instagramUsername: null,
      profilePictureUrl: null,
      snapshots: [],
    });
    mockGetInstagramBusinessProfile
      .mockRejectedValueOnce({
        safe: { status: 400, code: 100, message: "(#100) Tried accessing nonexisting field (account_type)" },
      })
      .mockRejectedValueOnce({
        safe: { status: 400, code: 100, message: "(#100) media_count is unsupported" },
      })
      .mockResolvedValueOnce({
        data: {
          id: "17841456116770575",
          username: "maglobalmarketing",
          profile_picture_url: "https://example.com/maglobal.jpg",
        },
      });
    mockCreateSnapshot.mockImplementation(async ({ data }) =>
      snapshot({ ...data, id: "snap-maglobal", followersCount: null, mediaCount: null, accountType: null, createdAt: now })
    );
    mockUpdateIntegration.mockResolvedValue({});

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(mockCreateSnapshot).toHaveBeenCalledWith({
      data: expect.objectContaining({
        instagramId: "17841456116770575",
        username: "maglobalmarketing",
        profilePictureUrl: "https://example.com/maglobal.jpg",
        followersCount: null,
        mediaCount: null,
        accountType: null,
      }),
    });
    expect(result.data?.username).toBe("maglobalmarketing");
    expect(result.data?.profilePictureUrl).toBe("https://example.com/maglobal.jpg");
    expect(result.diagnostics?.attempts.map((attempt) => attempt.requestedFields.join(","))).toEqual([
      "id,username,profile_picture_url,followers_count,media_count",
      "id,username,profile_picture_url,media_count",
      "id,username,profile_picture_url",
    ]);
    expect(result.diagnostics?.returnedFieldNames).toEqual(["id", "profile_picture_url", "username"]);
    expect(JSON.stringify(result)).not.toContain("page-token-secret");
  });

  it("safe diagnostics include returned field names only", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: "ig-1",
      instagramUsername: "olduser",
      profilePictureUrl: null,
      snapshots: [snapshot({ fetchedAt: new Date("2026-05-23T00:00:00Z") })],
    });
    mockGetInstagramBusinessProfile.mockResolvedValue({
      data: {
        id: "ig-1",
        username: "realuser",
        profile_picture_url: "https://example.com/real.jpg",
        access_token: "should-not-be-in-diagnostics",
      },
    });
    mockCreateSnapshot.mockImplementation(async ({ data }) =>
      snapshot({ ...data, id: "snap-safe", followersCount: null, mediaCount: null, createdAt: now })
    );
    mockUpdateIntegration.mockResolvedValue({});

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(result.diagnostics?.returnedFieldNames).toEqual(["id", "profile_picture_url", "username"]);
    expect(JSON.stringify(result.diagnostics)).not.toContain("realuser");
    expect(JSON.stringify(result.diagnostics)).not.toContain("should-not-be-in-diagnostics");
    expect(JSON.stringify(result)).not.toContain("page-token-secret");
  });

  it("missing snapshot triggers one safe refresh attempt and returns the refreshed snapshot", async () => {
    mockFindIntegrationFirst
      .mockResolvedValueOnce({ id: "integration-a" })
      .mockResolvedValueOnce({
        id: "integration-a",
        token: "page-token-secret",
        expiresAt: new Date("2026-06-01T00:00:00Z"),
        instagramId: "ig-1",
        instagramUsername: "olduser",
        profilePictureUrl: null,
        snapshots: [],
      })
      .mockResolvedValueOnce({ id: "integration-a" });
    mockFindSnapshotFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(snapshot({ id: "snap-new", followersCount: 444, mediaCount: 12 }))
      .mockResolvedValueOnce(null);
    mockGetInstagramBusinessProfile.mockResolvedValue({
      data: { id: "ig-1", username: "realuser", followers_count: 444, media_count: 12 },
    });
    mockCreateSnapshot.mockImplementation(async ({ data }) => snapshot({ ...data, id: "snap-new", createdAt: now }));
    mockUpdateIntegration.mockResolvedValue({});

    const result = await getInstagramSnapshotComparisonWithMissingRefresh("clerk-a", "user-a", "integration-a", "month", now);

    expect(mockGetInstagramBusinessProfile).toHaveBeenCalledTimes(1);
    expect(result.refresh?.cached).toBe(false);
    expect(result.comparison?.current?.followersCount).toBe(444);
    expect(JSON.stringify(result)).not.toContain("page-token-secret");
  });

  it("stale snapshot triggers one safe refresh attempt and preserves old data if refresh fails", async () => {
    const staleSnapshot = snapshot({
      id: "snap-stale",
      fetchedAt: new Date("2026-05-23T00:00:00Z"),
      followersCount: 300,
      mediaCount: 8,
      profilePictureUrl: "https://example.com/old.jpg",
    });
    mockFindIntegrationFirst
      .mockResolvedValueOnce({ id: "integration-a" })
      .mockResolvedValueOnce({
        id: "integration-a",
        token: "page-token-secret",
        expiresAt: new Date("2026-06-01T00:00:00Z"),
        instagramId: "ig-1",
        instagramUsername: "olduser",
        profilePictureUrl: "https://example.com/old.jpg",
        oauthResolutionDiagnostics: null,
        snapshots: [staleSnapshot],
      })
      .mockResolvedValueOnce({ id: "integration-a" });
    mockFindSnapshotFirst
      .mockResolvedValueOnce(staleSnapshot)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(staleSnapshot)
      .mockResolvedValueOnce(null);
    mockGetInstagramBusinessProfile.mockRejectedValue(new Error("Meta unavailable"));

    const result = await getInstagramSnapshotComparisonWithRefresh("clerk-a", "user-a", "integration-a", "month", now);

    expect(mockGetInstagramBusinessProfile).toHaveBeenCalledTimes(1);
    expect(result.refresh?.cached).toBe(true);
    expect(result.refresh?.error).toBe("Instagram profile stats unavailable.");
    expect(result.comparison?.current?.followersCount).toBe(300);
    expect(result.comparison?.current?.mediaCount).toBe(8);
    expect(result.comparison?.current?.profilePictureUrl).toBe("https://example.com/old.jpg");
  });

  it("returns cached dashboard metrics while a refresh is still pending", async () => {
    const old = snapshot({ fetchedAt: new Date("2026-05-23T00:00:00Z") });
    let finish!: (value: null) => void;
    mockFindIntegrationFirst
      .mockResolvedValueOnce({ id: "integration-a" })
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    mockFindSnapshotFirst.mockResolvedValueOnce(old).mockResolvedValueOnce(null);
    const defer = vi.fn();
    const result = await getInstagramSnapshotComparisonWithRefresh("clerk-a", "user-a", "integration-a", "month", now, defer);
    expect(result.comparison?.current).toEqual(old);
    expect(result.refresh).toBeNull();
    expect(defer).toHaveBeenCalledTimes(1);
    finish(null);
    await defer.mock.calls[0][0];
  });

  it("fresh snapshot does not trigger an automatic refresh", async () => {
    const freshSnapshot = snapshot({ fetchedAt: now });
    mockFindIntegrationFirst.mockResolvedValueOnce({ id: "integration-a" });
    mockFindSnapshotFirst
      .mockResolvedValueOnce(freshSnapshot)
      .mockResolvedValueOnce(null);

    const result = await getInstagramSnapshotComparisonWithRefresh("clerk-a", "user-a", "integration-a", "month", now);

    expect(mockGetInstagramBusinessProfile).not.toHaveBeenCalled();
    expect(result.refresh).toBeNull();
    expect(result.comparison?.current?.id).toBe(freshSnapshot.id);
  });

  it("refresh helper uses instagramId field, not pageId", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: "correct-ig-id",
      instagramUsername: "olduser",
      profilePictureUrl: null,
      snapshots: [snapshot({ fetchedAt: new Date("2026-05-23T00:00:00Z") })],
    });
    mockGetInstagramBusinessProfile.mockResolvedValue({
      data: { id: "correct-ig-id", username: "realuser", followers_count: 100, media_count: 5 },
    });
    mockCreateSnapshot.mockImplementation(async ({ data }) => snapshot({ ...data, id: "snap-new", createdAt: now }));
    mockUpdateIntegration.mockResolvedValue({});

    await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(mockGetInstagramBusinessProfile).toHaveBeenCalledWith(
      "correct-ig-id",
      "page-token-secret",
      "id,username,profile_picture_url,followers_count,media_count"
    );
  });

  it("refresh helper returns missing-id error if instagramId absent", async () => {
    mockFindIntegrationFirst.mockResolvedValue({
      id: "integration-a",
      token: "page-token-secret",
      expiresAt: new Date("2026-06-01T00:00:00Z"),
      instagramId: null,
      instagramUsername: null,
      profilePictureUrl: null,
      snapshots: [],
    });

    const result = await refreshInstagramProfileSnapshotForUser("clerk-a", "integration-a", { now });

    expect(result.status).toBe(404);
    expect(result.error).toBe("Connect Instagram to enable profile stats.");
    expect(mockGetInstagramBusinessProfile).not.toHaveBeenCalled();
  });

  it("getProfileSnapshotStatus returns Missing when no snapshot", () => {
    expect(getProfileSnapshotStatus(null)).toEqual({ label: "Missing", ok: false });
    expect(getProfileSnapshotStatus(undefined)).toEqual({ label: "Missing", ok: false });
  });

  it("getProfileSnapshotStatus returns Partial when snapshot has no followers or media", () => {
    const partial = { fetchedAt: now, followersCount: null, mediaCount: null };
    expect(getProfileSnapshotStatus(partial, now)).toEqual({ label: "Partial", ok: false });
  });

  it("getProfileSnapshotStatus returns Partial when followers are missing", () => {
    const partial = { fetchedAt: now, followersCount: null, mediaCount: 5 };
    expect(getProfileSnapshotStatus(partial, now)).toEqual({ label: "Partial", ok: false });
  });

  it("getProfileSnapshotStatus returns Fresh when snapshot has followers and is recent", () => {
    const fresh = { fetchedAt: now, followersCount: 1000, mediaCount: 20 };
    expect(getProfileSnapshotStatus(fresh, now)).toEqual({ label: "Fresh", ok: true });
  });

  it("getProfileSnapshotStatus returns Stale when snapshot has followers but is old", () => {
    const old = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    const stale = { fetchedAt: old, followersCount: 1000, mediaCount: 20 };
    expect(getProfileSnapshotStatus(stale, now)).toEqual({ label: "Stale", ok: false });
  });

  it("profile snapshot display separates Partial from Failed", () => {
    expect(getProfileSnapshotDisplay({ fetchedAt: now, followersCount: null, mediaCount: null }, null, now)).toEqual({
      label: "Partial",
      ok: false,
    });
    expect(getProfileSnapshotDisplay(null, { error: "Instagram profile stats unavailable." }, now)).toEqual({
      label: "Failed",
      ok: false,
    });
  });

  it("latest snapshot query returns partial snapshot without followers", async () => {
    const partial = {
      id: "snap-partial",
      integrationId: "integration-a",
      instagramId: "ig-1",
      username: "ap3k",
      profilePictureUrl: "https://example.com/avatar.jpg",
      followersCount: null,
      mediaCount: null,
      accountType: "BUSINESS",
      source: "meta_graph",
      fetchedAt: now,
      createdAt: now,
    };
    mockFindSnapshotFirst.mockResolvedValue(partial);

    const result = await getLatestInstagramSnapshot("integration-a");

    expect(result?.followersCount).toBeNull();
    expect(result?.username).toBe("ap3k");
  });
});
