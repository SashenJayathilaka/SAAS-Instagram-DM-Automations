import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  update: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/actions/user", () => ({ onCurrentUser: async () => ({ id: "clerk-user" }) }));
vi.mock("@/lib/prisma", () => ({ client: { user: { update: state.update } } }));
vi.mock("next/cache", () => ({ revalidatePath: state.revalidatePath }));

import { updateTimeZonePreference } from "./time-zone";

describe("updateTimeZonePreference", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stores an authenticated user's validated preference", async () => {
    state.update.mockResolvedValue({});
    await expect(updateTimeZonePreference({ timeZone: "America/New_York", automatic: false })).resolves.toEqual({
      timeZone: "America/New_York",
      automatic: false,
    });
    expect(state.update).toHaveBeenCalledWith({
      where: { clerkId: "clerk-user" },
      data: { timeZone: "America/New_York", timeZoneAuto: false },
    });
    expect(state.revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("rejects invalid zones before touching the database", async () => {
    await expect(updateTimeZonePreference({ timeZone: "invalid-zone", automatic: true })).rejects.toThrow("Choose a valid time zone.");
    expect(state.update).not.toHaveBeenCalled();
  });
});
