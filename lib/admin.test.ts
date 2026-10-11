import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCurrentUser = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error("not_found");
});

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: (...args: any[]) => mockCurrentUser(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

import {
  isOwnerAdminIdentity,
  maskSecret,
  requireOwnerAdmin,
} from "./admin";

describe("requireOwnerAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAILS = "owner@example.com";
    process.env.ADMIN_CLERK_USER_IDS = "clerk_admin";
  });

  it("allows an admin email", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "clerk_user",
      fullName: "Owner",
      primaryEmailAddress: { emailAddress: "owner@example.com", verification: { status: "verified" } },
    });

    await expect(requireOwnerAdmin()).resolves.toMatchObject({
      clerkId: "clerk_user",
      email: "owner@example.com",
    });
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("rejects an unverified allowlisted email", async () => {
    mockCurrentUser.mockResolvedValue({ id: "clerk_user", primaryEmailAddress: { emailAddress: "owner@example.com", verification: { status: "unverified" } } });
    await expect(requireOwnerAdmin()).rejects.toThrow("not_found");
  });

  it("allows an admin Clerk user id", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "clerk_admin",
      fullName: "Owner",
      primaryEmailAddress: { emailAddress: "other@example.com" },
    });

    await expect(requireOwnerAdmin()).resolves.toMatchObject({
      clerkId: "clerk_admin",
    });
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("blocks non-admin users with notFound", async () => {
    mockCurrentUser.mockResolvedValue({
      id: "clerk_user",
      fullName: "User",
      primaryEmailAddress: { emailAddress: "user@example.com" },
    });

    await expect(requireOwnerAdmin()).rejects.toThrow("not_found");
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it("does not grant Admin V2 access to boudofski@gmail.com", () => {
    process.env.ADMIN_EMAILS = "officialabde@gmail.com";
    process.env.ADMIN_CLERK_USER_IDS = "";

    expect(
      isOwnerAdminIdentity({
        clerkId: "preview_workspace_owner",
        email: "boudofski@gmail.com",
      })
    ).toBe(false);
    expect(
      isOwnerAdminIdentity({
        clerkId: "official_admin",
        email: "officialabde@gmail.com",
      })
    ).toBe(true);
  });

  it("masks secrets without exposing full values", () => {
    expect(maskSecret("abcdef123456")).toBe("stored ending 3456");
    expect(maskSecret("abcdef123456")).not.toContain("abcdef12");
  });
});
