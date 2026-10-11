import { beforeEach, describe, expect, it, vi } from "vitest";
const verify = vi.hoisted(() => vi.fn());
vi.mock("jose", () => ({ createRemoteJWKSet: vi.fn(), jwtVerify: verify }));
import { authorizeMarketingScheduler, marketingSchedulerClaimsAllowed, MARKETING_AUDIENCE } from "./scheduler-auth";
const claims = { repository_id: "1237811208", repository_owner_id: "92354296", repository: "Boudofski/SAAS-Instagram-DM-Automations", ref: "refs/heads/main", workflow_ref: "Boudofski/SAAS-Instagram-DM-Automations/.github/workflows/marketing-emails.yml@refs/heads/main", event_name: "schedule" };
beforeEach(() => vi.resetAllMocks());
describe("marketing scheduler identity", () => {
  it("rejects other repositories, owners, branches, workflows and PR events", () => {
    expect(marketingSchedulerClaimsAllowed(claims)).toBe(true);
    expect(marketingSchedulerClaimsAllowed({ ...claims, event_name: "workflow_dispatch" })).toBe(true);
    for (const field of Object.keys(claims)) expect(marketingSchedulerClaimsAllowed({ ...claims, [field]: "untrusted" })).toBe(false);
  });
  it("requires verified signature, exact audience and short token lifetime", async () => {
    verify.mockResolvedValue({ payload: claims });
    expect(await authorizeMarketingScheduler(new Request(MARKETING_AUDIENCE, { headers: { authorization: "Bearer signed" } }))).toBe(true);
    expect(verify).toHaveBeenCalledWith("signed", undefined, expect.objectContaining({ audience: MARKETING_AUDIENCE, issuer: "https://token.actions.githubusercontent.com", algorithms: ["RS256"], requiredClaims: ["exp", "iat", "nbf"], maxTokenAge: "10m" }));
    verify.mockRejectedValue(new Error("bad signature"));
    expect(await authorizeMarketingScheduler(new Request(MARKETING_AUDIENCE, { headers: { authorization: "Bearer forged" } }))).toBe(false);
  });
  it("fails closed for missing credentials and does not accept unrelated shared secrets", async () => {
    expect(await authorizeMarketingScheduler(new Request(MARKETING_AUDIENCE))).toBe(false);
    verify.mockRejectedValue(new Error("not a signed token"));
    expect(await authorizeMarketingScheduler(new Request(MARKETING_AUDIENCE, { headers: { authorization: "Bearer arbitrary-secret" } }))).toBe(false);
  });
});
