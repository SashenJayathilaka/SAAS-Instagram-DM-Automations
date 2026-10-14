import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  clerkUpdate: vi.fn(),
  findUnique: vi.fn(),
  dbUpdate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: mocks.currentUser,
  clerkClient: vi.fn(async () => ({ users: { updateUser: mocks.clerkUpdate } })),
}));
vi.mock("@/lib/prisma", () => ({
  client: { user: { findUnique: mocks.findUnique, update: mocks.dbUpdate } },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { updateProfileName } from "./profile";

describe("updateProfileName", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "user_123" });
    mocks.findUnique.mockResolvedValue({ id: "profile_123" });
    mocks.clerkUpdate.mockResolvedValue({});
    mocks.dbUpdate.mockResolvedValue({});
  });

  it("updates Clerk and the AP3K profile with the same normalized name", async () => {
    const result = await updateProfileName({ firstName: "  Ada  ", lastName: "  van   Dijk " });

    expect(mocks.clerkUpdate).toHaveBeenCalledWith("user_123", { firstName: "Ada", lastName: "van Dijk" });
    expect(mocks.dbUpdate).toHaveBeenCalledWith({
      where: { id: "profile_123" },
      data: { firstname: "Ada", lastname: "van Dijk" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/user_123");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/user_123/settings");
    expect(result).toEqual({ ok: true, name: "Ada van Dijk" });
  });

  it("rejects invalid input before writing", async () => {
    await expect(updateProfileName({ firstName: "  ", lastName: "User" })).resolves.toEqual({
      ok: false,
      error: "Enter a first name and keep each name under 80 characters.",
    });
    expect(mocks.clerkUpdate).not.toHaveBeenCalled();
    expect(mocks.dbUpdate).not.toHaveBeenCalled();
  });
});
