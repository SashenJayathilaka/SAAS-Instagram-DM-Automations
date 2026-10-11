import { beforeEach, describe, expect, it, vi } from "vitest";
const verify = vi.hoisted(() => vi.fn());
vi.mock("jose", () => ({ createRemoteJWKSet: vi.fn(), jwtVerify: verify }));
import { authorizeAutomationScheduler, schedulerClaimsAllowed, SCHEDULER_AUDIENCE } from "./automation-scheduler-auth";
const claims = { repository_id: "1237811208", repository_owner_id: "92354296", repository: "Boudofski/SAAS-Instagram-DM-Automations", ref: "refs/heads/main", workflow_ref: "Boudofski/SAAS-Instagram-DM-Automations/.github/workflows/automation-follow-ups.yml@refs/heads/main", event_name: "schedule" };
beforeEach(() => { vi.resetAllMocks(); delete process.env.CRON_SECRET; });
describe("scheduler authentication", () => {
  it("accepts only the repository's main-branch scheduler identity", () => {
    expect(schedulerClaimsAllowed(claims)).toBe(true);
    for (const key of ["repository_id", "repository_owner_id", "repository", "ref", "workflow_ref", "event_name"]) expect(schedulerClaimsAllowed({ ...claims, [key]: "untrusted" })).toBe(false);
  });
  it("requires cryptographic verification, exact audience, issuer and expiry", async () => {
    verify.mockResolvedValue({ payload: claims });
    expect(await authorizeAutomationScheduler(new Request(SCHEDULER_AUDIENCE, { headers: { authorization: "Bearer signed-jwt" } }))).toBe(true);
    expect(verify).toHaveBeenCalledWith("signed-jwt", undefined, expect.objectContaining({ audience: SCHEDULER_AUDIENCE, issuer: "https://token.actions.githubusercontent.com", algorithms: ["RS256"], requiredClaims: ["exp", "iat", "nbf"] }));
    verify.mockRejectedValue(new Error("invalid signature"));
    expect(await authorizeAutomationScheduler(new Request(SCHEDULER_AUDIENCE, { headers: { authorization: "Bearer forged" } }))).toBe(false);
  });
  it("keeps the existing cron-secret option but fails closed when missing", async () => {
    expect(await authorizeAutomationScheduler(new Request(SCHEDULER_AUDIENCE))).toBe(false);
    process.env.CRON_SECRET = "test-only-secret";
    expect(await authorizeAutomationScheduler(new Request(SCHEDULER_AUDIENCE, { headers: { authorization: "Bearer test-only-secret" } }))).toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });
});
