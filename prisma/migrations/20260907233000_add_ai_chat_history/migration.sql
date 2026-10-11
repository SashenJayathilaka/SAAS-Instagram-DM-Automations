CREATE TABLE "AiChatMessage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "context" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiChatMessage_userId_context_createdAt_idx"
  ON "AiChatMessage"("userId", "context", "createdAt");

ALTER TABLE "AiChatMessage"
  ADD CONSTRAINT "AiChatMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
