import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaSignature } from "./webhook-signature";

const RAW_BODY = '{"object":"instagram","entry":[{"id":"123","changes":[]}]}';
const SECRET_META = "test_meta_app_secret_abc123";
const SECRET_INSTAGRAM = "test_instagram_app_secret_xyz789";

function sign(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

const envMeta = { META_APP_SECRET: SECRET_META };
const envBoth = { META_APP_SECRET: SECRET_META, INSTAGRAM_APP_SECRET: SECRET_INSTAGRAM };
const envInstagramOnly = { INSTAGRAM_APP_SECRET: SECRET_INSTAGRAM };
const envEmpty = {};

describe("verifyMetaSignature — primary secret (META_APP_SECRET)", () => {
  it("verifies a correctly signed payload", () => {
    const result = verifyMetaSignature(RAW_BODY, sign(SECRET_META, RAW_BODY), envMeta);
    expect(result.verified).toBe(true);
    expect(result.reason).toBe("verified");
    expect(result.triedSecretCount).toBe(1);
  });

  it("reports candidateSecretsConfigured correctly", () => {
    const result = verifyMetaSignature(RAW_BODY, sign(SECRET_META, RAW_BODY), envMeta);
    expect(result.candidateSecretsConfigured.META_APP_SECRET).toBe(true);
    expect(result.candidateSecretsConfigured.INSTAGRAM_APP_SECRET).toBe(false);
    expect(result.candidateSecretsConfigured.INSTAGRAM_CLIENT_SECRET).toBe(false);
  });

  it("includes a 12-char hex rawBodySha256Short", () => {
    const result = verifyMetaSignature(RAW_BODY, sign(SECRET_META, RAW_BODY), envMeta);
    expect(result.rawBodySha256Short).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("verifyMetaSignature — fallback to INSTAGRAM_APP_SECRET", () => {
  it("verifies when META_APP_SECRET fails but INSTAGRAM_APP_SECRET matches", () => {
    const sig = sign(SECRET_INSTAGRAM, RAW_BODY);
    const result = verifyMetaSignature(RAW_BODY, sig, envBoth);
    expect(result.verified).toBe(true);
    expect(result.reason).toBe("verified");
    expect(result.triedSecretCount).toBe(2);
  });

  it("verifies when only INSTAGRAM_APP_SECRET is configured", () => {
    const result = verifyMetaSignature(RAW_BODY, sign(SECRET_INSTAGRAM, RAW_BODY), envInstagramOnly);
    expect(result.verified).toBe(true);
  });
});

describe("verifyMetaSignature — rejection cases", () => {
  it("rejects a payload signed with the wrong secret", () => {
    const result = verifyMetaSignature(RAW_BODY, sign("wrong_secret", RAW_BODY), envMeta);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("signature_mismatch");
    expect(result.triedSecretCount).toBe(1);
  });

  it("rejects when raw body is mutated (whitespace appended)", () => {
    const sig = sign(SECRET_META, RAW_BODY);
    const result = verifyMetaSignature(RAW_BODY + " ", sig, envMeta);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("signature_mismatch");
  });

  it("rejects when raw body is re-stringified JSON (key order/whitespace changed)", () => {
    const sig = sign(SECRET_META, RAW_BODY);
    const reparsed = JSON.stringify(JSON.parse(RAW_BODY));
    const result = verifyMetaSignature(reparsed, sig, envMeta);
    // May or may not match depending on JSON output — but if body changed, must reject
    if (reparsed !== RAW_BODY) {
      expect(result.verified).toBe(false);
    }
  });

  it("rejects missing signature header (null)", () => {
    const result = verifyMetaSignature(RAW_BODY, null, envMeta);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("missing_or_invalid_signature_header");
    expect(result.triedSecretCount).toBe(0);
  });

  it("rejects signature without sha256= prefix", () => {
    const result = verifyMetaSignature(RAW_BODY, "md5=abc123", envMeta);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("missing_or_invalid_signature_header");
  });

  it("rejects when no secrets are configured", () => {
    const result = verifyMetaSignature(RAW_BODY, sign(SECRET_META, RAW_BODY), envEmpty);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("no_app_secret_configured");
    expect(result.triedSecretCount).toBe(0);
  });
});
