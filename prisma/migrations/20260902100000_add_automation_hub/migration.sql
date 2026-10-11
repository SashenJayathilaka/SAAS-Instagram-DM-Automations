-- Extend the existing comment automation model without rewriting live records.
ALTER TABLE "Automation"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'COMMENT',
ADD COLUMN "storyTriggerType" TEXT,
ADD COLUMN "followGateRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "typingIndicator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deliveryDelaySeconds" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Listener"
ADD COLUMN "responseFormat" TEXT NOT NULL DEFAULT 'TEXT',
ADD COLUMN "quickReplies" JSONB,
ADD COLUMN "mediaUrl" TEXT,
ADD COLUMN "mediaType" TEXT;

CREATE TABLE "Conversation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "automationId" UUID,
    "recipientIgId" TEXT NOT NULL,
    "recipientUsername" TEXT,
    "profilePictureUrl" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastInboundAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InboxMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL,
    "metaMessageId" TEXT,
    "senderIgId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_userId_recipientIgId_key" ON "Conversation"("userId", "recipientIgId");
CREATE INDEX "Conversation_userId_lastMessageAt_idx" ON "Conversation"("userId", "lastMessageAt");
CREATE UNIQUE INDEX "InboxMessage_metaMessageId_key" ON "InboxMessage"("metaMessageId");
CREATE INDEX "InboxMessage_conversationId_createdAt_idx" ON "InboxMessage"("conversationId", "createdAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InboxMessage" ADD CONSTRAINT "InboxMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Automation" ADD CONSTRAINT "Automation_deliveryDelaySeconds_check" CHECK ("deliveryDelaySeconds" IN (0, 3, 5, 10, 30));
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_source_check" CHECK ("source" IN ('COMMENT', 'STORY', 'DM'));
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_storyTriggerType_check" CHECK ("storyTriggerType" IS NULL OR "storyTriggerType" IN ('MENTION', 'REACTION', 'REPLY'));
ALTER TABLE "Listener" ADD CONSTRAINT "Listener_responseFormat_check" CHECK ("responseFormat" IN ('TEXT', 'LINK', 'MEDIA'));
