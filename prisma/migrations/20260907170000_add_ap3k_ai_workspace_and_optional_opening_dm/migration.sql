-- Central AP3K AI profile, shared quota ledger, and an optional opening DM.
ALTER TABLE "Listener"
  ADD COLUMN "aiDmReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "openingDmEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "AiProviderConfig"
  ALTER COLUMN "model" SET DEFAULT 'glm-5.3';

UPDATE "AiProviderConfig"
SET "model" = 'glm-5.3'
WHERE NULLIF(BTRIM("model"), '') IS NULL;

CREATE TABLE "AiWorkspaceConfig" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "aiRepliesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "aiCommentsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "role" TEXT NOT NULL DEFAULT 'Helpful Instagram assistant',
  "brandVoice" TEXT NOT NULL DEFAULT 'Friendly, clear, concise, and human',
  "guardrails" TEXT,
  "defaultTone" TEXT NOT NULL DEFAULT 'FRIENDLY',
  "protectionRules" JSONB,
  "knowledge" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiWorkspaceConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiWorkspaceConfig_userId_key" ON "AiWorkspaceConfig"("userId");

ALTER TABLE "AiWorkspaceConfig"
  ADD CONSTRAINT "AiWorkspaceConfig_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AiWorkspaceConfig" (
  "userId", "aiCommentsEnabled", "defaultTone", "protectionRules", "createdAt", "updatedAt"
)
SELECT DISTINCT
  a."userId",
  true,
  COALESCE(NULLIF(BTRIM(l."aiReplyTone"), ''), 'FRIENDLY'),
  l."aiProtectionRules",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Automation" a
JOIN "Listener" l ON l."automationId" = a."id"
WHERE a."userId" IS NOT NULL
  AND l."aiReplyEnabled" = true
ON CONFLICT ("userId") DO NOTHING;

UPDATE "Listener"
SET "aiDmReplyEnabled" = true
WHERE "listener" = 'SMARTAI';

INSERT INTO "AiWorkspaceConfig" (
  "userId", "aiRepliesEnabled", "createdAt", "updatedAt"
)
SELECT DISTINCT a."userId", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Automation" a
JOIN "Listener" l ON l."automationId" = a."id"
WHERE a."userId" IS NOT NULL AND l."listener" = 'SMARTAI'
ON CONFLICT ("userId") DO UPDATE SET "aiRepliesEnabled" = true;

CREATE TABLE "AiUsageEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "automationId" UUID,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsageEvent_userId_createdAt_idx" ON "AiUsageEvent"("userId", "createdAt");
CREATE INDEX "AiUsageEvent_automationId_createdAt_idx" ON "AiUsageEvent"("automationId", "createdAt");

ALTER TABLE "AiUsageEvent"
  ADD CONSTRAINT "AiUsageEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiUsageEvent"
  ADD CONSTRAINT "AiUsageEvent_automationId_fkey"
  FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "AiUsageEvent" (
  "userId", "automationId", "channel", "status", "meta", "createdAt", "updatedAt"
)
SELECT
  a."userId",
  e."automationId",
  'COMMENT',
  CASE WHEN e."meta"->>'status' = 'reserved' THEN 'RESERVED' ELSE 'COMPLETED' END,
  e."meta",
  e."createdAt",
  e."createdAt"
FROM "AutomationEvent" e
JOIN "Automation" a ON a."id" = e."automationId"
WHERE e."eventType" = 'AI_REPLY_GENERATED'
  AND a."userId" IS NOT NULL;
