-- AlterEnum: add LAST_DAY and BUSINESS_DAYS to RecurrenceType
ALTER TYPE "RecurrenceType" ADD VALUE 'LAST_DAY';
ALTER TYPE "RecurrenceType" ADD VALUE 'BUSINESS_DAYS';

-- AlterTable: add isPaused and isSkipped to transactions
ALTER TABLE "transactions" ADD COLUMN "isPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "transactions" ADD COLUMN "isSkipped" BOOLEAN NOT NULL DEFAULT false;
