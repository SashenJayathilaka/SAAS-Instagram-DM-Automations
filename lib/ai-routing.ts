import OpenAI from "openai";
import type { AiProviderConfig } from "@prisma/client";
import { client } from "@/lib/prisma";
import { decryptAiProviderSecret } from "@/lib/ai-provider-crypto";
import {
  AI_PROVIDER_IDS,
  getAiProviderDefinition,
  type AiProviderId,
} from "@/lib/ai-providers";
import { aiCompletionBudget } from "@/lib/ai-completion-budget";

export type ProviderInput = {
  providerId: AiProviderId;
  baseUrl: string;
  model: string;
  apiKey: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};
export class AiUnavailableError extends Error {
  constructor(public reason = "UNAVAILABLE") {
    super(
      reason === "PAUSED"
        ? "AI generation is paused by the workspace owner."
        : "AI is temporarily unavailable. Please try again shortly.",
    );
  }
}
export class AiInvalidResponseError extends Error {}
export class AiRefusalError extends Error {
  constructor() {
    super("The AI could not help with this request. Please revise it.");
  }
}

/** No SDK retry loop: the router owns the deadline and tries another provider. */
export function createProvider(input: ProviderInput) {
  const sdk = new OpenAI({
    apiKey: input.apiKey,
    baseURL: input.baseUrl.replace(/\/+$/, ""),
    timeout: input.timeoutMs ?? 10_000,
    maxRetries: 0,
    ...(input.providerId === "openrouter"
      ? {
          defaultHeaders: {
            "HTTP-Referer": "https://ap3k.com",
            "X-OpenRouter-Title": "AP3K",
          },
        }
      : {}),
  });
  return {
    chat: {
      completions: {
        create: async (
          request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
          options?: { timeout?: number; maxRetries?: number },
        ) => {
          const requestOptions = {
            timeout: Math.min(
              input.timeoutMs ?? 10_000,
              options?.timeout ?? Infinity,
            ),
            maxRetries: 0,
            signal: input.signal,
          };
          let result: OpenAI.Chat.Completions.ChatCompletion;
          try {
            result = await sdk.chat.completions.create(request, requestOptions);
          } catch (error) {
            const status = statusOf(error);
            if (!request.response_format || ![400, 422].includes(status))
              throw error;
            const { response_format: _format, ...compatible } = request;
            result = await sdk.chat.completions.create(
              compatible,
              requestOptions,
            );
          }
          const choice = result.choices[0];
          if (
            choice?.finish_reason === "content_filter" ||
            choice?.message?.refusal
          )
            throw new AiRefusalError();
          if (
            !choice?.message?.content?.trim() ||
            choice.finish_reason === "length"
          )
            throw new AiInvalidResponseError(
              "Empty or incomplete model response",
            );
          return result;
        },
      },
    },
  };
}

function statusOf(error: unknown) {
  return Number((error as { status?: number } | null)?.status) || 0;
}
export function aiFailure(error: unknown, failures = 0, now = Date.now()) {
  const status = statusOf(error);
  const code = status
    ? `HTTP_${status}`
    : /timeout|abort/i.test((error as Error)?.name || "")
      ? "TIMEOUT"
      : /connection/i.test((error as Error)?.name || "")
        ? "CONNECTION"
        : "INVALID_RESPONSE";
  let delay = [401, 403, 404].includes(status)
    ? 15 * 60_000
    : Math.min(5 * 60_000, 30_000 * 2 ** Math.min(failures, 4));
  const headers = (error as { headers?: Headers } | null)?.headers;
  const retryAfter = headers?.get?.("retry-after");
  if (status === 429 && retryAfter) {
    const seconds = Number(retryAfter);
    const requested = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(retryAfter) - now;
    if (Number.isFinite(requested))
      delay = Math.max(delay, Math.min(60 * 60_000, Math.max(0, requested)));
  }
  // Invalid request/format failures are task-specific, not proof of an outage.
  if ([400, 413, 422].includes(status) || code === "INVALID_RESPONSE")
    delay = 0;
  return { code, cooldownUntil: delay ? new Date(now + delay) : null };
}

function fingerprint(config: AiProviderConfig) {
  return {
    id: config.id,
    model: config.model,
    encryptedApiKey: config.encryptedApiKey,
  };
}
function inputFor(config: AiProviderConfig): ProviderInput {
  const definition = getAiProviderDefinition(config.id);
  if (!definition || !config.encryptedApiKey || !config.model)
    throw new AiUnavailableError("CONFIGURATION");
  return {
    providerId: definition.id,
    model: config.model,
    baseUrl: definition.baseUrl,
    apiKey: decryptAiProviderSecret(config.encryptedApiKey),
  };
}
async function healthUpdate(
  config: AiProviderConfig,
  data: Parameters<typeof client.aiProviderConfig.updateMany>[0]["data"],
) {
  try {
    await client.aiProviderConfig.updateMany({
      where: fingerprint(config),
      data,
    });
  } catch {
    console.warn("[ai-routing] health persistence unavailable", {
      provider: config.id,
    });
  }
}
async function recordFailure(
  config: AiProviderConfig,
  error: unknown,
  task: string,
) {
  const failure = aiFailure(error, config.consecutiveFailures);
  // A large draft exceeding its task budget does not prove short replies are down.
  if ((task === "flow" || task === "policy") && failure.code === "TIMEOUT") {
    failure.cooldownUntil = null;
  }
  await healthUpdate(config, {
    ...(failure.cooldownUntil ? { consecutiveFailures: { increment: 1 }, cooldownUntil: failure.cooldownUntil } : {}),
    lastFailureCode: failure.code,
  });
  console.warn("[ai-routing] provider attempt failed", {
    provider: config.id,
    model: config.model,
    task,
    code: failure.code,
  });
}

