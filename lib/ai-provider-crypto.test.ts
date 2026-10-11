import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptAiProviderSecret, encryptAiProviderSecret } from "@/lib/ai-provider-crypto";

afterEach(() => vi.unstubAllEnvs());

describe("AI provider key encryption", () => {
  it("round-trips an API key without storing plaintext", () => {
    vi.stubEnv("AI_CONFIG_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    const encrypted = encryptAiProviderSecret("router-secret-key");
    expect(encrypted).not.toContain("router-secret-key");
    expect(decryptAiProviderSecret(encrypted)).toBe("router-secret-key");
  });

  it("requires a server encryption key", () => {
    vi.stubEnv("AI_CONFIG_ENCRYPTION_KEY", "");
    expect(() => encryptAiProviderSecret("secret")).toThrow("AI_CONFIG_ENCRYPTION_KEY");
  });
});
