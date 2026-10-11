ALTER TABLE "Listener" ADD COLUMN "aiConversation" JSONB;
CREATE TABLE "AiConversationSession" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "integrationId" UUID NOT NULL,
 "recipientIgId" TEXT NOT NULL, "automationId" UUID NOT NULL,
 "history" JSONB NOT NULL DEFAULT '[]', "status" TEXT NOT NULL DEFAULT 'ACTIVE',
 "expiresAt" TIMESTAMP(3) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AiConversationSession_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AiConversationSession_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AiConversationSession_integrationId_recipientIgId_key" ON "AiConversationSession"("integrationId", "recipientIgId");
CREATE INDEX "AiConversationSession_automationId_idx" ON "AiConversationSession"("automationId");
