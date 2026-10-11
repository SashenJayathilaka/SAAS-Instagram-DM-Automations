export const AI_PROVIDER_IDS = ["google", "groq", "openrouter"] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export type AiProviderModel = {
  id: string;
  label: string;
  note: string;
};

export type AiProviderDefinition = {
  id: AiProviderId;
  name: string;
  shortName: string;
  description: string;
  baseUrl: string;
  defaultModel: string;
  apiKeyUrl: string;
  docsUrl: string;
  keyPlaceholder: string;
  freeTierNote: string;
  models: readonly AiProviderModel[];
};

export const AI_PROVIDERS: readonly AiProviderDefinition[] = [
  {
    id: "google",
    name: "Google AI Studio",
    shortName: "Gemini",
    description: "Strong multilingual replies with the current Gemini Flash family.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.5-flash-lite",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    docsUrl: "https://ai.google.dev/gemini-api/docs/openai",
    keyPlaceholder: "Paste your Gemini API key",
    freeTierNote: "Best first choice for AP3K. Start with the Google AI Studio free allowance; quotas depend on your Google project.",
    models: [
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", note: "Recommended for fast, economical replies" },
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "Higher quality for nuanced conversations" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", note: "Stable lightweight fallback" },
    ],
  },
  {
    id: "groq",
    name: "Groq Cloud",
    shortName: "Groq",
    description: "Very low latency with free-plan models and optional Llama or Qwen access.",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-20b",
    apiKeyUrl: "https://console.groq.com/keys",
    docsUrl: "https://console.groq.com/docs/models",
    keyPlaceholder: "Paste your Groq API key",
    freeTierNote: "The GPT-OSS presets are currently listed on Groq's free-plan limits. Llama and Qwen availability depends on your account.",
    models: [
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B", note: "Recommended free-plan speed" },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", note: "Smarter free-plan option" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", note: "Fast; account access may be required" },
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", note: "Higher quality; account access may be required" },
      { id: "qwen/qwen3.6-27b", label: "Qwen 3.6 27B", note: "Preview model; may change" },
      { id: "qwen/qwen3.8-27b", label: "Qwen 3.8 27B", note: "Latest preview; may change" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    shortName: "OpenRouter",
    description: "One API key for many models, with automatic routing across free models.",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/free",
    apiKeyUrl: "https://openrouter.ai/settings/keys",
    docsUrl: "https://openrouter.ai/docs/guides/routing/routers/free-router",
    keyPlaceholder: "Paste your OpenRouter API key",
    freeTierNote: "Use openrouter/free to automatically select an available zero-cost model. Free model capacity can vary.",
    models: [
      { id: "openrouter/free", label: "OpenRouter Free Router", note: "Recommended automatic zero-cost routing" },
    ],
  },
] as const;

export function isAiProviderId(value: string): value is AiProviderId {
  return AI_PROVIDER_IDS.includes(value as AiProviderId);
}

export function getAiProviderDefinition(value: string) {
  return AI_PROVIDERS.find((provider) => provider.id === value) ?? null;
}

export function validateAiModelId(value: string) {
  const model = value.trim();
  if (!model || model.length > 160 || !/^[A-Za-z0-9._:/~-]+$/.test(model)) {
    throw new Error("Enter a valid provider model ID.");
  }
  return model;
}
