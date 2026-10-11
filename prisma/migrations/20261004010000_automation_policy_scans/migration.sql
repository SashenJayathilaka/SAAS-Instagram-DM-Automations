CREATE TABLE "AutomationPolicyScan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AutomationPolicyScan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AutomationPolicyScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AutomationPolicyScan_status_check" CHECK ("status" IN ('PENDING','COMPLETE','FAILED'))
);
CREATE INDEX "AutomationPolicyScan_userId_status_createdAt_idx" ON "AutomationPolicyScan"("userId", "status", "createdAt");
