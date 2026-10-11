ALTER TABLE "Automation" ADD COLUMN "postConfig" JSONB;
ALTER TABLE "AutomationTrackedLink" ADD COLUMN "firstClickedAt" TIMESTAMP(3);
ALTER TABLE "AutomationFollowerState" ADD COLUMN "lastCheckedAt" TIMESTAMP(3);
CREATE INDEX "AutomationFollowerState_pending_check_idx" ON "AutomationFollowerState" ("lastCheckedAt", "lastNotFollowingAt") WHERE "followedAt" IS NULL AND NOT "firstFollowing";
