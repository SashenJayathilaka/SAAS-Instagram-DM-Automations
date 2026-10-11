import { describe, expect, it } from "vitest";
import { migrationUrl } from "../scripts/migration-url.mjs";

describe("migration connection", () => {
  it("uses direct Neon connections even when only the pooled runtime URL exists", () => {
    const result = new URL(migrationUrl({ DATABASE_URL: "postgresql://user:password@ep-demo-pooler.us-east-1.aws.neon.tech/app?sslmode=require&pgbouncer=true" }));
    expect(result.hostname).toBe("ep-demo.us-east-1.aws.neon.tech");
    expect(result.pathname).toBe("/app");
    expect(result.searchParams.get("sslmode")).toBe("require");
    expect(result.searchParams.has("pgbouncer")).toBe(false);
  });
  it("prefers the explicit migration URL and leaves other providers unchanged", () => {
    expect(migrationUrl({ DATABASE_URL: "postgresql://user@runtime/app", DATABASE_URL_UNPOOLED: "postgresql://user@direct/app" })).toBe("postgresql://user@direct/app");
    expect(migrationUrl({ DATABASE_URL: "postgresql://user@other-pooler.example.com/app" })).toBe("postgresql://user@other-pooler.example.com/app");
  });
  it("fails when no connection is configured", () => {
    expect(() => migrationUrl({})).toThrow("DATABASE_URL");
  });
});
