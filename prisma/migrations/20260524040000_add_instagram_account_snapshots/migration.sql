CREATE TABLE "InstagramAccountSnapshot" (
  "id" TEXT NOT NULL,
  "integrationId" UUID NOT NULL,
  "instagramId" TEXT,
  "username" TEXT,
  "profilePictureUrl" TEXT,
  "followersCount" INTEGER,
  "mediaCount" INTEGER,
  "accountType" TEXT,
  "source" TEXT NOT NULL DEFAULT 'meta_graph',
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InstagramAccountSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InstagramAccountSnapshot_integrationId_fetchedAt_idx"
  ON "InstagramAccountSnapshot"("integrationId", "fetchedAt");

CREATE INDEX "InstagramAccountSnapshot_instagramId_idx"
  ON "InstagramAccountSnapshot"("instagramId");

ALTER TABLE "InstagramAccountSnapshot"
  ADD CONSTRAINT "InstagramAccountSnapshot_integrationId_fkey"
  FOREIGN KEY ("integrationId")
  REFERENCES "Integrations"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
