-- AlterTable
ALTER TABLE "Integrations" ADD COLUMN     "conversationStarters" JSONB;

-- AlterTable
ALTER TABLE "Listener" ADD COLUMN     "flowDraft" JSONB,
ADD COLUMN     "flowTriggers" JSONB;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "customFields" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "AutomationFlowSession" ADD COLUMN     "resumeAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AutomationHit" (
    "id" TEXT NOT NULL,
    "automationId" UUID NOT NULL,
    "eventKey" TEXT NOT NULL,
    "recipientIgId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationTrackedLink" (
    "id" UUID NOT NULL,
    "automationId" UUID NOT NULL,
    "recipientIgId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationTrackedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationClick" (
    "id" TEXT NOT NULL,
    "automationId" UUID NOT NULL,
    "recipientIgId" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationFollowerState" (
    "id" TEXT NOT NULL,
    "integrationId" UUID NOT NULL,
    "recipientIgId" TEXT NOT NULL,
    "automationId" UUID,
    "firstFollowing" BOOLEAN NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastNotFollowingAt" TIMESTAMP(3),
    "followedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationFollowerState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationStarterReceipt" (
    "id" UUID NOT NULL,
    "integrationId" UUID NOT NULL,
    "recipientIgId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationStarterReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationHit_automationId_recipientIgId_idx" ON "AutomationHit"("automationId", "recipientIgId");

-- CreateIndex
CREATE INDEX "AutomationHit_automationId_createdAt_idx" ON "AutomationHit"("automationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationHit_automationId_eventKey_key" ON "AutomationHit"("automationId", "eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationTrackedLink_key_key" ON "AutomationTrackedLink"("key");

-- CreateIndex
CREATE INDEX "AutomationTrackedLink_automationId_idx" ON "AutomationTrackedLink"("automationId");

-- CreateIndex
CREATE INDEX "AutomationClick_automationId_createdAt_idx" ON "AutomationClick"("automationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationClick_automationId_recipientIgId_key" ON "AutomationClick"("automationId", "recipientIgId");

-- CreateIndex
CREATE INDEX "AutomationFollowerState_automationId_followedAt_idx" ON "AutomationFollowerState"("automationId", "followedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationFollowerState_integrationId_recipientIgId_key" ON "AutomationFollowerState"("integrationId", "recipientIgId");

-- CreateIndex
CREATE INDEX "ConversationStarterReceipt_integrationId_status_createdAt_idx" ON "ConversationStarterReceipt"("integrationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationStarterReceipt_integrationId_recipientIgId_even_key" ON "ConversationStarterReceipt"("integrationId", "recipientIgId", "eventId");

-- CreateIndex
CREATE INDEX "AutomationFlowSession_status_resumeAt_idx" ON "AutomationFlowSession"("status", "resumeAt");

-- AddForeignKey
ALTER TABLE "AutomationHit" ADD CONSTRAINT "AutomationHit_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationTrackedLink" ADD CONSTRAINT "AutomationTrackedLink_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationClick" ADD CONSTRAINT "AutomationClick_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationFollowerState" ADD CONSTRAINT "AutomationFollowerState_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationFollowerState" ADD CONSTRAINT "AutomationFollowerState_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationStarterReceipt" ADD CONSTRAINT "ConversationStarterReceipt_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

