ALTER TABLE "Conversation"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "emailCollectedAt" TIMESTAMP(3),
  ADD COLUMN "phone" TEXT;

-- Keep previously collected details with the same account-scoped contact.
UPDATE "Conversation" c SET "email" = details.email, "emailCollectedAt" = details."emailCollectedAt"
FROM (
  SELECT DISTINCT ON (a."integrationId", a."userId", l."igUserId")
    a."integrationId", a."userId", l."igUserId", l.email, l."emailCollectedAt"
  FROM "Lead" l JOIN "Automation" a ON a.id = l."automationId"
  WHERE l.email IS NOT NULL
  ORDER BY a."integrationId", a."userId", l."igUserId", l."emailCollectedAt" DESC NULLS LAST, l."createdAt" DESC, l.id DESC
) details
WHERE c."integrationId" = details."integrationId" AND c."userId" = details."userId" AND c."recipientIgId" = details."igUserId";

UPDATE "Conversation" c SET "phone" = details.phone
FROM (
  SELECT DISTINCT ON (a."integrationId", a."userId", l."igUserId")
    a."integrationId", a."userId", l."igUserId", l.phone
  FROM "Lead" l JOIN "Automation" a ON a.id = l."automationId"
  WHERE l.phone IS NOT NULL
  ORDER BY a."integrationId", a."userId", l."igUserId", l."createdAt" DESC, l.id DESC
) details
WHERE c."integrationId" = details."integrationId" AND c."userId" = details."userId" AND c."recipientIgId" = details."igUserId";
