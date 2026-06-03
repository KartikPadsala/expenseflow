import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('expenseflow.db');
  }
  return _db;
}

export const SCHEMA_VERSION = 1;

const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS pending_ops (
    id          TEXT    PRIMARY KEY,
    type        TEXT    NOT NULL,
    entity_type TEXT    NOT NULL,
    entity_id   TEXT    NOT NULL,
    payload     TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at INTEGER,
    error_message TEXT,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS local_expenses (
    id                TEXT    PRIMARY KEY,
    server_id         TEXT,
    data              TEXT    NOT NULL,
    is_dirty          INTEGER NOT NULL DEFAULT 0,
    is_deleted        INTEGER NOT NULL DEFAULT 0,
    server_updated_at TEXT,
    local_updated_at  INTEGER NOT NULL,
    synced_at         INTEGER
  );

  CREATE TABLE IF NOT EXISTS local_groups (
    id                TEXT    PRIMARY KEY,
    server_id         TEXT,
    data              TEXT    NOT NULL,
    is_dirty          INTEGER NOT NULL DEFAULT 0,
    is_deleted        INTEGER NOT NULL DEFAULT 0,
    server_updated_at TEXT,
    local_updated_at  INTEGER NOT NULL,
    synced_at         INTEGER
  );

  CREATE TABLE IF NOT EXISTS sync_metadata (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pending_ops_status ON pending_ops (status, next_retry_at);
  CREATE INDEX IF NOT EXISTS idx_pending_ops_entity ON pending_ops (entity_type, entity_id);
  `,
];

export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();

  // Run in WAL mode for better concurrent performance
  db.execSync('PRAGMA journal_mode=WAL;');
  db.execSync('PRAGMA foreign_keys=ON;');

  // Get current schema version
  db.execSync(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL DEFAULT 0);`);

  const rows = db.getAllSync<{ version: number }>('SELECT version FROM schema_version LIMIT 1;');
  let currentVersion = rows.length > 0 ? rows[0].version : 0;

  // Apply migrations
  while (currentVersion < MIGRATIONS.length) {
    const migration = MIGRATIONS[currentVersion];
    db.execSync(migration);
    currentVersion++;
  }

  // Upsert schema version
  db.runSync(
    'INSERT INTO schema_version (version) VALUES (?) ON CONFLICT DO UPDATE SET version = ?',
    [SCHEMA_VERSION, SCHEMA_VERSION],
  );
}

// ── Sync Metadata ──────────────────────────────────────────────────────
export function getSyncMeta(key: string): string | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM sync_metadata WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function setSyncMeta(key: string, value: string): void {
  const db = getDatabase();
  db.runSync(
    'INSERT INTO sync_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    [key, value, value],
  );
}

// ── Local Expense Cache ────────────────────────────────────────────
export interface LocalExpenseRow {
  id: string;
  server_id: string | null;
  data: string; // JSON
  is_dirty: number;
  is_deleted: number;
  server_updated_at: string | null;
  local_updated_at: number;
  synced_at: number | null;
}

export function upsertLocalExpense(
  id: string,
  data: object,
  opts: { serverId?: string; isDirty?: boolean; serverUpdatedAt?: string; syncedAt?: number } = {},
): void {
  const db = getDatabase();
  const now = Date.now();
  db.runSync(
    `INSERT INTO local_expenses (id, server_id, data, is_dirty, is_deleted, server_updated_at, local_updated_at, synced_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       data = excluded.data,
       server_id = COALESCE(excluded.server_id, server_id),
       is_dirty = excluded.is_dirty,
       server_updated_at = COALESCE(excluded.server_updated_at, server_updated_at),
       local_updated_at = excluded.local_updated_at,
       synced_at = COALESCE(excluded.synced_at, synced_at)`,
    [
      id,
      opts.serverId ?? null,
      JSON.stringify(data),
      opts.isDirty ? 1 : 0,
      opts.serverUpdatedAt ?? null,
      now,
      opts.syncedAt ?? null,
    ],
  );
}

export function getLocalExpense(id: string): LocalExpenseRow | null {
  const db = getDatabase();
  return db.getFirstSync<LocalExpenseRow>(
    'SELECT * FROM local_expenses WHERE id = ? AND is_deleted = 0',
    [id],
  ) ?? null;
}

export function getAllLocalExpenses(): LocalExpenseRow[] {
  const db = getDatabase();
  return db.getAllSync<LocalExpenseRow>(
    'SELECT * FROM local_expenses WHERE is_deleted = 0 ORDER BY local_updated_at DESC',
  );
}

export function markLocalExpenseDeleted(id: string): void {
  const db = getDatabase();
  db.runSync('UPDATE local_expenses SET is_deleted = 1, local_updated_at = ? WHERE id = ?', [Date.now(), id]);
}

// ── Local Group Cache ──────────────────────────────────────────────
export interface LocalGroupRow {
  id: string;
  server_id: string | null;
  data: string;
  is_dirty: number;
  is_deleted: number;
  server_updated_at: string | null;
  local_updated_at: number;
  synced_at: number | null;
}

export function upsertLocalGroup(
  id: string,
  data: object,
  opts: { serverId?: string; isDirty?: boolean; serverUpdatedAt?: string; syncedAt?: number } = {},
): void {
  const db = getDatabase();
  const now = Date.now();
  db.runSync(
    `INSERT INTO local_groups (id, server_id, data, is_dirty, is_deleted, server_updated_at, local_updated_at, synced_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       data = excluded.data,
       server_id = COALESCE(excluded.server_id, server_id),
       is_dirty = excluded.is_dirty,
       server_updated_at = COALESCE(excluded.server_updated_at, server_updated_at),
       local_updated_at = excluded.local_updated_at,
       synced_at = COALESCE(excluded.synced_at, synced_at)`,
    [
      id,
      opts.serverId ?? null,
      JSON.stringify(data),
      opts.isDirty ? 1 : 0,
      opts.serverUpdatedAt ?? null,
      now,
      opts.syncedAt ?? null,
    ],
  );
}

export function getAllLocalGroups(): LocalGroupRow[] {
  const db = getDatabase();
  return db.getAllSync<LocalGroupRow>(
    'SELECT * FROM local_groups WHERE is_deleted = 0 ORDER BY local_updated_at DESC',
  );
}

export function markLocalGroupDeleted(id: string): void {
  const db = getDatabase();
  db.runSync('UPDATE local_groups SET is_deleted = 1, local_updated_at = ? WHERE id = ?', [Date.now(), id]);
}
