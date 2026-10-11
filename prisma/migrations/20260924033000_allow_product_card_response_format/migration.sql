BEGIN;
ALTER TABLE "Listener" DROP CONSTRAINT "Listener_responseFormat_check";
ALTER TABLE "Listener" ADD CONSTRAINT "Listener_responseFormat_check"
  CHECK ("responseFormat" IN ('TEXT', 'LINK', 'MEDIA', 'PRODUCT_CARD'));
COMMIT;
