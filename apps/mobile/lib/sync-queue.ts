import { getDatabase } from './database';

export type OpType =
  | 'CREATE_EXPENSE'
  | 'UPDATE_EXPENSE'
  | 'DELETE_EXPENSE'
  | 'CREATE_GROUP'
  | 'UPDATE_GROUP';

export type EntityType = 'expense' | 'group';

export type OpStatus = 'pending' | 'processing' | 'failed' | 'done';

export interface PendingOp {
  id: string;
  type: OpType;
  entity_type: EntityType;
  entity_id: string;
  payload: string; // JSON stringified
  status: OpStatus;
  attempt_count: number;
  next_retry_at: number | null;
  error_message: string | null;
  created_at: number;
  updated_at: number;
}

/** Maximum number of retry attempts before giving up */
export const MAX_RETRY_ATTEMPTS = 5;

/**
 * Exponential backoff with jitter.
 * attempt 0 → ~1s, 1 → ~2s, 2 → ~4s, 3 → ~8s, 4 → ~16s, capped at 60s
 */
export function backoffMs(attempt: number): number {
  const base = Math.min(60_000, 1_000 * Math.pow(2, attempt));
  const jitter = Math.random() * 1_000;
  return Math.round(base + jitter);
}

function generateId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function enqueue(
  type: OpType,
  entityType: EntityType,
  entityId: string,
  payload: object,
): string {
  const db = getDatabase();
  const id = generateId();
  const now = Date.now();
  db.runSync(
    `INSERT INTO pending_ops
       (id, type, entity_type, entity_id, payload, status, attempt_count, next_retry_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
    [id, type, entityType, entityId, JSON.stringify(payload), now, now, now],
  );
  return id;
}

/** Return pending ops that are due for processing, oldest first */
export function getDueOps(limit = 20): PendingOp[] {
  const db = getDatabase();
  const now = Date.now();
  return db.getAllSync<PendingOp>(
    `SELECT * FROM pending_ops
     WHERE status IN ('pending', 'failed')
       AND (next_retry_at IS NULL OR next_retry_at <= ?)
     ORDER BY created_at ASC
     LIMIT ?`,
    [now, limit],
  );
}

export function markProcessing(id: string): void {
  const db = getDatabase();
  db.runSync(
    "UPDATE pending_ops SET status = 'processing', updated_at = ? WHERE id = ?",
    [Date.now(), id],
  );
}

export function markDone(id: string): void {
  const db = getDatabase();
  db.runSync(
    "UPDATE pending_ops SET status = 'done', updated_at = ? WHERE id = ?",
    [Date.now(), id],
  );
}

export function markFailed(id: string, errorMessage: string, attempt: number): void {
  const db = getDatabase();
  const now = Date.now();

  if (attempt >= MAX_RETRY_ATTEMPTS) {
    // Permanently failed — mark as failed with no retry
    db.runSync(
      `UPDATE pending_ops
       SET status = 'failed', attempt_count = ?, error_message = ?, next_retry_at = NULL, updated_at = ?
       WHERE id = ?`,
      [attempt, `PERMANENT: ${errorMessage}`, now, id],
    );
  } else {
    const retryAt = now + backoffMs(attempt);
    db.runSync(
      `UPDATE pending_ops
       SET status = 'failed', attempt_count = ?, error_message = ?, next_retry_at = ?, updated_at = ?
       WHERE id = ?`,
      [attempt, errorMessage, retryAt, now, id],
    );
  }
}

export function resetStuckProcessing(): void {
  // Called on app start — reset any ops stuck in 'processing' from a previous crash
  const db = getDatabase();
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1_000;
  db.runSync(
    `UPDATE pending_ops SET status = 'pending', next_retry_at = ?
     WHERE status = 'processing' AND updated_at < ?`,
    [Date.now(), fiveMinutesAgo],
  );
}

export function getPendingCount(): number {
  const db = getDatabase();
  const row = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM pending_ops WHERE status IN ('pending', 'failed', 'processing')",
  );
  return row?.count ?? 0;
}

export function getFailedOps(): PendingOp[] {
  const db = getDatabase();
  return db.getAllSync<PendingOp>(
    "SELECT * FROM pending_ops WHERE status = 'failed' AND (next_retry_at IS NULL OR attempt_count >= ?) ORDER BY created_at ASC",
    [MAX_RETRY_ATTEMPTS],
  );
}

/** Remove permanently failed ops older than 7 days */
export function pruneOldOps(): void {
  const db = getDatabase();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1_000;
  db.runSync(
    "DELETE FROM pending_ops WHERE status = 'done' AND updated_at < ?",
    [sevenDaysAgo],
  );
}
