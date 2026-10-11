ALTER TABLE "Listener" ADD COLUMN "flowDefinition" JSONB;
ALTER TABLE "Listener" ADD COLUMN "flowRevision" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "AutomationFlowSession" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "automationId" UUID NOT NULL,
 "integrationId" UUID NOT NULL, "recipientIgId" TEXT NOT NULL,
 "definition" JSONB NOT NULL, "values" JSONB NOT NULL DEFAULT '{}', "nodeId" TEXT,
 "status" TEXT NOT NULL DEFAULT 'READY', "lastEventId" TEXT, "startEventId" TEXT,
 "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AutomationFlowSession_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AutomationFlowSession_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AutomationFlowSession_integrationId_recipientIgId_key" ON "AutomationFlowSession"("integrationId", "recipientIgId");
CREATE INDEX "AutomationFlowSession_status_expiresAt_idx" ON "AutomationFlowSession"("status", "expiresAt");
CREATE TABLE "AutomationFlowEntry" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "automationId" UUID NOT NULL, "recipientIgId" TEXT NOT NULL, "outcome" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AutomationFlowEntry_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AutomationFlowEntry_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AutomationFlowEntry_automationId_recipientIgId_key" ON "AutomationFlowEntry"("automationId", "recipientIgId");

CREATE TABLE "AutomationFlowReceipt" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "automationId" UUID NOT NULL,
 "integrationId" UUID NOT NULL, "recipientIgId" TEXT NOT NULL, "eventId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AutomationFlowReceipt_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AutomationFlowReceipt_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AutomationFlowReceipt_integrationId_recipientIgId_eventId_key" ON "AutomationFlowReceipt"("integrationId", "recipientIgId", "eventId");
CREATE INDEX "AutomationFlowReceipt_createdAt_idx" ON "AutomationFlowReceipt"("createdAt");
