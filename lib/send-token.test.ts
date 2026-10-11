import { describe, it, expect } from "vitest";
import {
  resolveIntegrationSendToken,
  tokenResolutionDiagnostics,
} from "./send-token";

const VALID_TOKEN = "EAABsbCS".padEnd(21, "x");

describe("resolveIntegrationSendToken", () => {
  it("returns ok with token when integration.token is a valid string", () => {
    const result = resolveIntegrationSendToken({ token: VALID_TOKEN });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.token).toBe(VALID_TOKEN);
      expect(result.source).toBe("pageToken");
    }
  });

  it("trims whitespace from a valid token", () => {
    const result = resolveIntegrationSendToken({ token: `  ${VALID_TOKEN}  ` });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.token).toBe(VALID_TOKEN);
  });

  it("returns not-ok when integration is null", () => {
    const result = resolveIntegrationSendToken(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_integration");
  });

  it("returns not-ok when integration is undefined", () => {
    const result = resolveIntegrationSendToken(undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no_integration");
  });

  it("returns not-ok with token_missing when token is null", () => {
    const result = resolveIntegrationSendToken({ token: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("token_missing");
  });

  it("returns not-ok with token_missing when token is undefined", () => {
    const result = resolveIntegrationSendToken({ token: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("token_missing");
  });

  it("returns not-ok with token_missing when token is empty string", () => {
    const result = resolveIntegrationSendToken({ token: "" });
    expect(result.ok).toBe(false);
  });

  it("returns not-ok with token_invalid_format for [object Object]", () => {
    const result = resolveIntegrationSendToken({ token: "[object Object]" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("token_invalid_format");
  });

  it("returns not-ok with token_invalid_format for JSON-looking value", () => {
    const result = resolveIntegrationSendToken({ token: '{"access_token":"abc"}' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("token_invalid_format");
  });

  it("returns not-ok with token_invalid_format for array-looking value", () => {
    const result = resolveIntegrationSendToken({ token: '["abc","def"]' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("token_invalid_format");
  });

  it("returns not-ok when token is too short (< 20 chars)", () => {
    const result = resolveIntegrationSendToken({ token: "short" });
    expect(result.ok).toBe(false);
  });
});

describe("tokenResolutionDiagnostics", () => {
  it("marks reconnectRequired true when token is missing", () => {
    const diag = tokenResolutionDiagnostics({ token: null, instagramId: "12345", pageId: "67890" });
    expect(diag.reconnectRequired).toBe(true);
    expect(diag.pageAccessTokenPresent).toBe(false);
    expect(diag.tokenFormatValid).toBe(false);
    expect(diag.tokenSource).toBeNull();
  });

  it("marks reconnectRequired false when token is valid", () => {
    const diag = tokenResolutionDiagnostics({
      id: "int-1",
      token: VALID_TOKEN,
      instagramId: "17841451766608292",
      pageId: "100121532610908",
    });
    expect(diag.reconnectRequired).toBe(false);
    expect(diag.pageAccessTokenPresent).toBe(true);
    expect(diag.tokenFormatValid).toBe(true);
    expect(diag.tokenSource).toBe("pageToken");
    expect(diag.integrationId).toBe("int-1");
    expect(diag.instagramId).toBe("17841451766608292");
    expect(diag.pageId).toBe("100121532610908");
  });

  it("marks reconnectRequired true and pageAccessTokenPresent false when null integration", () => {
    const diag = tokenResolutionDiagnostics(null);
    expect(diag.reconnectRequired).toBe(true);
    expect(diag.pageAccessTokenPresent).toBe(false);
  });

  it("does not expose the token value", () => {
    const diag = tokenResolutionDiagnostics({ token: VALID_TOKEN });
    expect(JSON.stringify(diag)).not.toContain(VALID_TOKEN);
  });
});
