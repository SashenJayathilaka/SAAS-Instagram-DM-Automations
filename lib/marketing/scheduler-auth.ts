import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
const ISSUER = "https://token.actions.githubusercontent.com";
export const MARKETING_AUDIENCE = "https://ap3k.com/api/cron/marketing";
const REPOSITORY = "Boudofski/SAAS-Instagram-DM-Automations";
const keys = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`), { timeoutDuration: 5000 });
export function marketingSchedulerClaimsAllowed(payload: JWTPayload) {
  return payload.repository_id === "1237811208" && payload.repository_owner_id === "92354296"
    && payload.repository === REPOSITORY && payload.ref === "refs/heads/main"
    && payload.workflow_ref === `${REPOSITORY}/.github/workflows/marketing-emails.yml@refs/heads/main`
    && ["schedule", "workflow_dispatch"].includes(String(payload.event_name));
}
export async function authorizeMarketingScheduler(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ") || header.length > 16384) return false;
  try {
    const { payload } = await jwtVerify(header.slice(7), keys, { issuer: ISSUER, audience: MARKETING_AUDIENCE, algorithms: ["RS256"], requiredClaims: ["exp", "iat", "nbf"], maxTokenAge: "10m", clockTolerance: 5 });
    return marketingSchedulerClaimsAllowed(payload);
  } catch { return false; }
}
