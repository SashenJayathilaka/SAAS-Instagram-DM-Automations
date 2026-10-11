-- AlterTable
ALTER TABLE "Integrations" ADD COLUMN     "planLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Automation" ADD COLUMN     "integrationId" UUID;

-- AlterTable
ALTER TABLE "AiChatMessage" ADD COLUMN     "integrationId" UUID;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "integrationId" UUID;

-- CreateTable
CREATE TABLE "InstagramAiConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "integrationId" UUID NOT NULL,
    "aiRepliesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiCommentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'Helpful Instagram assistant',
    "brandVoice" TEXT NOT NULL DEFAULT 'Friendly, clear, concise, and human',
    "guardrails" TEXT,
    "defaultTone" TEXT NOT NULL DEFAULT 'FRIENDLY',
    "protectionRules" JSONB,
    "knowledge" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAiConfig_integrationId_key" ON "InstagramAiConfig"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_integrationId_recipientIgId_key" ON "Conversation"("integrationId", "recipientIgId");

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAiConfig" ADD CONSTRAINT "InstagramAiConfig_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the single-account association used by the previous release.
CREATE FUNCTION ap3k_legacy_instagram_account(owner_id UUID) RETURNS UUID AS $$
  SELECT id FROM "Integrations" WHERE "userId" = owner_id AND name = 'INSTAGRAM'
  ORDER BY (status = 'CONNECTED' AND NOT "reconnectRequired") DESC, "createdAt" DESC, id ASC LIMIT 1;
$$ LANGUAGE SQL STABLE;

UPDATE "Automation" SET "integrationId" = ap3k_legacy_instagram_account("userId") WHERE "integrationId" IS NULL;
UPDATE "Conversation" SET "integrationId" = ap3k_legacy_instagram_account("userId") WHERE "integrationId" IS NULL;
UPDATE "AiChatMessage" SET "integrationId" = ap3k_legacy_instagram_account("userId") WHERE "integrationId" IS NULL AND context = 'PLAYGROUND';

INSERT INTO "InstagramAiConfig" (id, "userId", "integrationId", "aiRepliesEnabled", "aiCommentsEnabled", role, "brandVoice", guardrails, "defaultTone", "protectionRules", knowledge, "createdAt", "updatedAt")
SELECT id, "userId", ap3k_legacy_instagram_account("userId"), "aiRepliesEnabled", "aiCommentsEnabled", role, "brandVoice", guardrails, "defaultTone", "protectionRules", knowledge, "createdAt", "updatedAt"
FROM "AiWorkspaceConfig" WHERE ap3k_legacy_instagram_account("userId") IS NOT NULL;

-- Old deployment writes during the rollout remain attached to their original
-- account. The new application supplies the scope explicitly.
CREATE FUNCTION ap3k_fill_legacy_instagram_scope() RETURNS trigger AS $$
BEGIN
  IF NEW."integrationId" IS NULL THEN
    NEW."integrationId" := ap3k_legacy_instagram_account(NEW."userId");
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER ap3k_scope_legacy_automation BEFORE INSERT ON "Automation" FOR EACH ROW EXECUTE FUNCTION ap3k_fill_legacy_instagram_scope();
CREATE TRIGGER ap3k_scope_legacy_conversation BEFORE INSERT ON "Conversation" FOR EACH ROW EXECUTE FUNCTION ap3k_fill_legacy_instagram_scope();
CREATE TRIGGER ap3k_scope_legacy_ai_chat BEFORE INSERT ON "AiChatMessage" FOR EACH ROW WHEN (NEW.context = 'PLAYGROUND') EXECUTE FUNCTION ap3k_fill_legacy_instagram_scope();

CREATE INDEX "Automation_userId_integrationId_idx" ON "Automation"("userId", "integrationId");
CREATE INDEX "Conversation_userId_integrationId_lastMessageAt_idx" ON "Conversation"("userId", "integrationId", "lastMessageAt");
CREATE INDEX "AiChatMessage_userId_integrationId_context_idx" ON "AiChatMessage"("userId", "integrationId", context);

-- Mirror edits from the previous deployment until the account-aware release is live.
CREATE FUNCTION ap3k_mirror_legacy_ai_config() RETURNS trigger AS $$
DECLARE account_id UUID;
BEGIN
  account_id := ap3k_legacy_instagram_account(NEW."userId");
  IF account_id IS NOT NULL THEN
    INSERT INTO "InstagramAiConfig" ("userId", "integrationId", "aiRepliesEnabled", "aiCommentsEnabled", role, "brandVoice", guardrails, "defaultTone", "protectionRules", knowledge, "createdAt", "updatedAt")
    VALUES (NEW."userId", account_id, NEW."aiRepliesEnabled", NEW."aiCommentsEnabled", NEW.role, NEW."brandVoice", NEW.guardrails, NEW."defaultTone", NEW."protectionRules", NEW.knowledge, NEW."createdAt", NEW."updatedAt")
    ON CONFLICT ("integrationId") DO UPDATE SET
      "aiRepliesEnabled" = EXCLUDED."aiRepliesEnabled", "aiCommentsEnabled" = EXCLUDED."aiCommentsEnabled",
      role = EXCLUDED.role, "brandVoice" = EXCLUDED."brandVoice", guardrails = EXCLUDED.guardrails,
      "defaultTone" = EXCLUDED."defaultTone", "protectionRules" = EXCLUDED."protectionRules", knowledge = EXCLUDED.knowledge, "updatedAt" = EXCLUDED."updatedAt";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER ap3k_mirror_legacy_ai AFTER INSERT OR UPDATE ON "AiWorkspaceConfig" FOR EACH ROW EXECUTE FUNCTION ap3k_mirror_legacy_ai_config();
