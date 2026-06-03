import api from './api';
import {
  enqueue,
  getDueOps,
  markProcessing,
  markDone,
  markFailed,
  resetStuckProcessing,
  pruneOldOps,
  type OpType,
  type PendingOp,
} from './sync-queue';
import {
  upsertLocalExpense,
  markLocalExpenseDeleted,
  upsertLocalGroup,
  markLocalGroupDeleted,
  getSyncMeta,
  setSyncMeta,
} from './database';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncResult {
  processed: number;
  failed: number;
  conflicts: number;
}

/** Conflict resolution strategy */
export type ConflictStrategy = 'server-wins' | 'client-wins' | 'last-write-wins';

const CONFLICT_STRATEGY: ConflictStrategy = 'server-wins';

/** How we determine if an HTTP error is retryable */
function isRetryableError(error: unknown): boolean {
  const status = (error as any)?.response?.status;
  if (!status) return true; // network error, always retry
  // 4xx (except 409 conflict, 404 not-found which have special handling) are NOT retried
  if (status >= 400 && status < 500) return false;
  return true; // 5xx or network
}

/** Map server-returned entity to local cache format */
function serverExpenseToLocal(e: any) {
  return {
    ...e,
    amount: Number(e.amount),
    date: !e.date
      ? e.date
      : typeof e.date === 'string'
      ? e.date
      : new Date(e.date).toISOString(),
  };
}

/**
 * Execute a single pending operation against the API.
 * Returns the server's response data on success, throws on failure.
 */
async function executeOp(op: PendingOp, result: SyncResult): Promise<unknown> {
  const payload = JSON.parse(op.payload);

  switch (op.type as OpType) {
    // ── Expenses ────────────────────────────────────────────────────
    case 'CREATE_EXPENSE': {
      const { data } = await api.post('/expenses', payload);
      const serverExpense = data.data;
      // Replace optimistic local ID with real server ID
      if (payload._localId && payload._localId !== serverExpense.id) {
        markLocalExpenseDeleted(payload._localId);
      }
      upsertLocalExpense(serverExpense.id, serverExpenseToLocal(serverExpense), {
        serverId: serverExpense.id,
        serverUpdatedAt: serverExpense.updatedAt,
        syncedAt: Date.now(),
        isDirty: false,
      });
      return serverExpense;
    }

    case 'UPDATE_EXPENSE': {
      const { _localId, ...updatePayload } = payload;
      try {
        const { data } = await api.patch(`/expenses/${op.entity_id}`, updatePayload);
        const serverExpense = data.data;
        upsertLocalExpense(serverExpense.id, serverExpenseToLocal(serverExpense), {
          serverId: serverExpense.id,
          serverUpdatedAt: serverExpense.updatedAt,
          syncedAt: Date.now(),
          isDirty: false,
        });
        return serverExpense;
      } catch (err: any) {
        if (err?.response?.status === 409) {
          // Conflict: server version is newer — count and resolve
          result.conflicts++;
          return await resolveExpenseConflict(op.entity_id, updatePayload);
        }
        throw err;
      }
    }

    case 'DELETE_EXPENSE': {
      try {
        await api.delete(`/expenses/${op.entity_id}`);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          // Already deleted on server — treat as success
          console.log(`[SyncEngine] Expense ${op.entity_id} already deleted on server`);
        } else {
          throw err;
        }
      }
      markLocalExpenseDeleted(op.entity_id);
      return null;
    }

    // ── Groups ───────────────────────────────────────────────────────
    case 'CREATE_GROUP': {
      const { data } = await api.post('/groups', payload);
      const serverGroup = data.data;
      if (payload._localId && payload._localId !== serverGroup.id) {
        markLocalGroupDeleted(payload._localId);
      }
      upsertLocalGroup(serverGroup.id, serverGroup, {
        serverId: serverGroup.id,
        serverUpdatedAt: serverGroup.updatedAt,
        syncedAt: Date.now(),
        isDirty: false,
      });
      return serverGroup;
    }

    case 'UPDATE_GROUP': {
      const { _localId, ...updatePayload } = payload;
      try {
        const { data } = await api.patch(`/groups/${op.entity_id}`, updatePayload);
        const serverGroup = data.data;
        upsertLocalGroup(serverGroup.id, serverGroup, {
          serverId: serverGroup.id,
          serverUpdatedAt: serverGroup.updatedAt,
          syncedAt: Date.now(),
          isDirty: false,
        });
        return serverGroup;
      } catch (err: any) {
        if (err?.response?.status === 409) {
          result.conflicts++;
          return await resolveGroupConflict(op.entity_id, updatePayload);
        }
        throw err;
      }
    }

    default:
      throw new Error(`Unknown op type: ${op.type}`);
  }
}

/**
 * Conflict resolution for expense updates.
 * Strategy: server-wins → fetch server version, discard local changes.
 * Logs the conflict for debugging.
 */
