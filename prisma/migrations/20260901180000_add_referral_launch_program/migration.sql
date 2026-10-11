-- CreateEnum
CREATE TYPE "REFERRAL_ATTRIBUTION_STATUS" AS ENUM ('SIGNED_UP', 'CONNECTED', 'QUALIFIED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "REFERRAL_REWARD_STATUS" AS ENUM ('PENDING', 'APPLIED', 'REVERSED');

-- AlterTable
ALTER TABLE "Subscription"
ADD COLUMN "welcomeTrialStartedAt" TIMESTAMP(3),
ADD COLUMN "welcomeTrialEndsAt" TIMESTAMP(3),
ADD COLUMN "welcomeTrialReplyLimit" INTEGER;

-- CreateTable
CREATE TABLE "ReferralPartner" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "founderRank" INTEGER,
    "qualifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralAttribution" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnerId" UUID NOT NULL,
    "referredUserId" UUID NOT NULL,
    "status" "REFERRAL_ATTRIBUTION_STATUS" NOT NULL DEFAULT 'SIGNED_UP',
    "connectedAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "firstPaidInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralReward" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "partnerId" UUID NOT NULL,
    "attributionId" UUID NOT NULL,
    "qualifyingInvoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL DEFAULT 900,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "status" "REFERRAL_REWARD_STATUS" NOT NULL DEFAULT 'PENDING',
    "stripeBalanceTransactionId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPartner_userId_key" ON "ReferralPartner"("userId");
CREATE UNIQUE INDEX "ReferralPartner_code_key" ON "ReferralPartner"("code");
CREATE UNIQUE INDEX "ReferralPartner_founderRank_key" ON "ReferralPartner"("founderRank");
CREATE INDEX "ReferralPartner_createdAt_idx" ON "ReferralPartner"("createdAt");
CREATE UNIQUE INDEX "ReferralAttribution_referredUserId_key" ON "ReferralAttribution"("referredUserId");
CREATE UNIQUE INDEX "ReferralAttribution_firstPaidInvoiceId_key" ON "ReferralAttribution"("firstPaidInvoiceId");
CREATE INDEX "ReferralAttribution_partnerId_status_idx" ON "ReferralAttribution"("partnerId", "status");
CREATE INDEX "ReferralAttribution_createdAt_idx" ON "ReferralAttribution"("createdAt");
CREATE UNIQUE INDEX "ReferralReward_attributionId_key" ON "ReferralReward"("attributionId");
CREATE UNIQUE INDEX "ReferralReward_qualifyingInvoiceId_key" ON "ReferralReward"("qualifyingInvoiceId");
CREATE UNIQUE INDEX "ReferralReward_stripeBalanceTransactionId_key" ON "ReferralReward"("stripeBalanceTransactionId");
CREATE INDEX "ReferralReward_partnerId_status_idx" ON "ReferralReward"("partnerId", "status");
CREATE INDEX "ReferralReward_createdAt_idx" ON "ReferralReward"("createdAt");

-- AddForeignKey
ALTER TABLE "ReferralPartner" ADD CONSTRAINT "ReferralPartner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_attributionId_fkey" FOREIGN KEY ("attributionId") REFERENCES "ReferralAttribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing connected Free users receive the same launch trial as new users.
UPDATE "Subscription" AS subscription
SET
  "welcomeTrialStartedAt" = CURRENT_TIMESTAMP,
  "welcomeTrialEndsAt" = CURRENT_TIMESTAMP + INTERVAL '14 days',
  "welcomeTrialReplyLimit" = 500
WHERE subscription."plan" = 'FREE'
  AND subscription."welcomeTrialStartedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "Integrations" AS integration
    WHERE integration."userId" = subscription."userId"
      AND integration."name" = 'INSTAGRAM'
      AND integration."status" = 'CONNECTED'
      AND integration."reconnectRequired" = false
  );
