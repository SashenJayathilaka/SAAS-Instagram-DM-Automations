-- Match the editor and server normalization: 0 disables delay, up to 23 hours.
BEGIN;
ALTER TABLE "Automation" DROP CONSTRAINT "Automation_deliveryDelaySeconds_check";
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_deliveryDelaySeconds_check"
  CHECK ("deliveryDelaySeconds" BETWEEN 0 AND 82800);
COMMIT;
