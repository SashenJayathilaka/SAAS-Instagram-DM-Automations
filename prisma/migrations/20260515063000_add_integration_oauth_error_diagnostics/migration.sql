ALTER TABLE "Integrations" ADD COLUMN "oauthLastError" TEXT;
ALTER TABLE "Integrations" ADD COLUMN "oauthLastErrorAt" TIMESTAMP(3);
ALTER TABLE "Integrations" ADD COLUMN "oauthLastErrorSource" TEXT;
