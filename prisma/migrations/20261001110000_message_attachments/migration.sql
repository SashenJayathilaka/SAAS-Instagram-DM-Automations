CREATE TABLE "AutomationAttachment" (
 "id" UUID NOT NULL, "userId" UUID NOT NULL, "storageKey" TEXT NOT NULL, "uploadId" TEXT, "filename" TEXT NOT NULL, "contentType" TEXT NOT NULL, "mediaType" TEXT NOT NULL, "size" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AutomationAttachment_pkey" PRIMARY KEY ("id"), CONSTRAINT "AutomationAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "AutomationAttachment_size_check" CHECK ("size" > 0 AND "size" <= 25000000), CONSTRAINT "AutomationAttachment_status_check" CHECK ("status" IN ('PENDING','READY','FAILED'))
);
CREATE UNIQUE INDEX "AutomationAttachment_storageKey_key" ON "AutomationAttachment"("storageKey");
CREATE UNIQUE INDEX "AutomationAttachment_uploadId_key" ON "AutomationAttachment"("uploadId");
CREATE INDEX "AutomationAttachment_userId_status_createdAt_idx" ON "AutomationAttachment"("userId", "status", "createdAt");
