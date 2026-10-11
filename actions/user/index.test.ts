import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCurrentUser = vi.fn();
const mockFindUser = vi.fn();
const mockFindUserByEmail = vi.fn();
const mockCreateUser = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: (...args: unknown[]) => mockCurrentUser(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: () => ({ set: vi.fn() }),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: vi.fn(),
      },
    },
  },
}));

vi.mock("./queries", () => ({
  findUser: (...args: unknown[]) => mockFindUser(...args),
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updateSubscription: vi.fn(),
}));

import { ensureCurrentUserProfile } from "./index";

const RAW_TOKEN = "EAAB-preview-profile-claim-secret-token";
const CURRENT_CLERK_ID = "user_preview_clerk_id";
const EXISTING_CLERK_ID = "user_existing_workspace_id";
const EMAIL = "boudofski@gmail.com";

function clerkUser() {
  return {
    id: CURRENT_CLERK_ID,
    firstName: "Abdou",
    lastName: "Boudofski",
    primaryEmailAddress: { emailAddress: EMAIL },
    emailAddresses: [{ emailAddress: EMAIL }],
  };
}

function workspaceProfile(clerkId = EXISTING_CLERK_ID) {
  return {
    id: "workspace-user-id",
    clerkId,
    email: EMAIL,
    firstname: "Abdou",
    lastname: "Boudofski",
    subscription: { plan: "FREE" },
    integrations: [
      {
        id: "integration-1",
        token: RAW_TOKEN,
        expiresAt: null,
      },
    ],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("AP3K_DEV_ALLOW_EMAIL_PROFILE_CLAIM", "false");
  mockCurrentUser.mockResolvedValue(clerkUser());
  mockFindUserByEmail.mockResolvedValue(null);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("ensureCurrentUserProfile", () => {
  it("keeps the normal Clerk ID lookup path", async () => {
    const profile = workspaceProfile(CURRENT_CLERK_ID);
    mockFindUser.mockResolvedValue(profile);
    mockFindUserByEmail.mockResolvedValue(profile);

    const result = await ensureCurrentUserProfile();

    expect(mockFindUser).toHaveBeenCalledWith(CURRENT_CLERK_ID);
    expect(result).toEqual({
      status: 200,
      data: {
        firstname: "Abdou",
        lastname: "Boudofski",
        clerkId: CURRENT_CLERK_ID,
      },
      error: null,
    });
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(
      "[user-provision] AP3K profile resolution",
      expect.objectContaining({
        currentClerkUserIdPresent: true,
        primaryEmailPresent: true,
        userExistsByClerkId: true,
        userExistsByEmail: true,
      })
    );
  });

  it("claims the existing same-email profile only when the dev flag is enabled", async () => {
    vi.stubEnv("AP3K_DEV_ALLOW_EMAIL_PROFILE_CLAIM", "true");
    mockFindUser.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue(workspaceProfile());

    const result = await ensureCurrentUserProfile();

    expect(mockFindUserByEmail).toHaveBeenCalledWith(EMAIL);
    expect(result).toEqual({
      status: 200,
      data: {
        firstname: "Abdou",
        lastname: "Boudofski",
        clerkId: EXISTING_CLERK_ID,
      },
      error: null,
    });
    expect(mockCreateUser).not.toHaveBeenCalled();

    vi.stubEnv("AP3K_DEV_ALLOW_EMAIL_PROFILE_CLAIM", "false");
    const blocked = await ensureCurrentUserProfile();
    expect(blocked).toEqual({
      status: 409,
      data: null,
      error: "profile_email_conflict",
    });
  });

  it("blocks the email claim in production even when the flag is enabled", async () => {
    vi.stubEnv("AP3K_DEV_ALLOW_EMAIL_PROFILE_CLAIM", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    mockFindUser.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue(workspaceProfile());

    const result = await ensureCurrentUserProfile();

    expect(result).toEqual({
      status: 409,
      data: null,
      error: "profile_email_conflict",
    });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("does not expose stored integration tokens in fallback results or logs", async () => {
    vi.stubEnv("AP3K_DEV_ALLOW_EMAIL_PROFILE_CLAIM", "true");
    mockFindUser.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue(workspaceProfile());

    const result = await ensureCurrentUserProfile();
    const logs = [
      ...vi.mocked(console.info).mock.calls,
      ...vi.mocked(console.warn).mock.calls,
      ...vi.mocked(console.error).mock.calls,
    ];

    expect(JSON.stringify(result)).not.toContain(RAW_TOKEN);
    expect(JSON.stringify(logs)).not.toContain(RAW_TOKEN);
  });

  it("logs safe Prisma code and message when profile creation fails", async () => {
    mockFindUser.mockResolvedValue(null);
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed on email"), {
        code: "P2002",
      })
    );

    const result = await ensureCurrentUserProfile();

    expect(result.error).toBe("profile_provision_failed");
    expect(console.error).toHaveBeenCalledWith(
      "[user-provision] AP3K profile creation failed",
      expect.objectContaining({
        authenticatedUserPresent: true,
        prismaCode: "P2002",
        message: "Unique constraint failed on email",
      })
    );
  });
});
