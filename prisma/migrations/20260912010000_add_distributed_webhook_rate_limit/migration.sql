CREATE TABLE "WebhookRateLimitBucket" (
    "key" VARCHAR(64) NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookRateLimitBucket_pkey" PRIMARY KEY ("key", "windowStart")
);

CREATE INDEX "WebhookRateLimitBucket_updatedAt_idx" ON "WebhookRateLimitBucket"("updatedAt");
