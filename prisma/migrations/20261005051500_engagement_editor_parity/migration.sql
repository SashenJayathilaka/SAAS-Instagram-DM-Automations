ALTER TABLE "Listener" ADD COLUMN "openingDmFormat" TEXT NOT NULL DEFAULT 'BUTTON';
ALTER TABLE "Listener" ADD CONSTRAINT "Listener_openingDmFormat_check" CHECK ("openingDmFormat" IN ('BUTTON', 'QUICK_REPLY'));
ALTER TABLE "Listener" DROP CONSTRAINT "Listener_followUpDelayMinutes_check";
ALTER TABLE "Listener" ALTER COLUMN "followUpDelayMinutes" TYPE DOUBLE PRECISION;
ALTER TABLE "Listener" ADD CONSTRAINT "Listener_followUpDelayMinutes_check" CHECK ("followUpDelayMinutes" IN (0.5, 1, 5, 10, 15, 30, 60, 180, 360, 720));
ALTER TABLE "Automation" ADD COLUMN "stepDelays" JSONB;
