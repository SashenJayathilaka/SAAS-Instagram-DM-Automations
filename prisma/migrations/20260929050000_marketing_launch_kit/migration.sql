CREATE TABLE "MarketingLead" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "consentVersion" TEXT NOT NULL,
  "confirmationHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "unsubscribedAt" TIMESTAMP(3),
  "suppressedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingLead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketingLead_email_key" ON "MarketingLead"("email");
CREATE INDEX "MarketingLead_confirmedAt_completedAt_idx" ON "MarketingLead"("confirmedAt", "completedAt");
CREATE TABLE "MarketingRateLimit" (
  "key" VARCHAR(64) NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingRateLimit_pkey" PRIMARY KEY ("key", "windowStart")
);
CREATE INDEX "MarketingRateLimit_updatedAt_idx" ON "MarketingRateLimit"("updatedAt");
