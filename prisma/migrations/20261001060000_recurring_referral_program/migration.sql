-- DropForeignKey
ALTER TABLE "ReferralPartner" DROP CONSTRAINT "ReferralPartner_userId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralAttribution" DROP CONSTRAINT "ReferralAttribution_referredUserId_fkey";

-- AlterTable
ALTER TABLE "ReferralPartner" ADD COLUMN     "eligibilityCheckedAt" TIMESTAMP(3),
ADD COLUMN     "eligibleUsername" TEXT,
ADD COLUMN     "followers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promoCode" TEXT,
ADD COLUMN     "promoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCouponId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ReferralAttribution" ADD COLUMN     "firstPeriodStart" TIMESTAMP(3),
ADD COLUMN     "programVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'LINK',
ALTER COLUMN "referredUserId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ReferralCommission" (
    "id" TEXT NOT NULL,
    "partnerId" UUID NOT NULL,
    "attributionId" UUID NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reversedCents" INTEGER NOT NULL DEFAULT 0,
    "basisCents" INTEGER NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralWithdrawal" (
    "id" TEXT NOT NULL,
    "partnerId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paypalEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "paymentReference" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralClick" (
    "id" TEXT NOT NULL,
    "partnerId" UUID NOT NULL,
    "visitorDayHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralInvite" (
    "id" TEXT NOT NULL,
    "partnerId" UUID NOT NULL,
    "recipient" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralInvoiceAdjustment" (
    "invoiceId" TEXT NOT NULL,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "chargedCents" INTEGER NOT NULL DEFAULT 0,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "fullReversal" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralInvoiceAdjustment_pkey" PRIMARY KEY ("invoiceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCommission_invoiceId_key" ON "ReferralCommission"("invoiceId");

-- CreateIndex
CREATE INDEX "ReferralCommission_partnerId_createdAt_idx" ON "ReferralCommission"("partnerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralWithdrawal_paymentReference_key" ON "ReferralWithdrawal"("paymentReference");

-- CreateIndex
CREATE INDEX "ReferralWithdrawal_partnerId_status_idx" ON "ReferralWithdrawal"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralClick_partnerId_visitorDayHash_key" ON "ReferralClick"("partnerId", "visitorDayHash");

-- CreateIndex
CREATE INDEX "ReferralInvite_partnerId_createdAt_idx" ON "ReferralInvite"("partnerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralInvite_partnerId_recipient_day_key" ON "ReferralInvite"("partnerId", "recipient", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPartner_promoCode_key" ON "ReferralPartner"("promoCode");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPartner_stripeCouponId_key" ON "ReferralPartner"("stripeCouponId");

-- AddForeignKey
ALTER TABLE "ReferralPartner" ADD CONSTRAINT "ReferralPartner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_attributionId_fkey" FOREIGN KEY ("attributionId") REFERENCES "ReferralAttribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralWithdrawal" ADD CONSTRAINT "ReferralWithdrawal_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralClick" ADD CONSTRAINT "ReferralClick_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralInvite" ADD CONSTRAINT "ReferralInvite_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve all previous referral promises; only future attributions use recurring terms.
ALTER TABLE "ReferralAttribution" ALTER COLUMN "programVersion" SET DEFAULT 2;
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_programVersion_check" CHECK ("programVersion" IN (1, 2));
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_source_check" CHECK ("source" IN ('LINK', 'PROMO'));
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_amounts_check" CHECK ("amountCents" >= 0 AND "basisCents" >= 0 AND "reversedCents" >= 0 AND "reversedCents" <= "amountCents" AND "currency" = 'usd');
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_period_check" CHECK ("periodEnd" > "periodStart");
ALTER TABLE "ReferralWithdrawal" ADD CONSTRAINT "ReferralWithdrawal_amount_check" CHECK ("amountCents" > 0);
ALTER TABLE "ReferralWithdrawal" ADD CONSTRAINT "ReferralWithdrawal_status_check" CHECK ("status" IN ('REQUESTED', 'PAID', 'CANCELED'));
CREATE UNIQUE INDEX "ReferralWithdrawal_one_requested_per_partner" ON "ReferralWithdrawal"("partnerId") WHERE "status" = 'REQUESTED';
