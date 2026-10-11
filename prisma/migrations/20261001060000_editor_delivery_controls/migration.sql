ALTER TABLE "Automation" ADD COLUMN "triggerOnShares" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "oneDmPerUser" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "AutomationDmRecipient" (
 "automationId" UUID NOT NULL REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "recipientIgId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("automationId", "recipientIgId")
);
CREATE TABLE "AutomationDeliveryJob" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 "automationId" UUID NOT NULL REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "eventKey" TEXT NOT NULL,
 "payload" JSONB NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING',
 "dueAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "AutomationDeliveryJob_automationId_eventKey_key" ON "AutomationDeliveryJob"("automationId","eventKey");
CREATE INDEX "AutomationDeliveryJob_status_dueAt_idx" ON "AutomationDeliveryJob"("status","dueAt");
