-- Store safe Meta webhook receipts independently from automation-specific logs.
CREATE TABLE "WebhookEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "automationId" UUID,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "eventType" TEXT NOT NULL,
    "field" TEXT,
    "igAccountId" TEXT,
    "igUserId" TEXT,
    "mediaId" TEXT,
    "commentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookEvent_automationId_createdAt_idx" ON "WebhookEvent"("automationId", "createdAt");
CREATE INDEX "WebhookEvent_igAccountId_createdAt_idx" ON "WebhookEvent"("igAccountId", "createdAt");
CREATE INDEX "WebhookEvent_commentId_idx" ON "WebhookEvent"("commentId");

ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_automationId_fkey"
FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "EVENT_TYPE" ADD VALUE IF NOT EXISTS 'WEBHOOK_RECEIVED';
ALTER TYPE "EVENT_TYPE" ADD VALUE IF NOT EXISTS 'KEYWORD_MATCHED';
