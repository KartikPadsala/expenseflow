import { create } from 'zustand';
import type { SyncStatus, SyncResult } from '../lib/sync-engine';

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
  lastResult: SyncResult | null;

  setStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
  setLastSync: (at: number, result: SyncResult) => void;
  setError: (error: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
  lastResult: null,

  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSync: (lastSyncAt, lastResult) => set({ lastSyncAt, lastResult, lastError: null }),
  setError: (lastError) => set({ lastError }),
}));
