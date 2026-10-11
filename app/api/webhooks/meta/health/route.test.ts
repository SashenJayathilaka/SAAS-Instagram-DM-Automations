import { describe, expect, it, vi } from "vitest";

const mockGetMetaAdminDiagnostics = vi.fn();

vi.mock("@/lib/meta-admin-diagnostics", () => ({
  getMetaAdminDiagnostics: (...args: unknown[]) => mockGetMetaAdminDiagnostics(...args),
}));

import { GET } from "./route";

describe("public Meta webhook health route", () => {
  it("returns only public liveness fields", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      route: "/api/webhooks/meta",
      routeVersion: expect.any(String),
      timestamp: expect.any(String),
    });
    expect(body).not.toHaveProperty("hasMetaVerifyToken");
    expect(body).not.toHaveProperty("hasMetaAppSecret");
    expect(body).not.toHaveProperty("lastSignatureFailedAt");
    expect(mockGetMetaAdminDiagnostics).not.toHaveBeenCalled();
  });
});
