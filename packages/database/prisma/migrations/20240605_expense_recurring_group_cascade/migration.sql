-- Fix C1: Expense.group — add ON DELETE SET NULL so deleting a group doesn't 500
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_groupId_fkey";
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fix C2: RecurringExpense.group — same
ALTER TABLE "RecurringExpense" DROP CONSTRAINT IF EXISTS "RecurringExpense_groupId_fkey";
ALTER TABLE "RecurringExpense"
  ADD CONSTRAINT "RecurringExpense_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fix RecurringExpense.paidBy — SET NULL when a user is deleted (payer is optional)
ALTER TABLE "RecurringExpense" DROP CONSTRAINT IF EXISTS "RecurringExpense_paidById_fkey";
ALTER TABLE "RecurringExpense"
  ADD CONSTRAINT "RecurringExpense_paidById_fkey"
  FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
