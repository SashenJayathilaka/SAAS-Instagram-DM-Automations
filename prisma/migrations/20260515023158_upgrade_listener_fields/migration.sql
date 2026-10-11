-- AlterTable
ALTER TABLE "Automation" ALTER COLUMN "matchingMode" SET DEFAULT 'CONTAINS';

-- AlterTable
ALTER TABLE "Listener" ADD COLUMN     "commentReply2" TEXT,
ADD COLUMN     "commentReply3" TEXT,
ADD COLUMN     "ctaButtonTitle" TEXT;
