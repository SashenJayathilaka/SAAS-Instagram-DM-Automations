ALTER TABLE "Integrations"
  ADD COLUMN "metaAppScopedUserId" TEXT;

CREATE INDEX "Integrations_metaAppScopedUserId_idx"
  ON "Integrations"("metaAppScopedUserId");
