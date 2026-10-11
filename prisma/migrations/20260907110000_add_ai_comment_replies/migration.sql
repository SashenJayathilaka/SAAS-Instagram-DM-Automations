-- Store per-automation AI public-reply behavior without changing existing campaigns.
ALTER TABLE "Listener"
  ADD COLUMN "aiReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "aiReplyTone" TEXT NOT NULL DEFAULT 'FRIENDLY',
  ADD COLUMN "aiReplyInstructions" TEXT,
  ADD COLUMN "aiProtectionRules" JSONB;

-- One server-managed OpenAI-compatible provider configuration for AP3K.
CREATE TABLE "AiProviderConfig" (
  "id" TEXT NOT NULL DEFAULT 'primary',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "providerName" TEXT NOT NULL DEFAULT 'AgentRouter',
  "baseUrl" TEXT NOT NULL DEFAULT 'https://co.agentrouter.org/v1',
  "model" TEXT NOT NULL DEFAULT '',
  "encryptedApiKey" TEXT,
  "apiKeyHint" TEXT,
  "lastTestedAt" TIMESTAMP(3),
  "lastTestStatus" TEXT,
  "lastTestError" TEXT,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiProviderConfig_pkey" PRIMARY KEY ("id")
);

ALTER TYPE "EVENT_TYPE" ADD VALUE 'AI_REPLY_GENERATED';

-- Keep already-started Free launch trials aligned with the published 50-reply trial.
UPDATE "Subscription"
SET "welcomeTrialReplyLimit" = LEAST("welcomeTrialReplyLimit", 50)
WHERE "welcomeTrialReplyLimit" IS NOT NULL;
