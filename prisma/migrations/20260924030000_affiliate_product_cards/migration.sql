ALTER TABLE "Listener" ADD COLUMN "cardSubtitle" TEXT;
CREATE TABLE "AutomationImage" (
 "id" UUID NOT NULL, "userId" UUID NOT NULL, "digest" TEXT NOT NULL,
 "data" BYTEA NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AutomationImage_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "AutomationImage_size_check" CHECK (octet_length("data") <= 524288),
 CONSTRAINT "AutomationImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AutomationImage_userId_digest_key" ON "AutomationImage"("userId", "digest");
CREATE INDEX "AutomationImage_userId_createdAt_idx" ON "AutomationImage"("userId", "createdAt");
