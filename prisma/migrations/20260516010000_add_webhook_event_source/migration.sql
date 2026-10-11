ALTER TABLE "WebhookEvent"
ADD COLUMN "eventSource" TEXT NOT NULL DEFAULT 'META_REAL';

CREATE INDEX "WebhookEvent_eventSource_createdAt_idx"
ON "WebhookEvent"("eventSource", "createdAt");
