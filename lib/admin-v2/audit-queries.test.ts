import { describe, expect, it } from "vitest";
import { sanitizeAdminPayload } from "@/lib/admin-control-center";
import {
  summarizeAuditValue,
  auditActionTone,
  auditStatusTone,
} from "@/lib/admin-v2/audit-queries";

describe("summarizeAuditValue", () => {
  it("returns — for null", () => {
    expect(summarizeAuditValue(null)).toBe("—");
  });

  it("returns — for empty object", () => {
    expect(summarizeAuditValue({})).toBe("—");
  });

  it("renders up to 2 key-value pairs with camelCase split", () => {
    const result = summarizeAuditValue({ plan: "FREE", usageResetAt: "2026-05-31" });
    expect(result).toContain("plan: FREE");
    expect(result).toContain("usage reset at");
  });

  it("truncates to first 2 entries for long objects", () => {
    const result = summarizeAuditValue({ a: "1", b: "2", c: "3", d: "4" });
    expect(result.split(",")).toHaveLength(2);
  });

  it("skips null values", () => {
    const result = summarizeAuditValue({ x: null, y: "keep" });
    expect(result).not.toContain("x:");
    expect(result).toContain("y: keep");
  });
});

describe("auditActionTone", () => {
  it("maps Phase 2D user actions to expected tones", () => {
    expect(auditActionTone("ADMIN_USER_SUSPENDED")).toBe("red");
    expect(auditActionTone("ADMIN_USER_REACTIVATED")).toBe("green");
    expect(auditActionTone("ADMIN_PLAN_CHANGED")).toBe("blue");
    expect(auditActionTone("ADMIN_USER_USAGE_RESET")).toBe("amber");
    expect(auditActionTone("ADMIN_BILLING_OVERRIDES_UPDATED")).toBe("pink");
  });

  it("maps campaign actions", () => {
    expect(auditActionTone("ADMIN_PAUSE_CAMPAIGN")).toBe("amber");
    expect(auditActionTone("ADMIN_RESUME_CAMPAIGN")).toBe("green");
  });

  it("falls back to slate for unknown actions", () => {
    expect(auditActionTone("UNKNOWN_ADMIN_ACTION")).toBe("slate");
  });
});

describe("auditStatusTone", () => {
  it("maps SUCCESS to green", () => {
    expect(auditStatusTone("SUCCESS")).toBe("green");
  });

  it("maps BLOCKED to amber", () => {
    expect(auditStatusTone("BLOCKED")).toBe("amber");
  });

  it("maps FAILED to red", () => {
    expect(auditStatusTone("FAILED")).toBe("red");
  });

  it("falls back to slate for unknown status", () => {
    expect(auditStatusTone("UNKNOWN")).toBe("slate");
  });
});

describe("sanitizeAdminPayload removes sensitive keys", () => {
  it("redacts token key", () => {
    const result = sanitizeAdminPayload({ token: "abc123", status: "ACTIVE" }) as Record<string, unknown>;
    expect(result.token).toBe("[redacted]");
    expect(result.status).toBe("ACTIVE");
  });

  it("redacts access_token key", () => {
    const result = sanitizeAdminPayload({ access_token: "tok_xyz", plan: "PRO" }) as Record<string, unknown>;
    expect(result.access_token).toBe("[redacted]");
    expect(result.plan).toBe("PRO");
  });

  it("redacts secret key", () => {
    const result = sanitizeAdminPayload({ secret: "very_secret", reason: "test" }) as Record<string, unknown>;
    expect(result.secret).toBe("[redacted]");
    expect(result.reason).toBe("test");
  });

  it("redacts authorization key", () => {
    const result = sanitizeAdminPayload({ authorization: "Bearer xyz" }) as Record<string, unknown>;
    expect(result.authorization).toBe("[redacted]");
  });

  it("redacts nested sensitive keys recursively", () => {
    const result = sanitizeAdminPayload({ outer: { token: "nested_tok", name: "safe" } }) as Record<string, unknown>;
    const outer = result.outer as Record<string, unknown>;
    expect(outer.token).toBe("[redacted]");
    expect(outer.name).toBe("safe");
  });

  it("passes non-sensitive admin payload fields through unchanged", () => {
    const result = sanitizeAdminPayload({ status: "SUSPENDED", suspendedAt: "2026-05-31" }) as Record<string, unknown>;
    expect(result.status).toBe("SUSPENDED");
    expect(result.suspendedAt).toBe("2026-05-31");
  });
});