export function rankAiProviders(configs: AiProviderConfig[], now = Date.now()) {
  if (!configs.some((config) => config.enabled))
    throw new AiUnavailableError("PAUSED");
  return configs
    .filter(
      (config) =>
        (config.enabled || config.fallbackEnabled) &&
        config.encryptedApiKey &&
        getAiProviderDefinition(config.id) &&
        (!config.cooldownUntil || config.cooldownUntil.getTime() <= now),
    )
    .sort(
      (a, b) =>
        (a.benchmarkLatencyMs ?? Infinity) -
          (b.benchmarkLatencyMs ?? Infinity) ||
        Number(b.enabled) - Number(a.enabled) ||
        a.id.localeCompare(b.id),
    );
}

/** Hard deadline includes compatibility/repair calls; aborted work never delivers a message. */
async function bounded<T>(
  config: AiProviderConfig,
  timeoutMs: number,
  run: (provider: ProviderInput) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run({ ...inputFor(config), signal: controller.signal, timeoutMs }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          const error = new Error("AI attempt timed out");
          error.name = "TimeoutError";
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** One small, non-customer benchmark per connection; DB claim prevents a cold-start herd. */
async function calibrate(configs: AiProviderConfig[]) {
  await Promise.all(
    configs
      .filter(
        (config) =>
          config.benchmarkLatencyMs === null &&
          config.lastTestStatus === "CONNECTED",
      )
      .map(async (config) => {
        const now = new Date();
        let claimed;
        try {
          claimed = await client.aiProviderConfig.updateMany({
            where: {
              ...fingerprint(config),
              benchmarkLatencyMs: null,
              OR: [
                { lastBenchmarkedAt: null },
                {
                  lastBenchmarkedAt: {
                    lt: new Date(now.getTime() - 10 * 60_000),
                  },
                },
              ],
            },
            data: { lastBenchmarkedAt: now },
          });
        } catch {
          return;
        }
        if (!claimed.count) return;
        const started = Date.now();
        try {
          await bounded(config, 6000, async (provider) => {
            const result = await createProvider(
              provider,
            ).chat.completions.create({
              model: provider.model,
              temperature: 0,
              ...aiCompletionBudget(provider),
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content:
                    'Return only JSON: {"answer":4,"reply":"Happy to help!"}.',
                },
                { role: "user", content: "What is 2 plus 2?" },
              ],
            });
            const parsed = JSON.parse(
              result.choices[0].message
                .content!.replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/, ""),
            );
            if (
              parsed.answer !== 4 ||
              typeof parsed.reply !== "string" ||
              !parsed.reply.trim()
            )
              throw new AiInvalidResponseError("Benchmark response invalid");
          });
          config.benchmarkLatencyMs = Math.max(1, Date.now() - started);
          await healthUpdate(config, {
            benchmarkLatencyMs: config.benchmarkLatencyMs,
            lastSuccessAt: new Date(),
            consecutiveFailures: 0,
            cooldownUntil: null,
            lastFailureCode: null,
          });
        } catch (error) {
          // Benchmark errors never pause routing. Actual tasks may still work.
          console.warn("[ai-routing] benchmark unavailable", {
            provider: config.id,
            code: aiFailure(error).code,
          });
        }
      }),
  );
}

export type AiTask =
  | "comment"
  | "dm"
  | "support"
  | "admin"
  | "email"
  | "conversation-plan"
  | "copy"
  | "policy"
  | "flow"
  | "story-intent";
/** Retry only generation/validation. Persistence, billing and Instagram delivery stay outside. */
export async function withAiProvider<T>(
  task: AiTask,
  run: (provider: ProviderInput) => Promise<T>,
): Promise<NonNullable<T>> {
  const configs = await client.aiProviderConfig.findMany({
    where: { id: { in: [...AI_PROVIDER_IDS] } },
  });
  let candidates = rankAiProviders(configs);
  if (!candidates.length) throw new AiUnavailableError("COOLDOWN");
  await calibrate(candidates);
  candidates = rankAiProviders(configs);
  const complex = task === "flow" || task === "policy";
  const deadline = Date.now() + (complex ? 90_000 : 28_000);
  for (let index = 0; index < candidates.length; index++) {
    const config = candidates[index];
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;
    const timeoutMs = Math.min(complex ? 30_000 : 9000, remaining);
    if (config.cooldownUntil && config.consecutiveFailures > 0) {
      // One request probes recovery; other instances continue to healthy backups.
      try {
        const probe = await client.aiProviderConfig.updateMany({
          where: {
            ...fingerprint(config),
            cooldownUntil: config.cooldownUntil,
          },
          data: { cooldownUntil: new Date(Date.now() + timeoutMs + 2000) },
        });
        if (!probe.count) continue;
      } catch {
        continue;
      }
    }
    const started = Date.now();
    try {
      const result = await bounded(config, timeoutMs, run);
      if (result === null || result === undefined || result === false)
        throw new AiInvalidResponseError(
          "Response did not pass task validation",
        );
      await healthUpdate(config, {
        lastSuccessAt: new Date(),
        consecutiveFailures: 0,
        cooldownUntil: null,
        lastFailureCode: null,
      });
      console.info("[ai-routing] completed", {
        task,
        provider: config.id,
        model: config.model,
        latencyMs: Date.now() - started,
        failover: index > 0,
      });
      return result as NonNullable<T>;
    } catch (error) {
      if (error instanceof AiRefusalError) throw error;
      await recordFailure(config, error, task);
    }
  }
  throw new AiUnavailableError();
}
