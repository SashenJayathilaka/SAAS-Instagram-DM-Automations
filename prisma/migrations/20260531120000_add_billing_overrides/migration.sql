-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "monthlyReplyLimitOverride" INTEGER,
ADD COLUMN "activeCampaignLimitOverride" INTEGER,
ADD COLUMN "connectedAccountLimitOverride" INTEGER,
ADD COLUMN "aiReplyLimitOverride" INTEGER,
ADD COLUMN "overrideReason" TEXT,
ADD COLUMN "overrideExpiresAt" TIMESTAMP(3);
