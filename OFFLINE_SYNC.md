# Offline Sync Architecture — ExpenseFlow

## Overview

ExpenseFlow supports full offline-first operation for expense and group management. Users can create, update, and delete expenses and groups without an internet connection. Changes are queued locally and automatically synchronized when connectivity is restored.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       React UI Layer                          │
│   useOfflineCreateExpense / useOfflineUpdateExpense /        │
│   useOfflineCreateGroup / useOfflineUpdateGroup              │
│   (online → direct API;  offline → local cache + queue)     │
└──────────────────┬───────────────────────────────────────────┘
                   │ enqueue(type, entityType, entityId, payload)
┌──────────────────▼───────────────────────────────────────────┐
│                   SyncQueue (SQLite)                          │
│   Table: pending_ops                                         │
│   - id, type, entity_type, entity_id, payload (JSON)        │
│   - status: pending | processing | failed | done            │
│   - attempt_count, next_retry_at (exponential backoff)      │
│   - error_message                                            │
└──────────────────┬───────────────────────────────────────────┘
                   │ flushQueue() → sequential execution
┌──────────────────▼───────────────────────────────────────────┐
│                   SyncEngine                                  │
│   - Processes ops one-at-a-time (no concurrency)            │
│   - Conflict detection (409 → server-wins strategy)         │
│   - 404 on DELETE → treat as success (already gone)         │
│   - Updates local cache after server response               │
└──────────────────┬───────────────────────────────────────────┘
                   │ HTTP with JWT Bearer token
┌──────────────────▼───────────────────────────────────────────┐
│                   NestJS Backend API                          │
└──────────────────────────────────────────────────────────────┘
```

## SQLite Schema

### `pending_ops`
Stores operations waiting to be synced to the server.

| Column | Type | Description |
|---|---|---|
| id | TEXT PK | `op_{timestamp}_{random}` |
| type | TEXT | `CREATE_EXPENSE \| UPDATE_EXPENSE \| DELETE_EXPENSE \| CREATE_GROUP \| UPDATE_GROUP` |
| entity_type | TEXT | `expense \| group` |
| entity_id | TEXT | Local or server ID of the entity |
| payload | TEXT | JSON-stringified request body |
| status | TEXT | `pending \| processing \| failed \| done` |
| attempt_count | INTEGER | Number of retry attempts made |
| next_retry_at | INTEGER | Unix timestamp (ms) for next retry |
| error_message | TEXT | Last error string |
| created_at | INTEGER | Unix timestamp (ms) |
| updated_at | INTEGER | Unix timestamp (ms) |

### `local_expenses` / `local_groups`
Local cache of server-side entities for offline read access.

| Column | Type | Description |
|---|---|---|
| id | TEXT PK | Local optimistic ID or server ID |
| server_id | TEXT | Server ID (null if not yet synced) |
| data | TEXT | Full entity JSON |
| is_dirty | INTEGER | 1 if has pending local changes |
| is_deleted | INTEGER | 1 if soft-deleted locally |
| server_updated_at | TEXT | Server `updatedAt` for conflict detection |
| local_updated_at | INTEGER | Last local modification timestamp |
| synced_at | INTEGER | When last successfully synced |

### `sync_metadata`
Key-value store for sync state.

| Key | Description |
|---|---|
| `last_sync_at` | Timestamp of last successful queue flush |
| `last_pull_at` | Timestamp of last pull from server |
| `last_sync_result` | JSON result of last sync run |
| `conflict_expense_{id}` | Conflict resolution record |

## Conflict Resolution

**Strategy: Server Wins (default)**

When the server returns HTTP 409 (Conflict) for an update:

1. Fetch the current server version of the entity
2. Replace the local cache with the server version
3. Mark the op as `done` (discard local change)
4. Log the conflict in `sync_metadata`

**Rationale**: Most conflicts occur when the same entity is edited on two devices before syncing. The server is the source of truth and has the most recent accepted state. The alternative (`client-wins`) risks overwriting legitimate changes from other users.

**Graceful 404 Handling**: If a DELETE op receives a 404, the entity was already deleted — the op is marked `done` without error.

## Retry Logic

Exponential backoff with jitter:

```
delay(attempt) = min(60_000, 1_000 × 2^attempt) + random(0, 1_000) ms
```

| Attempt | Base delay | Max with jitter |
|---|---|---|
| 0 | 1s | ~2s |
| 1 | 2s | ~3s |
| 2 | 4s | ~5s |
| 3 | 8s | ~9s |
| 4 | 16s | ~17s |
| 5 | 32s | ~33s |

After `MAX_RETRY_ATTEMPTS = 5`, the op is permanently failed (marked with `attempt_count = 99`). Non-retryable errors (HTTP 4xx except 404/409) are permanently failed immediately on the first attempt.

## Sync Triggers

The `useSyncManager` hook (mounted in `SyncProvider`) triggers sync in three scenarios:

| Trigger | Condition |
|---|---|
| **Network restored** | `NetInfo` fires `isConnected = true` after being offline |
| **App foreground** | `AppState` changes to `'active'` AND last sync was >5 minutes ago |
| **Periodic** | Timer fires every 5 minutes while app is running |

## Local ID Strategy

When creating an entity offline, a temporary local ID is generated: `expense_local_{timestamp}_{random}`.

When the server creates the real entity, the sync engine:
1. Marks the local ID as deleted in the local cache
2. Inserts a new record with the server's real ID
3. Invalidates TanStack Query caches so the UI refreshes

## Queued Operation Types

| Op Type | HTTP Method | Notes |
|---|---|---|
| `CREATE_EXPENSE` | `POST /expenses` | Optimistic local ID → replaced with server ID |
| `UPDATE_EXPENSE` | `PATCH /expenses/:id` | 409 → server-wins conflict resolution |
| `DELETE_EXPENSE` | `DELETE /expenses/:id` | 404 → treated as success |
| `CREATE_GROUP` | `POST /groups` | Same as CREATE_EXPENSE |
| `UPDATE_GROUP` | `PATCH /groups/:id` | Same as UPDATE_EXPENSE |

## Status Bar Indicator

`SyncProvider` renders a status bar at the top of the screen:

- **Gray** — Offline (shows pending count)
- **Blue** — Syncing in progress
- **Red** — Sync error (will retry automatically)
- **Hidden** — Online and idle

## Known Limitations

1. **Pull-based sync only** — no real-time push (no WebSocket). Server changes from other devices are only fetched on sync trigger.
2. **No delta sync** — pulls only the most recent page (50 items). Old items may fall out of local cache.
3. **Single-device conflict resolution** — "server wins" is conservative. Future: add `updatedAt` comparison for `last-write-wins`.
4. **No background fetch** — sync only runs while the app is in the foreground or just becoming active. iOS background fetch is not configured.
5. **OCR, analytics, notifications** are online-only — not queued.
