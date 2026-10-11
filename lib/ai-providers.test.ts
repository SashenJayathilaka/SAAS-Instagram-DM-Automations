import { describe, expect, it } from "vitest";
import {
  AI_PROVIDER_IDS,
  AI_PROVIDERS,
  getAiProviderDefinition,
  isAiProviderId,
  validateAiModelId,
} from "@/lib/ai-providers";

describe("AP3K AI provider registry", () => {
  it("exposes exactly the three supported providers with fixed HTTPS endpoints", () => {
    expect(AI_PROVIDERS.map((provider) => provider.id)).toEqual(["google", "groq", "openrouter"]);
    expect(AI_PROVIDER_IDS).toHaveLength(3);
    for (const provider of AI_PROVIDERS) {
      expect(provider.baseUrl).toMatch(/^https:\/\//);
      expect(provider.models.some((model) => model.id === provider.defaultModel)).toBe(true);
    }
  });

  it("rejects unsupported providers and malformed model IDs", () => {
    expect(isAiProviderId("groq")).toBe(true);
    expect(isAiProviderId("agent-router")).toBe(false);
    expect(getAiProviderDefinition("unknown")).toBeNull();
    expect(() => validateAiModelId("bad model id")).toThrow("valid provider model ID");
    expect(validateAiModelId("qwen/qwen3.8-27b")).toBe("qwen/qwen3.8-27b");
    expect(validateAiModelId("openrouter/free")).toBe("openrouter/free");
  });
});
