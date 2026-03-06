-- DropForeignKey
ALTER TABLE "consent_records" DROP CONSTRAINT "consent_records_userId_fkey";

-- AlterTable
ALTER TABLE "admin_accounts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "breach_records" ALTER COLUMN "dataTypes" DROP DEFAULT;

-- CreateTable
CREATE TABLE "checkout_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planCode" "PlanCode" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_promotions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCouponId" TEXT NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 10,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "shownAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "sentByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checkout_attempts_stripeSessionId_key" ON "checkout_attempts"("stripeSessionId");

-- CreateIndex
CREATE INDEX "checkout_attempts_userId_completedAt_idx" ON "checkout_attempts"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "checkout_attempts_createdAt_completedAt_idx" ON "checkout_attempts"("createdAt", "completedAt");

-- CreateIndex
CREATE INDEX "user_promotions_userId_redeemedAt_expiresAt_idx" ON "user_promotions"("userId", "redeemedAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_promotions" ADD CONSTRAINT "user_promotions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "deleted_accounts_scheduledAt" RENAME TO "deleted_accounts_scheduledAt_idx";
