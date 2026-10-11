import { describe, expect, it } from "vitest";
import { userDirectoryWhere, accountDirectoryWhere } from "./directory-filters";
describe("admin directory filters", () => {
  it("combines search, Free (including no subscription), and suspension with AND", () => {
    const where = userDirectoryWhere({ q: "@creator", plan: "FREE", status: "SUSPENDED" });
    expect(where.AND).toHaveLength(3);
    expect(JSON.stringify(where)).toContain('"instagramUsername":{"contains":"creator"');
    expect(JSON.stringify(where)).toContain('"subscription":{"is":null}');
    expect(JSON.stringify(where)).toContain('"status":"SUSPENDED"');
  });
  it("ignores unknown plan/status values", () => {
    expect(userDirectoryWhere({ plan: "admin", status: "deleted" })).toEqual({ AND: [] });
  });
  it("keeps account search separate from health conditions", () => {
    const where = accountDirectoryWhere({ q: "user@test.com", status: "attention" });
    expect(where.OR).toHaveLength(2);
    expect(where.AND).toHaveLength(1);
    expect(accountDirectoryWhere({ status: "locked" })).toEqual({ planLocked: true });
  });
});
