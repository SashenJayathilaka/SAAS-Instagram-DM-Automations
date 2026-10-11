ALTER TABLE "Listener" ADD COLUMN "commentReplies" JSONB,
  ADD COLUMN "messageVariations" JSONB,
  ADD COLUMN "publicReplyLimit" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "PublicReplySlot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "automationId" UUID NOT NULL,
  "mediaId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicReplySlot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicReplySlot_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PublicReplySlot_automationId_commentId_key" ON "PublicReplySlot"("automationId", "commentId");
CREATE INDEX "PublicReplySlot_automationId_mediaId_createdAt_idx" ON "PublicReplySlot"("automationId", "mediaId", "createdAt");
-- Include existing sends in the first rolling window; use log IDs as distinct legacy keys.
INSERT INTO "PublicReplySlot" ("automationId", "mediaId", "commentId", "status", "createdAt")
SELECT "automationId", "mediaId", 'legacy:' || "id"::text, 'SENT', "createdAt" FROM "MessageLog"
WHERE "messageType" = 'COMMENT_REPLY' AND "status" = 'SENT' AND "mediaId" IS NOT NULL AND "createdAt" > CURRENT_TIMESTAMP - INTERVAL '7 days';

CREATE INDEX "PublicReplySlot_createdAt_idx" ON "PublicReplySlot"("createdAt");
