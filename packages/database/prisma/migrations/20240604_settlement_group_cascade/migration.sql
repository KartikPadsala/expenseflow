-- Change Settlement.groupId FK from RESTRICT (default) to SET NULL
-- so that deleting a group does not fail with a FK constraint violation.
-- Existing settlement records are preserved; their groupId becomes NULL.

ALTER TABLE "Settlement" DROP CONSTRAINT IF EXISTS "Settlement_groupId_fkey";

ALTER TABLE "Settlement"
  ADD CONSTRAINT "Settlement_groupId_fkey"
  FOREIGN KEY ("groupId")
  REFERENCES "Group"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
