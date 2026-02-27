-- CreateEnum
CREATE TYPE "InvestmentMovementType" AS ENUM ('CONTRIBUTION', 'WITHDRAWAL', 'DIVIDEND', 'JCP', 'INTEREST', 'BONUS', 'SPLIT');

-- CreateTable: investment_movements
CREATE TABLE "investment_movements" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InvestmentMovementType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(15,6),
    "unitPrice" DECIMAL(12,6),
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investment_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable: investment_allocation_targets
CREATE TABLE "investment_allocation_targets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InvestmentPositionType" NOT NULL,
    "targetPct" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "investment_allocation_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investment_movements_positionId_idx" ON "investment_movements"("positionId");
CREATE INDEX "investment_movements_userId_idx" ON "investment_movements"("userId");
CREATE UNIQUE INDEX "investment_allocation_targets_userId_type_key" ON "investment_allocation_targets"("userId", "type");

-- AddForeignKey
ALTER TABLE "investment_movements" ADD CONSTRAINT "investment_movements_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "investment_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_movements" ADD CONSTRAINT "investment_movements_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investment_allocation_targets" ADD CONSTRAINT "investment_allocation_targets_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
