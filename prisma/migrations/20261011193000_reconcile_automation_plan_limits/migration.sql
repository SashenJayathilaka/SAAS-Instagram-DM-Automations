-- Repair accounts downgraded before runtime entitlement reconciliation existed.
-- No automations, contacts, or configuration are deleted. Old application builds
-- also honor active=false, making this data-only migration rolling-deploy safe.
BEGIN;
SELECT id FROM "User" u WHERE EXISTS (SELECT 1 FROM "Automation" a WHERE a."userId" = u.id AND a.active AND a."archivedAt" IS NULL) ORDER BY id FOR UPDATE;
CREATE TEMP TABLE ap3k_plan_pauses ON COMMIT DROP AS
WITH candidates AS (
  SELECT a.id, a."userId", a."createdAt", COALESCE(s.plan::text, 'FREE') AS plan,
    CASE
      WHEN i."planLocked" THEN 'account'
      WHEN COALESCE(s.plan::text, 'FREE') = 'FREE' AND (
        a."followGateRequired" OR a."triggerMode" = 'INTENT_MATCH' OR
        a."storyConfig"->>'scope' = 'NEXT' OR l.listener::text = 'SMARTAI' OR
        l."aiReplyEnabled" OR l."aiDmReplyEnabled" OR l."emailCaptureEnabled" OR
        l."phoneCaptureEnabled" OR l."followUpEnabled" OR
        (l."flowDefinition" IS NOT NULL AND l."flowDefinition" <> 'null'::jsonb)
      ) THEN 'features'
    END AS reason
  FROM "Automation" a
  LEFT JOIN "Subscription" s ON s."userId" = a."userId"
  LEFT JOIN "Integrations" i ON i.id = a."integrationId"
  LEFT JOIN "Listener" l ON l."automationId" = a.id
  WHERE a.active AND a."archivedAt" IS NULL
), ranked AS (
  SELECT *, COUNT(*) FILTER (WHERE reason IS NULL) OVER (
    PARTITION BY "userId" ORDER BY "createdAt", id
  ) AS eligible_rank FROM candidates
)
SELECT id, COALESCE(reason, 'limit') AS reason FROM ranked
WHERE reason IS NOT NULL OR (plan = 'FREE' AND eligible_rank > 5);

UPDATE "Automation" a SET active = false,
  "reviewReason" = CASE WHEN a."needsReview" THEN a."reviewReason" ELSE
    'Paused after a plan change: ' || CASE p.reason
      WHEN 'account' THEN 'this Instagram account is outside your plan''s account allowance. Upgrade before reactivating.'
      WHEN 'features' THEN 'this automation uses paid features. Upgrade or remove those features before reactivating.'
      ELSE 'your active automation allowance was exceeded. Pause another automation, then activate this one, or upgrade.'
    END END
FROM ap3k_plan_pauses p WHERE a.id = p.id;
UPDATE "AutomationDeliveryJob" SET status = 'CANCELLED', payload = '{}'::jsonb
WHERE "automationId" IN (SELECT id FROM ap3k_plan_pauses) AND status = 'PENDING';
UPDATE "AutomationEngagementJob" SET status = 'CANCELLED'
WHERE "automationId" IN (SELECT id FROM ap3k_plan_pauses) AND status IN ('PENDING', 'WAITING');
UPDATE "AutomationFlowSession" SET status = 'CANCELLED', "resumeAt" = NULL
WHERE "automationId" IN (SELECT id FROM ap3k_plan_pauses) AND status IN ('READY', 'WAITING', 'RUNNING', 'SCHEDULED');
UPDATE "AiConversationSession" SET status = 'CANCELLED'
WHERE "automationId" IN (SELECT id FROM ap3k_plan_pauses) AND status = 'ACTIVE';
COMMIT;
