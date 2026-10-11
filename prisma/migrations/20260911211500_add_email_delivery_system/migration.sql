-- AP3K branded email preferences and delivery observability.
CREATE TYPE "EMAIL_DELIVERY_STATUS" AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'OPENED',
  'CLICKED',
  'BOUNCED',
  'COMPLAINED',
  'SUPPRESSED',
  'FAILED',
  'SKIPPED'
);

CREATE TABLE "EmailPreference" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "productTips" BOOLEAN NOT NULL DEFAULT true,
  "weeklyReports" BOOLEAN NOT NULL DEFAULT true,
  "promotions" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailDelivery" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID,
  "templateId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "EMAIL_DELIVERY_STATUS" NOT NULL DEFAULT 'PENDING',
  "providerMessageId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "clickedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailPreference_userId_key" ON "EmailPreference"("userId");
CREATE UNIQUE INDEX "EmailDelivery_providerMessageId_key" ON "EmailDelivery"("providerMessageId");
CREATE UNIQUE INDEX "EmailDelivery_idempotencyKey_key" ON "EmailDelivery"("idempotencyKey");
CREATE INDEX "EmailDelivery_userId_createdAt_idx" ON "EmailDelivery"("userId", "createdAt");
CREATE INDEX "EmailDelivery_status_createdAt_idx" ON "EmailDelivery"("status", "createdAt");
CREATE INDEX "EmailDelivery_templateId_createdAt_idx" ON "EmailDelivery"("templateId", "createdAt");

ALTER TABLE "EmailPreference"
  ADD CONSTRAINT "EmailPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmailDelivery"
  ADD CONSTRAINT "EmailDelivery_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
