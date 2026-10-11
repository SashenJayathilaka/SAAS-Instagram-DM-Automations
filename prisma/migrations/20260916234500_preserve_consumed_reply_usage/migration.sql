CREATE TABLE "DeletedReplyUsage" (
  id UUID PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "DeletedReplyUsage_userId_createdAt_idx" ON "DeletedReplyUsage"("userId", "createdAt");

CREATE FUNCTION ap3k_preserve_consumed_replies() RETURNS trigger AS $$
BEGIN
  INSERT INTO "DeletedReplyUsage" (id, "userId", "createdAt")
  SELECT m.id, OLD."userId", m."createdAt" FROM "MessageLog" m
  WHERE m."automationId" = OLD.id AND m.status = 'SENT'
    AND m."messageType" IN ('COMMENT_REPLY', 'DM')
    AND EXISTS (SELECT 1 FROM "User" u WHERE u.id = OLD."userId")
  ON CONFLICT (id) DO NOTHING;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER ap3k_preserve_consumed_replies_before_delete BEFORE DELETE ON "Automation" FOR EACH ROW EXECUTE FUNCTION ap3k_preserve_consumed_replies();
