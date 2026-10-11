ALTER TABLE "Integrations"
ADD COLUMN "pageName" TEXT,
ADD COLUMN "igAccountSource" TEXT,
ADD COLUMN "oauthResolutionDiagnostics" JSONB;

