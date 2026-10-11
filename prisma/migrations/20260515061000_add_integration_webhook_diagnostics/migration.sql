ALTER TABLE "Integrations" ADD COLUMN "webhookAccountId" TEXT;
ALTER TABLE "Integrations" ADD COLUMN "pageId" TEXT;
ALTER TABLE "Integrations" ADD COLUMN "businessId" TEXT;
ALTER TABLE "Integrations" ADD COLUMN "webhookSubscriptionLastAttemptedAt" TIMESTAMP(3);
ALTER TABLE "Integrations" ADD COLUMN "webhookSubscriptionStatusCode" INTEGER;
ALTER TABLE "Integrations" ADD COLUMN "webhookSubscriptionSubscribed" BOOLEAN;
ALTER TABLE "Integrations" ADD COLUMN "webhookSubscriptionError" TEXT;
