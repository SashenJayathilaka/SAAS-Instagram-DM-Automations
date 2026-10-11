import { createHash, createHmac, timingSafeEqual } from "crypto";

export const SIGNATURE_CANDIDATE_NAMES = [
  "META_APP_SECRET",
  "INSTAGRAM_APP_SECRET",
  "INSTAGRAM_CLIENT_SECRET",
] as const;

export type SignatureCandidateName = (typeof SIGNATURE_CANDIDATE_NAMES)[number];

export type SignatureResult = {
  verified: boolean;
  reason: string;
  triedSecretCount: number;
  candidateSecretsConfigured: Record<SignatureCandidateName, boolean>;
  rawBodySha256Short: string;
};

function safeHmacEqual(rawBody: string, secret: string, signature: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(actualBuf, expectedBuf);
}

export function verifyMetaSignature(
  rawBody: string,
  signature: string | null,
  env: Record<string, string | undefined> = process.env
): SignatureResult {
  const candidateSecretsConfigured: Record<SignatureCandidateName, boolean> = {
    META_APP_SECRET: Boolean(env.META_APP_SECRET),
    INSTAGRAM_APP_SECRET: Boolean(env.INSTAGRAM_APP_SECRET),
    INSTAGRAM_CLIENT_SECRET: Boolean(env.INSTAGRAM_CLIENT_SECRET),
  };

  const rawBodySha256Short = createHash("sha256")
    .update(rawBody, "utf8")
    .digest("hex")
    .slice(0, 12);

  if (!signature?.startsWith("sha256=")) {
    return {
      verified: false,
      reason: "missing_or_invalid_signature_header",
      triedSecretCount: 0,
      candidateSecretsConfigured,
      rawBodySha256Short,
    };
  }

  const candidates = SIGNATURE_CANDIDATE_NAMES.map((k) => env[k]).filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0
  );

  if (candidates.length === 0) {
    return {
      verified: false,
      reason: "no_app_secret_configured",
      triedSecretCount: 0,
      candidateSecretsConfigured,
      rawBodySha256Short,
    };
  }

  for (const secret of candidates) {
    if (safeHmacEqual(rawBody, secret, signature)) {
      return {
        verified: true,
        reason: "verified",
        triedSecretCount: candidates.length,
        candidateSecretsConfigured,
        rawBodySha256Short,
      };
    }
  }

  return {
    verified: false,
    reason: "signature_mismatch",
    triedSecretCount: candidates.length,
    candidateSecretsConfigured,
    rawBodySha256Short,
  };
}
