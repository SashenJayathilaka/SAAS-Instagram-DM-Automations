-- Add an editable consent step and follower-request copy without changing
-- existing automation rows or removing the legacy delivery columns.
ALTER TABLE "Listener"
ADD COLUMN "openingDmText" TEXT,
ADD COLUMN "openingDmButtonText" TEXT,
ADD COLUMN "followRequestDmText" TEXT,
ADD COLUMN "followRequestButtonText" TEXT;
