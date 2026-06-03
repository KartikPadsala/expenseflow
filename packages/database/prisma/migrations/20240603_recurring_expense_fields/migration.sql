-- AlterTable: Add new fields to RecurringExpense
ALTER TABLE "RecurringExpense" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "RecurringExpense" ADD COLUMN IF NOT EXISTS "paidById" TEXT;
ALTER TABLE "RecurringExpense" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "RecurringExpense" ADD COLUMN IF NOT EXISTS "participantsJson" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "RecurringExpense" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
