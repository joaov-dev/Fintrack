-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('OUTLIER_SPEND', 'NEW_SUBSCRIPTION', 'CATEGORY_SPIKE', 'DUE_PAYMENT', 'BUDGET_AT_RISK', 'MICRO_GOAL_AT_RISK', 'MICRO_GOAL_BREACHED', 'NEGATIVE_CASHFLOW', 'HIGH_FIXED_COSTS', 'STAGNANT_NET_WORTH', 'LOW_EMERGENCY_RESERVE', 'HIGH_CREDIT_DEPENDENCY', 'HIGH_CC_UTILIZATION');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('CRITICAL', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('ACTIVE', 'DISMISSED', 'SNOOZED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MicroGoalStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'BREACHED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MicroGoalScopeType" AS ENUM ('CATEGORY', 'TOTAL_SPEND');

-- CreateTable
CREATE TABLE "insights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "severity" "InsightSeverity" NOT NULL,
    "status" "InsightStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "explanation" TEXT,
    "context" JSONB NOT NULL DEFAULT '{}',
    "cta" JSONB,
    "dedupeKey" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "micro_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopeType" "MicroGoalScopeType" NOT NULL,
    "scopeRefId" TEXT,
    "limitAmount" DECIMAL(12,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "MicroGoalStatus" NOT NULL DEFAULT 'ON_TRACK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "micro_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insights_userId_dedupeKey_key" ON "insights"("userId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "micro_goals" ADD CONSTRAINT "micro_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
