import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiProviderConfig } from "@prisma/client";
const mocks = vi.hoisted(() => ({
  configs: vi.fn(),
  update: vi.fn(),
  complete: vi.fn(),
  options: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  client: {
    aiProviderConfig: { findMany: mocks.configs, updateMany: mocks.update },
  },
}));
vi.mock("@/lib/ai-provider-crypto", () => ({
  decryptAiProviderSecret: () => "test-only",
}));
vi.mock("openai", () => ({
  default: class {
    constructor(options: unknown) {
      mocks.options(options);
    }
    chat = { completions: { create: mocks.complete } };
  },
}));
import {
  aiFailure,
  AiInvalidResponseError,
  AiRefusalError,
  createProvider,
  rankAiProviders,
  withAiProvider,
} from "./ai-routing";
const config = (id: string, overrides: Partial<AiProviderConfig> = {}) =>
  ({
    id,
    enabled: id === "groq",
    fallbackEnabled: true,
    model: `${id}-model`,
    encryptedApiKey: "encrypted",
    benchmarkLatencyMs: id === "groq" ? 50 : 200,
    lastTestStatus: "CONNECTED",
    lastBenchmarkedAt: new Date(),
    cooldownUntil: null,
    consecutiveFailures: 0,
    ...overrides,
  }) as AiProviderConfig;
const response = (content = "A valid answer", finish_reason = "stop") => ({
  choices: [{ finish_reason, message: { content } }],
});
const httpError = (status: number, retry?: string) =>
  Object.assign(new Error("upstream failure"), {
    status,
    headers: new Headers(retry ? { "retry-after": retry } : {}),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.configs.mockResolvedValue([
    config("google"),
    config("groq"),
    config("openrouter"),
  ]);
  mocks.update.mockResolvedValue({ count: 1 });
  mocks.complete.mockResolvedValue(response());
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("shared provider routing", () => {
  it("uses the fastest measured connection even when a slower provider is selected", async () => {
    mocks.configs.mockResolvedValue([
      config("google", { enabled: true }),
      config("groq", { enabled: false }),
    ]);
    const run = vi.fn(async (provider) => provider.providerId);
    expect(await withAiProvider("support", run)).toBe("groq");
    expect(run).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          consecutiveFailures: 0,
          cooldownUntil: null,
        }),
      }),
    );
  });
  it("honors global pause, explicit backup exclusion and cooldown", () => {
    expect(() =>
      rankAiProviders([config("google", { enabled: false })]),
    ).toThrow("paused");
    expect(
      rankAiProviders([
        config("groq"),
        config("google", { fallbackEnabled: false }),
        config("openrouter", { cooldownUntil: new Date(Date.now() + 60_000) }),
      ]).map((x) => x.id),
    ).toEqual(["groq"]);
  });
  it.each([401, 404, 429, 503])(
    "falls back after HTTP %s without disabling the provider",
    async (status) => {
      const run = vi.fn(async (provider) => {
        if (provider.providerId === "groq") throw httpError(status);
        return "Recovered answer";
      });
      expect(await withAiProvider("dm", run)).toBe("Recovered answer");
      expect(run.mock.calls.map(([p]) => p.providerId)).toEqual([
        "groq",
        "google",
      ]);
      const failure = mocks.update.mock.calls.find(
        ([call]) => call.data.lastFailureCode,
      );
      expect(failure?.[0].data).toMatchObject({
        lastFailureCode: `HTTP_${status}`,
        cooldownUntil: expect.any(Date),
      });
      expect(failure?.[0].data).not.toHaveProperty("enabled");
    },
  );
  it("falls back when task validation rejects malformed output", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new AiInvalidResponseError())
      .mockResolvedValueOnce({ reply: "Valid" });
    expect(await withAiProvider("copy", run)).toEqual({ reply: "Valid" });
    expect(run).toHaveBeenCalledTimes(3);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({
      lastFailureCode: "INVALID_RESPONSE",
    });
  });
  it("never routes around an explicit model refusal", async () => {
    const run = vi.fn().mockRejectedValue(new AiRefusalError());
    await expect(withAiProvider("support", run)).rejects.toBeInstanceOf(
      AiRefusalError,
    );
    expect(run).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("aborts a hanging request and uses the next provider within the deadline", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const run = vi.fn((provider) => {
      if (provider.providerId === "groq") {
        signal = provider.signal;
        return new Promise<string>(() => {});
      }
      return Promise.resolve("backup");
    });
    const result = withAiProvider("comment", run);
    await vi.advanceTimersByTimeAsync(9001);
    expect(await result).toBe("backup");
    expect(signal?.aborted).toBe(true);
  });
  it("exhausts three unavailable providers without an unbounded retry loop", async () => {
    const run = vi.fn().mockRejectedValue(httpError(503));
    await expect(withAiProvider("support", run)).rejects.toThrow(
      "temporarily unavailable",
    );
    expect(run).toHaveBeenCalledTimes(3);
  });
  it("skips an expired cooldown when another instance already claimed the recovery probe", async () => {
    mocks.configs.mockResolvedValue([
      config("groq", {
        cooldownUntil: new Date(Date.now() - 1),
        consecutiveFailures: 1,
      }),
      config("google"),
    ]);
    mocks.update.mockResolvedValueOnce({ count: 0 });
    const run = vi.fn(async (provider) => provider.providerId);
    expect(await withAiProvider("dm", run)).toBe("google");
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("automatically restores a recovered provider after cooldown", async () => {
    mocks.configs.mockResolvedValue([
      config("groq", {
        cooldownUntil: new Date(Date.now() - 1),
        consecutiveFailures: 1,
      }),
    ]);
    expect(await withAiProvider("dm", async () => "recovered")).toBe(
      "recovered",
    );
    expect(mocks.update.mock.calls.at(-1)?.[0].data).toMatchObject({
      consecutiveFailures: 0,
      cooldownUntil: null,
      lastFailureCode: null,
    });
  });
  it("does not discard a valid response if health persistence fails", async () => {
    mocks.update.mockRejectedValue(
      new Error("database temporarily unavailable"),
    );
    expect(await withAiProvider("support", async () => "valid")).toBe("valid");
  });
  it("benchmarks only claimed, verified connections using non-customer content", async () => {
    mocks.configs.mockResolvedValue([
      config("groq", { benchmarkLatencyMs: null, lastBenchmarkedAt: null }),
    ]);
    mocks.complete.mockResolvedValue(
      response('{"answer":4,"reply":"Happy to help!"}'),
    );
    expect(await withAiProvider("support", async () => "customer answer")).toBe(
      "customer answer",
    );
    expect(mocks.complete).toHaveBeenCalledTimes(1);
    expect(mocks.complete.mock.calls[0][0].messages[1].content).toBe(
      "What is 2 plus 2?",
    );
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          benchmarkLatencyMs: expect.any(Number),
        }),
      }),
    );
  });
  it("continues serving when another instance owns calibration", async () => {
    mocks.configs.mockResolvedValue([
      config("groq", { benchmarkLatencyMs: null }),
    ]);
    mocks.update.mockResolvedValueOnce({ count: 0 });
    expect(await withAiProvider("support", async () => "answer")).toBe(
      "answer",
    );
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});

