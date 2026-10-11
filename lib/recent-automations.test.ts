import { describe, expect, it } from "vitest";
import { recentAutomations } from "./recent-automations";

describe("dashboard recent automations", () => {
  it("finds the newest five across the full result, even if the API returns oldest first", () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      id: String(i + 1), createdAt: new Date(2026, 8, i + 1),
    }));
    expect(recentAutomations(rows).map((row) => row.id)).toEqual(["8", "7", "6", "5", "4"]);
    expect(rows.map((row) => row.id)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });
  it("handles serialized, missing and invalid dates without dropping rows", () => {
    const rows = [
      { id: "missing" }, { id: "invalid", createdAt: "bad date" },
      { id: "older", createdAt: "2026-09-01T00:00:00Z" },
      { id: "newer", createdAt: "2026-09-29T00:00:00Z" },
    ];
    expect(recentAutomations(rows).map((row) => row.id)).toEqual(["newer", "older", "missing", "invalid"]);
    expect(recentAutomations([])).toEqual([]);
  });
});
