-- Uploads were persisted successfully, but saving their listener was rejected by
-- the pre-attachment constraint. Preserve every existing format and allow the
-- attachment format used by comment, story and incoming-DM automations.
BEGIN;
ALTER TABLE "Listener" DROP CONSTRAINT "Listener_responseFormat_check";
ALTER TABLE "Listener" ADD CONSTRAINT "Listener_responseFormat_check"
  CHECK ("responseFormat" IN ('TEXT', 'LINK', 'MEDIA', 'PRODUCT_CARD', 'ATTACHMENT'));
COMMIT;
