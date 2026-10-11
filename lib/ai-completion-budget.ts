import type { AiProviderId } from "@/lib/ai-providers";

/** Reasoning models count internal tokens against the completion budget. */
export function aiCompletionBudget(provider: { providerId: AiProviderId; model: string }, task: "fast" | "complex" = "fast") {
  return {
    max_tokens: 2048,
    ...((provider.providerId === "google" && /^gemini-3/.test(provider.model)) || (provider.providerId === "groq" && /^openai\/gpt-oss-/.test(provider.model))
      ? { reasoning_effort: task === "complex" ? "medium" as const : "low" as const }
      : {}),
  };
}
