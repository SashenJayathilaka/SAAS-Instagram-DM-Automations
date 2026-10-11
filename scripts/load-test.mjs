import { performance } from "node:perf_hooks";

const baseUrl = process.env.LOAD_TEST_BASE_URL?.replace(/\/$/, "");
const requestsPerSecond = boundedInteger(process.env.LOAD_TEST_RPS, 5, 1, 100);
const durationSeconds = boundedInteger(process.env.LOAD_TEST_DURATION_SECONDS, 30, 5, 600);
const p95TargetMs = boundedInteger(process.env.LOAD_TEST_P95_MS, 2_000, 100, 30_000);
const paths = (process.env.LOAD_TEST_PATHS ?? "/,/pricing,/api/health")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value.startsWith("/") && !value.startsWith("//"));

if (!baseUrl) fail("Set LOAD_TEST_BASE_URL to a staging or preview deployment.");

const host = new URL(baseUrl).hostname.toLowerCase();
if (host === "ap3k.com" || host === "www.ap3k.com") {
  fail("Production load testing is blocked. Use a Vercel preview/staging deployment.");
}
if (paths.length === 0) fail("LOAD_TEST_PATHS must contain at least one safe path.");

const results = [];
console.log(`AP3K staging load test: ${requestsPerSecond} req/s for ${durationSeconds}s against ${baseUrl}`);

for (let second = 0; second < durationSeconds; second += 1) {
  const batchStartedAt = performance.now();
  const batch = Array.from({ length: requestsPerSecond }, (_, index) => {
    const path = paths[(second * requestsPerSecond + index) % paths.length];
    return request(path);
  });
  results.push(...(await Promise.all(batch)));
  const remainingMs = 1_000 - (performance.now() - batchStartedAt);
  if (remainingMs > 0) await new Promise((resolve) => setTimeout(resolve, remainingMs));
}

const durations = results.map((result) => result.durationMs).sort((a, b) => a - b);
const failures = results.filter((result) => !result.ok);
const p50 = percentile(durations, 50);
const p95 = percentile(durations, 95);
const p99 = percentile(durations, 99);
const errorRate = results.length ? failures.length / results.length : 1;

console.table({
  requests: results.length,
  failures: failures.length,
  errorRate: `${(errorRate * 100).toFixed(2)}%`,
  p50: `${p50.toFixed(0)}ms`,
  p95: `${p95.toFixed(0)}ms`,
  p99: `${p99.toFixed(0)}ms`,
});

if (errorRate >= 0.01 || p95 > p95TargetMs) {
  process.exitCode = 1;
  console.error(`FAILED thresholds: error rate <1%, p95 <=${p95TargetMs}ms.`);
} else {
  console.log("PASSED thresholds.");
}

async function request(path) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      headers: process.env.LOAD_TEST_AUTH_TOKEN
        ? { Authorization: `Bearer ${process.env.LOAD_TEST_AUTH_TOKEN}` }
        : undefined,
    });
    await response.arrayBuffer();
    return {
      path,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      durationMs: performance.now() - startedAt,
    };
  } catch (error) {
    return { path, ok: false, status: 0, durationMs: performance.now() - startedAt, error: String(error) };
  }
}

function percentile(values, value) {
  if (!values.length) return Number.POSITIVE_INFINITY;
  return values[Math.min(values.length - 1, Math.ceil((value / 100) * values.length) - 1)];
}

function boundedInteger(raw, fallback, minimum, maximum) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
