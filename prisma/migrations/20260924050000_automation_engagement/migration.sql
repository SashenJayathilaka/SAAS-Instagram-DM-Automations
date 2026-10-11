ALTER TABLE "Listener"
  ADD COLUMN "emailCaptureEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailCapturePrompt" TEXT,
  ADD COLUMN "followUpEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "followUpMessage" TEXT,
  ADD COLUMN "followUpDelayMinutes" INTEGER NOT NULL DEFAULT 30,
  ADD CONSTRAINT "Listener_followUpDelayMinutes_check" CHECK ("followUpDelayMinutes" IN (15, 30, 60, 180, 720));
ALTER TABLE "Lead" ADD COLUMN "email" TEXT, ADD COLUMN "emailCollectedAt" TIMESTAMP(3);
CREATE TABLE "AutomationEngagementJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "automationId" UUID NOT NULL,
  "recipientIgId" TEXT NOT NULL,
  "flowId" TEXT NOT NULL,
  "replyMessageId" TEXT,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('EMAIL', 'FOLLOW_UP')),
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'WAITING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  "dueAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "inboundAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationEngagementJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AutomationEngagementJob_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AutomationEngagementJob_journey_key" ON "AutomationEngagementJob"("automationId", "recipientIgId", "flowId", "kind");
CREATE INDEX "AutomationEngagementJob_kind_status_dueAt_idx" ON "AutomationEngagementJob"("kind", "status", "dueAt");
CREATE INDEX "AutomationEngagementJob_recipientIgId_kind_status_idx" ON "AutomationEngagementJob"("recipientIgId", "kind", "status");
CREATE TABLE "AutomationSchedulerHeartbeat" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lastRunAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "AutomationEngagementJob_replyMessageId_key" ON "AutomationEngagementJob"("replyMessageId");
