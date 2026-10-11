import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { timingSafeEqual } from "node:crypto";
const ISSUER = "https://token.actions.githubusercontent.com";
export const SCHEDULER_AUDIENCE = "https://ap3k.com/api/cron/automation-follow-ups";
const REPOSITORY = "Boudofski/SAAS-Instagram-DM-Automations";
const keys = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`), { timeoutDuration: 5000 });

export function schedulerClaimsAllowed(payload: JWTPayload) {
  return payload.repository_id === "1237811208" && payload.repository_owner_id === "92354296"
    && payload.repository === REPOSITORY && payload.ref === "refs/heads/main"
    && payload.workflow_ref === `${REPOSITORY}/.github/workflows/automation-follow-ups.yml@refs/heads/main`
    && ["schedule", "workflow_dispatch"].includes(String(payload.event_name));
}

export async function authorizeAutomationScheduler(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ") || header.length > 16_384) return false;
  const token = header.slice(7);
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && Buffer.byteLength(token) === Buffer.byteLength(secret) && timingSafeEqual(Buffer.from(token), Buffer.from(secret))) return true;
  try {
    const { payload } = await jwtVerify(token, keys, { issuer: ISSUER, audience: SCHEDULER_AUDIENCE, algorithms: ["RS256"], requiredClaims: ["exp", "iat", "nbf"], maxTokenAge: "10m", clockTolerance: 5 });
    return schedulerClaimsAllowed(payload);
  } catch { return false; }
}