async function resolveExpenseConflict(entityId: string, _localPayload: object): Promise<unknown> {
  console.warn(`[SyncEngine] Conflict on expense ${entityId} — applying ${CONFLICT_STRATEGY}`);

  if (CONFLICT_STRATEGY === 'server-wins') {
    const { data } = await api.get(`/expenses/${entityId}`);
    const serverExpense = data.data;
    upsertLocalExpense(serverExpense.id, serverExpenseToLocal(serverExpense), {
      serverId: serverExpense.id,
      serverUpdatedAt: serverExpense.updatedAt,
      syncedAt: Date.now(),
      isDirty: false,
    });
    setSyncMeta(`conflict_expense_${entityId}`, JSON.stringify({ resolvedAt: Date.now(), strategy: CONFLICT_STRATEGY }));
    return serverExpense;
  }

  // client-wins: retry with force flag (not implemented on this backend, skip)
  return null;
}

async function resolveGroupConflict(entityId: string, _localPayload: object): Promise<unknown> {
  console.warn(`[SyncEngine] Conflict on group ${entityId} — applying ${CONFLICT_STRATEGY}`);
  const { data } = await api.get(`/groups/${entityId}`);
  const serverGroup = data.data;
  upsertLocalGroup(serverGroup.id, serverGroup, {
    serverId: serverGroup.id,
    serverUpdatedAt: serverGroup.updatedAt,
    syncedAt: Date.now(),
    isDirty: false,
  });
  return serverGroup;
}

// ── Public API ────────────────────────────────────────────────────

let _isSyncing = false;

/**
 * Flush the pending operation queue.
 * Processes ops sequentially to avoid race conditions.
 * Returns a summary of results.
 */
export async function flushQueue(): Promise<SyncResult> {
  if (_isSyncing) {
    console.log('[SyncEngine] Already syncing, skipping');
    return { processed: 0, failed: 0, conflicts: 0 };
  }

  _isSyncing = true;
  const result: SyncResult = { processed: 0, failed: 0, conflicts: 0 };

  try {
    resetStuckProcessing();
    const ops = getDueOps(50);

    if (ops.length === 0) {
      return result;
    }

    console.log(`[SyncEngine] Flushing ${ops.length} pending operations`);

    for (const op of ops) {
      markProcessing(op.id);
      try {
        await executeOp(op, result);
        markDone(op.id);
        result.processed++;
        console.log(`[SyncEngine] ✓ ${op.type} ${op.entity_id}`);
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
        const newAttempt = op.attempt_count + 1;

        if (!isRetryableError(err)) {
          // Non-retryable (4xx): mark as permanently failed immediately
          markFailed(op.id, errorMsg, 99);
          result.failed++;
          console.error(`[SyncEngine] ✗ PERMANENT ${op.type} ${op.entity_id}: ${errorMsg}`);
        } else {
          markFailed(op.id, errorMsg, newAttempt);
          result.failed++;
          console.error(`[SyncEngine] ✗ ${op.type} ${op.entity_id} (attempt ${newAttempt}): ${errorMsg}`);
        }
      }
    }

    pruneOldOps();
    setSyncMeta('last_sync_at', String(Date.now()));
    setSyncMeta('last_sync_result', JSON.stringify(result));

    return result;
  } finally {
    _isSyncing = false;
  }
}

/** Pull latest data from server and update local cache */
export async function pullFromServer(): Promise<void> {
  const [expensesRes, groupsRes] = await Promise.allSettled([
    api.get('/expenses', { params: { limit: 50, page: 1 } }),
    api.get('/groups'),
  ]);

  if (expensesRes.status === 'fulfilled') {
    const expenses: any[] = expensesRes.value.data?.data?.data ?? [];
    for (const e of expenses) {
      upsertLocalExpense(e.id, serverExpenseToLocal(e), {
        serverId: e.id,
        serverUpdatedAt: e.updatedAt,
        syncedAt: Date.now(),
        isDirty: false,
      });
    }
  }

  if (groupsRes.status === 'fulfilled') {
    const groups: any[] = groupsRes.value.data?.data ?? [];
    for (const g of groups) {
      upsertLocalGroup(g.id, g, {
        serverId: g.id,
        serverUpdatedAt: g.updatedAt,
        syncedAt: Date.now(),
        isDirty: false,
      });
    }
  }

  setSyncMeta('last_pull_at', String(Date.now()));
}

/** Full sync: flush queue then pull from server */
export async function fullSync(): Promise<SyncResult> {
  const result = await flushQueue();
  await pullFromServer();
  return result;
}

export function getLastSyncAt(): number | null {
  const val = getSyncMeta('last_sync_at');
  return val ? parseInt(val, 10) : null;
}

export function isSyncing(): boolean {
  return _isSyncing;
}
