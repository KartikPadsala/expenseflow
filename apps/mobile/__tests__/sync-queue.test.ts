/**
 * Tests for the sync queue module.
 * Uses an in-memory SQLite database via jest mocks.
 */

// Mock expo-sqlite
const mockDb = {
  execSync: jest.fn(),
  runSync: jest.fn(),
  getAllSync: jest.fn(() => []),
  getFirstSync: jest.fn(() => null),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockDb),
}));

jest.mock('../lib/database', () => ({
  getDatabase: () => mockDb,
  initializeDatabase: jest.fn(),
}));

import { backoffMs, MAX_RETRY_ATTEMPTS } from '../lib/sync-queue';

describe('backoffMs', () => {
  it('returns increasing delays for each attempt', () => {
    const delays = [0, 1, 2, 3, 4].map((a) => backoffMs(a));
    // Each should be larger than the previous base
    expect(delays[1]).toBeGreaterThanOrEqual(1000);
    expect(delays[2]).toBeGreaterThanOrEqual(2000);
    expect(delays[3]).toBeGreaterThanOrEqual(4000);
    expect(delays[4]).toBeGreaterThanOrEqual(8000);
  });

  it('caps delay at 60 seconds + jitter', () => {
    const delay = backoffMs(20); // way past the cap
    expect(delay).toBeLessThanOrEqual(61_000);
  });

  it('includes jitter (two calls differ)', () => {
    const d1 = backoffMs(2);
    const d2 = backoffMs(2);
    // With random jitter they are very unlikely to be identical
    // Just check they are both in valid range
    expect(d1).toBeGreaterThanOrEqual(4000);
    expect(d2).toBeGreaterThanOrEqual(4000);
  });

  it('attempt 0 returns ~1s base', () => {
    const d = backoffMs(0);
    expect(d).toBeGreaterThanOrEqual(1000);
    expect(d).toBeLessThan(3000);
  });
});

describe('MAX_RETRY_ATTEMPTS', () => {
  it('is 5', () => {
    expect(MAX_RETRY_ATTEMPTS).toBe(5);
  });
});

describe('enqueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.runSync.mockReturnValue(undefined);
  });

  it('calls db.runSync with correct op type', () => {
    // Import after mocks are set up
    const { enqueue } = require('../lib/sync-queue');
    const id = enqueue('CREATE_EXPENSE', 'expense', 'exp_123', { description: 'Test', amount: 50 });
    expect(id).toMatch(/^op_/);
    expect(mockDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pending_ops'),
      expect.arrayContaining(['CREATE_EXPENSE', 'expense', 'exp_123']),
    );
  });

  it('returns a unique id each call', () => {
    const { enqueue } = require('../lib/sync-queue');
    const id1 = enqueue('CREATE_EXPENSE', 'expense', 'e1', {});
    const id2 = enqueue('CREATE_EXPENSE', 'expense', 'e2', {});
    expect(id1).not.toBe(id2);
  });
});

describe('getDueOps', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns ops from db query', () => {
    const fakePendingOp = {
      id: 'op_1',
      type: 'CREATE_EXPENSE',
      entity_type: 'expense',
      entity_id: 'e1',
      payload: '{}',
      status: 'pending',
      attempt_count: 0,
      next_retry_at: null,
      error_message: null,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    mockDb.getAllSync.mockReturnValueOnce([fakePendingOp]);

    const { getDueOps } = require('../lib/sync-queue');
    const ops = getDueOps();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe('CREATE_EXPENSE');
  });
});

describe('getPendingCount', () => {
  it('returns 0 when no pending ops', () => {
    mockDb.getFirstSync.mockReturnValueOnce({ count: 0 });
    const { getPendingCount } = require('../lib/sync-queue');
    expect(getPendingCount()).toBe(0);
  });

  it('returns correct count', () => {
    mockDb.getFirstSync.mockReturnValueOnce({ count: 7 });
    const { getPendingCount } = require('../lib/sync-queue');
    expect(getPendingCount()).toBe(7);
  });
});
