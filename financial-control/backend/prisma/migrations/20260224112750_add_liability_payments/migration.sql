-- CreateTable
CREATE TABLE "liability_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "liabilityId" TEXT NOT NULL,
    "installmentsPaid" INTEGER,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "discountType" TEXT,
    "discountValue" DECIMAL(10,4),
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(12,2) NOT NULL,
    "accountId" TEXT,
    "categoryId" TEXT,
    "transactionId" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liability_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "liability_payments_transactionId_key" ON "liability_payments"("transactionId");

-- AddForeignKey
ALTER TABLE "liability_payments" ADD CONSTRAINT "liability_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liability_payments" ADD CONSTRAINT "liability_payments_liabilityId_fkey" FOREIGN KEY ("liabilityId") REFERENCES "liabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
