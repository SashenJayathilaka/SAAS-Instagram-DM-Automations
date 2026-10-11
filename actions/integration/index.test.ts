vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: vi.fn(async () => "integration-1") }));
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCurrentUser = vi.fn();
const mockGenerateToken = vi.fn();
const mockGetIntegrations = vi.fn();
const mockGetRecentFacebookPagePosts = vi.fn();
const mockSoftDisconnectIntegrationForUser = vi.fn();
const mockRevalidatePath = vi.fn();
const mockGetCurrentWorkspaceClerkId = vi.fn();
const mockCreateMetaOAuthState = vi.fn();
const mockConsumeMetaOAuthState = vi.fn();
const mockRecordIntegrationOAuthError = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: (...args: any[]) => mockCurrentUser(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/fetch", () => ({
  formatSafeMetaError: vi.fn(),
  generateToken: (...args: any[]) => mockGenerateToken(...args),
  debugPageToken: vi.fn(),
  getEligibleFacebookInstagramAccounts: vi.fn(),
  getRecentFacebookPagePosts: (...args: any[]) => mockGetRecentFacebookPagePosts(...args),
  getSafeMetaError: vi.fn(() => ({})),
  subscribeInstagramWebhooks: vi.fn(),
}));

vi.mock("@/lib/instagram-profile-snapshot", () => ({
  refreshInstagramProfileSnapshotForUser: vi.fn(),
}));

vi.mock("@/actions/user", () => ({
  getCurrentWorkspaceClerkId: (...args: any[]) =>
    mockGetCurrentWorkspaceClerkId(...args),
}));

vi.mock("@/lib/account-webhook-diagnostics", () => ({
  planReconnectCleanup: vi.fn(),
}));

vi.mock("@/lib/campaign-health", () => ({
  planReconnectCampaignImpact: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  client: {},
}));

vi.mock("./queries", () => ({
  createIntegration: vi.fn(),
  createMetaOAuthSelection: vi.fn(),
  createMetaOAuthState: (...args: any[]) => mockCreateMetaOAuthState(...args),
  consumeMetaOAuthState: (...args: any[]) => mockConsumeMetaOAuthState(...args),
  deleteMetaOAuthSelection: vi.fn(),
  getLatestMetaOAuthSelection: vi.fn(),
  getIntegrations: (...args: any[]) => mockGetIntegrations(...args),
  getWebhookHealthForUser: vi.fn(),
  recordIntegrationOAuthError: (...args: any[]) => mockRecordIntegrationOAuthError(...args),
  softDisconnectIntegrationForUser: (...args: any[]) => mockSoftDisconnectIntegrationForUser(...args),
  updateIntegration: vi.fn(),
}));

import {
  disconnectCurrentInstagramIntegration,
  getInstagramConnectUrl,
  getRecentSelectedFacebookPageContent,
  onIntegrate,
} from "./index";
import { hashMetaOAuthState } from "@/lib/meta-oauth-state";

describe("disconnectCurrentInstagramIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockResolvedValue({ id: "clerk-user-1" });
    mockGetCurrentWorkspaceClerkId.mockResolvedValue("clerk-user-1");
    mockSoftDisconnectIntegrationForUser.mockResolvedValue({ id: "integration-1", pausedCampaigns: 1 });
  });

  it("returns success and revalidates dashboard, account, integrations, automation, and onboarding paths", async () => {
    await expect(disconnectCurrentInstagramIntegration()).resolves.toEqual({
      status: 200,
      data: "Instagram account disconnected",
    });

    expect(mockSoftDisconnectIntegrationForUser).toHaveBeenCalledWith("clerk-user-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/clerk-user-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/clerk-user-1/account");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/clerk-user-1/integrations");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/clerk-user-1/automation");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/clerk-user-1/automation", "layout");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/onboarding/connect");
  });

  it("does not revalidate when no usable Instagram integration is connected", async () => {
    mockSoftDisconnectIntegrationForUser.mockResolvedValue(null);

    await expect(disconnectCurrentInstagramIntegration()).resolves.toEqual({
      status: 404,
      data: "No Instagram account connected",
    });

    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("Instagram OAuth state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INSTAGRAM_LOGIN_ENABLED = "false";
    process.env.META_APP_ID = "meta-app-id";
    process.env.META_REDIRECT_URI = "https://ap3k.test/callback/instagram";
    mockCurrentUser.mockResolvedValue({
      id: "session-clerk-user",
      firstName: "A",
      lastName: "User",
    });
    mockGetCurrentWorkspaceClerkId.mockResolvedValue("workspace-clerk-user");
    mockCreateMetaOAuthState.mockResolvedValue({ id: "state-row" });
    mockConsumeMetaOAuthState.mockResolvedValue(false);
  });

  it("creates a single-use state and appends it to the Meta authorization URL", async () => {
    const result = await getInstagramConnectUrl();

    expect(result.status).toBe(200);
    const state = new URL(result.url!).searchParams.get("state");
    expect(state).toMatch(/^[A-Za-z0-9_-]{32,128}$/);
    expect(mockCreateMetaOAuthState).toHaveBeenCalledWith(
      "workspace-clerk-user",
      "session-clerk-user",
      hashMetaOAuthState(state!),
      expect.any(Date)
    );
  });

  it("rejects callbacks without state before exchanging the code", async () => {
    const result = await onIntegrate("oauth-code", undefined);

    expect(result).toMatchObject({
      status: 401,
      error: "oauth_state_missing_or_invalid",
    });
    expect(mockConsumeMetaOAuthState).not.toHaveBeenCalled();
    expect(mockGenerateToken).not.toHaveBeenCalled();
    expect(mockRecordIntegrationOAuthError).toHaveBeenCalledWith(
      "workspace-clerk-user",
      "oauth_state_missing_or_invalid",
      "facebook_business_oauth"
    );
  });

  it("rejects replayed or foreign state before exchanging the code", async () => {
    const state = "validOAuthStateValue_12345678901234567890";

    const result = await onIntegrate("oauth-code", state);

    expect(result).toMatchObject({
      status: 401,
      error: "oauth_state_invalid_or_expired",
    });
    expect(mockConsumeMetaOAuthState).toHaveBeenCalledWith(
      "workspace-clerk-user",
      "session-clerk-user",
      hashMetaOAuthState(state)
    );
    expect(mockGenerateToken).not.toHaveBeenCalled();
  });
});

describe("getRecentSelectedFacebookPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockResolvedValue({ id: "clerk-user-1" });
    mockGetCurrentWorkspaceClerkId.mockResolvedValue("clerk-user-1");
    mockGetIntegrations.mockResolvedValue({
      integrations: [
        {
          id: "integration-1",
          name: "INSTAGRAM",
          status: "CONNECTED",
          reconnectRequired: false,
          token: "page-access-token-that-is-long-enough",
          pageId: "page-123",
          pageName: "AP3K Test Page",
          instagramId: "ig-456",
          instagramUsername: "ap3k_test",
          createdAt: new Date("2026-06-25T10:00:00Z"),
        },
      ],
    });
    mockGetRecentFacebookPagePosts.mockResolvedValue([
      {
        id: "page-123_post-1",
        message: "A real Page post",
        createdTime: "2026-06-25T10:00:00+0000",
      },
    ]);
  });

  it("uses the stored Page token server-side and returns only Page identity and post fields", async () => {
    const result = await getRecentSelectedFacebookPageContent();

    expect(mockGetRecentFacebookPagePosts).toHaveBeenCalledWith(
      "page-123",
      "page-access-token-that-is-long-enough"
    );
    expect(result).toEqual({
      status: 200,
      data: {
        pageId: "page-123",
        pageName: "AP3K Test Page",
        posts: [
          {
            id: "page-123_post-1",
            message: "A real Page post",
            createdTime: "2026-06-25T10:00:00+0000",
          },
        ],
      },
      error: null,
    });
    expect(JSON.stringify(result)).not.toContain("page-access-token");
  });

  it("uses the claimed Preview workspace identity for integration reads", async () => {
    mockGetCurrentWorkspaceClerkId.mockResolvedValue(
      "existing-workspace-clerk-id"
    );

    await getRecentSelectedFacebookPageContent();

    expect(mockGetIntegrations).toHaveBeenCalledWith(
      "existing-workspace-clerk-id"
    );
  });
});
