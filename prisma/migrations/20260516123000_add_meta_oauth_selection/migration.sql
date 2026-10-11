CREATE TABLE "MetaOAuthSelection" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "accounts" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MetaOAuthSelection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MetaOAuthSelection_userId_expiresAt_idx" ON "MetaOAuthSelection"("userId", "expiresAt");

ALTER TABLE "MetaOAuthSelection"
ADD CONSTRAINT "MetaOAuthSelection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

