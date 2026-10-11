-- Deploy only after the account-aware stage-1 runtime is READY.
DROP INDEX IF EXISTS "Conversation_userId_recipientIgId_key";
DROP TRIGGER ap3k_mirror_legacy_ai ON "AiWorkspaceConfig";
DROP FUNCTION ap3k_mirror_legacy_ai_config();
DROP TRIGGER ap3k_scope_legacy_automation ON "Automation";
DROP TRIGGER ap3k_scope_legacy_conversation ON "Conversation";
DROP TRIGGER ap3k_scope_legacy_ai_chat ON "AiChatMessage";
DROP FUNCTION ap3k_fill_legacy_instagram_scope();
DROP FUNCTION ap3k_legacy_instagram_account(UUID);
