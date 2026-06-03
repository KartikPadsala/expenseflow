/**
 * Tests for the sync engine.
 * Mocks the API and SQLite database.
 */

const mockDb = {
  execSync: jest.fn(),
  runSync: jest.fn(),
  getAllSync: jest.fn(() => []),
  getFirstSync: jest.fn(() => null),
};

jest.mock('expo-sqlite', () => ({ openDatabaseSync: jest.fn(() => mockDb) }));
jest.mock('../lib/database', () => ({
  getDatabase: () => mockDb,
  initializeDatabase: jest.fn(),
  upsertLocalExpense: jest.fn(),
  markLocalExpenseDeleted: jest.fn(),
  upsertLocalGroup: jest.fn(),
  markLocalGroupDeleted: jest.fn(),
  getSyncMeta: jest.fn(() => null),
  setSyncMeta: jest.fn(),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('../lib/api', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    patch: (...args: any[]) => mockPatch(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

jest.mock('../lib/sync-queue', () => ({
  getDueOps: jest.fn(() => []),
  markProcessing: jest.fn(),
  markDone: jest.fn(),
  markFailed: jest.fn(),
  resetStuckProcessing: jest.fn(),
  pruneOldOps: jest.fn(),
  getPendingCount: jest.fn(() => 0),
  MAX_RETRY_ATTEMPTS: 5,
  backoffMs: jest.fn((n: number) => 1000 * Math.pow(2, n)),
}));

import { flushQueue, getLastSyncAt } from '../lib/sync-engine';

describe('flushQueue', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns empty result when no ops', async () => {
    const { getDueOps } = require('../lib/sync-queue');
    (getDueOps as jest.Mock).mockReturnValue([]);

    const result = await flushQueue();
    expect(result).toEqual({ processed: 0, failed: 0, conflicts: 0 });
  });

  it('processes CREATE_EXPENSE and marks done', async () => {
    const { getDueOps, markDone, markProcessing } = require('../lib/sync-queue');
    const op = {
      id: 'op_1',
      type: 'CREATE_EXPENSE',
      entity_type: 'expense',
      entity_id: 'local_exp_1',
      payload: JSON.stringify({ description: 'Test', amount: 50, currency: 'USD', date: '2024-01-01', splitMethod: 'EQUAL', participants: [{ userId: 'u1' }] }),
      status: 'pending',
      attempt_count: 0,
      next_retry_at: null,
      error_message: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    (getDueOps as jest.Mock).mockReturnValue([op]);

    mockPost.mockResolvedValue({
      data: { data: { id: 'server_exp_1', description: 'Test', amount: 50, updatedAt: new Date().toISOString(), participants: [] } },
    });

    const result = await flushQueue();
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(markProcessing).toHaveBeenCalledWith('op_1');
    expect(markDone).toHaveBeenCalledWith('op_1');
  });

  it('marks failed on API 400 error (non-retryable)', async () => {
    const { getDueOps, markFailed } = require('../lib/sync-queue');
    const op = {
      id: 'op_2',
      type: 'UPDATE_EXPENSE',
      entity_type: 'expense',
      entity_id: 'exp_server_1',
      payload: JSON.stringify({ description: 'Bad update', amount: -1 }),
      status: 'pending',
      attempt_count: 0,
      next_retry_at: null,
      error_message: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    (getDueOps as jest.Mock).mockReturnValue([op]);

    const apiError = { response: { status: 400, data: { message: 'Validation failed' } } };
    mockPatch.mockRejectedValue(apiError);

    const result = await flushQueue();
    expect(result.failed).toBe(1);
    // Permanently failed (attempt=99)
    expect(markFailed).toHaveBeenCalledWith('op_2', expect.any(String), 99);
  });

  it('marks failed with retry on 500 error', async () => {
    const { getDueOps, markFailed } = require('../lib/sync-queue');
    const op = {
      id: 'op_3',
      type: 'UPDATE_EXPENSE',
      entity_type: 'expense',
      entity_id: 'exp_1',
      payload: JSON.stringify({ description: 'test' }),
      status: 'pending',
      attempt_count: 1,
      next_retry_at: null,
      error_message: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    (getDueOps as jest.Mock).mockReturnValue([op]);
    mockPatch.mockRejectedValue({ response: { status: 500, data: { message: 'Server error' } } });

    await flushQueue();
    // attempt_count was 1, new attempt = 2 (retryable)
    expect(markFailed).toHaveBeenCalledWith('op_3', expect.any(String), 2);
  });

  it('processes DELETE_EXPENSE and handles 404 gracefully', async () => {
    const { getDueOps, markDone } = require('../lib/sync-queue');
    const op = {
      id: 'op_4',
      type: 'DELETE_EXPENSE',
      entity_type: 'expense',
      entity_id: 'exp_gone',
      payload: JSON.stringify({ id: 'exp_gone' }),
      status: 'pending',
      attempt_count: 0,
      next_retry_at: null,
      error_message: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    (getDueOps as jest.Mock).mockReturnValue([op]);
    mockDelete.mockRejectedValue({ response: { status: 404 } });

    const result = await flushQueue();
    expect(result.processed).toBe(1);
    expect(markDone).toHaveBeenCalledWith('op_4');
  });

  it('counts conflicts', async () => {
    const { getDueOps } = require('../lib/sync-queue');
    const op = {
      id: 'op_5',
      type: 'UPDATE_EXPENSE',
      entity_type: 'expense',
      entity_id: 'exp_conflict',
      payload: JSON.stringify({ description: 'conflict' }),
      status: 'pending',
      attempt_count: 0,
      next_retry_at: null,
      error_message: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    (getDueOps as jest.Mock).mockReturnValue([op]);
    // First call (PATCH) returns 409
    mockPatch.mockRejectedValueOnce({ response: { status: 409 } });
    // Second call (GET for server-wins) succeeds
    mockGet.mockResolvedValueOnce({ data: { data: { id: 'exp_conflict', description: 'server version', updatedAt: new Date().toISOString() } } });

    const result = await flushQueue();
    expect(result.conflicts).toBeGreaterThanOrEqual(1);
  });
});

describe('getLastSyncAt', () => {
  it('returns null when never synced', () => {
    const { getSyncMeta } = require('../lib/database');
    (getSyncMeta as jest.Mock).mockReturnValue(null);
    expect(getLastSyncAt()).toBeNull();
  });

  it('returns parsed timestamp', () => {
    const ts = Date.now();
    const { getSyncMeta } = require('../lib/database');
    (getSyncMeta as jest.Mock).mockReturnValue(String(ts));
    expect(getLastSyncAt()).toBe(ts);
  });
});
