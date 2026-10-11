ALTER TABLE "User"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedReason" TEXT;

ALTER TABLE "Integrations"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'CONNECTED',
  ADD COLUMN "disconnectedAt" TIMESTAMP(3),
  ADD COLUMN "disconnectedReason" TEXT,
  ADD COLUMN "reconnectRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastAdminNote" TEXT,
  ADD COLUMN "lastAdminActionAt" TIMESTAMP(3);

ALTER TABLE "Automation"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedByAdminEmail" TEXT,
  ADD COLUMN "archiveReason" TEXT;

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT,
  "adminEmail" TEXT,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "targetLabel" TEXT,
  "reason" TEXT,
  "confirmation" TEXT,
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB,
  "status" TEXT NOT NULL DEFAULT 'SUCCESS',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt");
CREATE INDEX "AdminAuditLog_adminEmail_createdAt_idx" ON "AdminAuditLog"("adminEmail", "createdAt");
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");
