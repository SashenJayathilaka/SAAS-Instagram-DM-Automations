-- AP3K now keeps one encrypted configuration per supported provider and
-- activates exactly one of those provider rows at the application layer.
ALTER TABLE "AiProviderConfig"
  ALTER COLUMN "id" SET DEFAULT 'google',
  ALTER COLUMN "providerName" SET DEFAULT 'Google AI Studio',
  ALTER COLUMN "baseUrl" SET DEFAULT 'https://generativelanguage.googleapis.com/v1beta/openai',
  ALTER COLUMN "model" SET DEFAULT 'gemini-3.5-flash-lite';

-- Retain the old encrypted record for rollback/audit safety, but never route
-- new AP3K AI traffic to it.
UPDATE "AiProviderConfig"
SET "enabled" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'primary';

INSERT INTO "AiProviderConfig" (
  "id", "enabled", "providerName", "baseUrl", "model", "createdAt", "updatedAt"
)
VALUES
  ('google', false, 'Google AI Studio', 'https://generativelanguage.googleapis.com/v1beta/openai', 'gemini-3.5-flash-lite', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('groq', false, 'Groq Cloud', 'https://api.groq.com/openai/v1', 'openai/gpt-oss-20b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('openrouter', false, 'OpenRouter', 'https://openrouter.ai/api/v1', 'openrouter/free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
