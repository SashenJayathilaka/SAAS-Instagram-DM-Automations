CREATE TABLE "EditorialPost" (
  "slug" TEXT NOT NULL,
  "draft" JSONB NOT NULL,
  "published" JSONB,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EditorialPost_pkey" PRIMARY KEY ("slug")
);