describe("complex-task isolation", () => {
  it("allows a valid 20-second flow without treating its model as unavailable", async () => {
    vi.useFakeTimers();
    const result = withAiProvider(
      "flow",
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ flow: "valid" }), 20_000),
        ),
    );
    await vi.advanceTimersByTimeAsync(20_001);
    expect(await result).toEqual({ flow: "valid" });
  });
  it("does not globally quarantine a provider when a complex draft times out", async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("slow draft"), { name: "TimeoutError" }),
      )
      .mockResolvedValueOnce({ flow: "valid" });
    expect(await withAiProvider("flow", run)).toEqual({ flow: "valid" });
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({
      lastFailureCode: "TIMEOUT",
    });
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("cooldownUntil");
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("consecutiveFailures");
  });
});

describe("transport and cooldowns", () => {
  const provider = {
    providerId: "groq" as const,
    baseUrl: "https://api.groq.com/openai/v1",
    model: "test",
    apiKey: "test-only",
    timeoutMs: 9000,
  };
  const request = {
    model: "test",
    messages: [{ role: "user" as const, content: "Hi" }],
    response_format: { type: "json_object" as const },
  };
  it.each([400, 422])(
    "retries optional JSON formatting once for HTTP %s",
    async (status) => {
      mocks.complete
        .mockRejectedValueOnce(httpError(status))
        .mockResolvedValueOnce(response('{"reply":"Hi"}'));
      await createProvider(provider).chat.completions.create(request);
      expect(mocks.complete).toHaveBeenCalledTimes(2);
      expect(mocks.complete.mock.calls[1][0]).not.toHaveProperty(
        "response_format",
      );
      expect(mocks.options).toHaveBeenCalledWith(
        expect.objectContaining({ maxRetries: 0, timeout: 9000 }),
      );
    },
  );
  it.each([
    ["", "stop"],
    ["partial", "length"],
  ])("rejects empty or truncated completions", async (content, finish) => {
    mocks.complete.mockResolvedValue(response(content, finish));
    await expect(
      createProvider(provider).chat.completions.create(request),
    ).rejects.toBeInstanceOf(AiInvalidResponseError);
  });
  it("preserves explicit safety refusals", async () => {
    mocks.complete.mockResolvedValue(response("", "content_filter"));
    await expect(
      createProvider(provider).chat.completions.create(request),
    ).rejects.toBeInstanceOf(AiRefusalError);
  });
  it("honors rate-limit Retry-After and bounds exponential outage backoff", () => {
    expect(
      aiFailure(httpError(429, "120"), 0, 1000).cooldownUntil?.getTime(),
    ).toBe(121000);
    expect(aiFailure(httpError(503), 10, 1000).cooldownUntil?.getTime()).toBe(
      301000,
    );
    expect(aiFailure(httpError(401), 0, 1000).cooldownUntil?.getTime()).toBe(
      901000,
    );
    expect(aiFailure(httpError(422), 0, 1000).cooldownUntil).toBeNull();
  });
});
