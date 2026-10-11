ALTER TYPE "EVENT_TYPE" ADD VALUE IF NOT EXISTS 'SELF_COMMENT_SKIPPED';
ALTER TYPE "EVENT_TYPE" ADD VALUE IF NOT EXISTS 'COMMENT_SKIPPED';
ALTER TYPE "EVENT_TYPE" ADD VALUE IF NOT EXISTS 'LOOP_GUARD_TRIGGERED';
ALTER TYPE "EVENT_TYPE" ADD VALUE IF NOT EXISTS 'LOOP_GUARD_PAUSED_CAMPAIGN';

CREATE INDEX IF NOT EXISTS "AutomationEvent_automationId_createdAt_idx"
ON "AutomationEvent"("automationId", "createdAt");

CREATE INDEX IF NOT EXISTS "AutomationEvent_automationId_commentId_idx"
ON "AutomationEvent"("automationId", "commentId");

CREATE INDEX IF NOT EXISTS "MessageLog_automationId_recipientIgId_mediaId_createdAt_idx"
ON "MessageLog"("automationId", "recipientIgId", "mediaId", "createdAt");

CREATE INDEX IF NOT EXISTS "MessageLog_automationId_mediaId_createdAt_idx"
ON "MessageLog"("automationId", "mediaId", "createdAt");
