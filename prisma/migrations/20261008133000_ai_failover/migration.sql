ALTER TABLE "AiProviderConfig"
  ADD COLUMN "fallbackEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "benchmarkLatencyMs" INTEGER,
  ADD COLUMN "lastBenchmarkedAt" TIMESTAMP(3),
  ADD COLUMN "lastSuccessAt" TIMESTAMP(3),
  ADD COLUMN "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cooldownUntil" TIMESTAMP(3),
  ADD COLUMN "lastFailureCode" TEXT;

-- Owner-authorized rollout: reuse only existing, successfully tested connections.
-- Future credentials/models must be tested and explicitly allowed as backups.
UPDATE "AiProviderConfig" SET "fallbackEnabled" = true
WHERE id IN ('google', 'groq', 'openrouter')
  AND "lastTestStatus" = 'CONNECTED' AND "encryptedApiKey" IS NOT NULL;
