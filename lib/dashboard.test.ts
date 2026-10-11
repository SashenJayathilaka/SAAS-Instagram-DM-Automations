import { describe, expect, it } from "vitest";
import {
  dashboardDestinationPath,
  dashboardEntryPath,
} from "./dashboard";

describe("dashboard email destinations", () => {
  it("creates a generic entry URL for an approved workspace destination", () => {
    expect(dashboardEntryPath("/billing")).toBe(
      "/dashboard?next=%2Fbilling"
    );
    expect(dashboardDestinationPath("user_123", "/automation/new")).toBe(
      "/dashboard/user_123/automation/new"
    );
  });

  it("rejects external and unknown redirect destinations", () => {
    expect(dashboardEntryPath("https://evil.example")).toBe("/dashboard");
    expect(dashboardDestinationPath("user_123", "//evil.example")).toBe(
      "/dashboard/user_123"
    );
    expect(dashboardDestinationPath("user_123", "/admin")).toBe(
      "/dashboard/user_123"
    );
  });
});
