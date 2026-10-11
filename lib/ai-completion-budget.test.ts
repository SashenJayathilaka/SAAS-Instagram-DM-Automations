import { describe, expect, it } from "vitest";
import { aiCompletionBudget } from "./ai-completion-budget";

describe("AI completion budget", () => {
  it("bounds Gemini 3 reasoning while leaving room for a complete JSON reply", () => {
    expect(aiCompletionBudget({ providerId: "google", model: "gemini-3.5-flash-lite" })).toEqual({ max_tokens: 2048, reasoning_effort: "low" });
  });
  it("gives Groq fast replies a low reasoning budget and complex tasks more reasoning", () => {
    expect(aiCompletionBudget({ providerId: "groq", model: "openai/gpt-oss-20b" })).toEqual({ max_tokens: 2048, reasoning_effort: "low" });
    expect(aiCompletionBudget({ providerId: "groq", model: "openai/gpt-oss-20b" }, "complex").reasoning_effort).toBe("medium");
    expect(aiCompletionBudget({ providerId: "google", model: "gemini-3.5-flash-lite" }, "complex").reasoning_effort).toBe("medium");
  });
  it("does not send Gemini reasoning parameters to other providers or older models", () => {
    expect(aiCompletionBudget({ providerId: "openrouter", model: "openrouter/free" })).toEqual({ max_tokens: 2048 });
    expect(aiCompletionBudget({ providerId: "google", model: "gemini-2.5-flash-lite" })).toEqual({ max_tokens: 2048 });
  });
});
