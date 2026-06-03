import { useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { fullSync, flushQueue, getLastSyncAt, isSyncing } from '../lib/sync-engine';
import { getPendingCount } from '../lib/sync-queue';
import { useSyncStore } from '../store/sync.store';

const SYNC_INTERVAL_MS = 5 * 60 * 1_000; // 5 minutes

export function useSyncManager() {
  const { setStatus, setPendingCount, setLastSync, setError } = useSyncStore();
  const isOnlineRef = useRef(true);
  const lastSyncRef = useRef<number>(0);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSync = useCallback(
    async (reason: string) => {
      if (!isOnlineRef.current) {
        setStatus('offline');
        return;
      }
      if (isSyncing()) return;

      console.log(`[Sync] Triggered by: ${reason}`);
      setStatus('syncing');

      try {
        const result = await fullSync();
        const now = Date.now();
        lastSyncRef.current = now;
        setLastSync(now, result);
        setPendingCount(getPendingCount());
        setStatus('idle');
      } catch (err: any) {
        const msg = err?.message ?? 'Sync failed';
        setError(msg);
        setStatus('error');
        console.error('[Sync] Failed:', msg);
      }
    },
    [setStatus, setLastSync, setPendingCount, setError],
  );

  // Network state listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !isOnlineRef.current;
      isOnlineRef.current = state.isConnected === true && state.isInternetReachable !== false;

      if (isOnlineRef.current) {
        setStatus('idle');
        if (wasOffline) {
          // Just came back online — flush queue immediately
          runSync('network-restored');
        }
      } else {
        setStatus('offline');
      }
    });
    return unsubscribe;
  }, [runSync, setStatus]);

  // AppState listener — sync on foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const timeSinceSync = Date.now() - lastSyncRef.current;
        if (timeSinceSync > SYNC_INTERVAL_MS) {
          runSync('app-foreground');
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [runSync]);

  // Periodic sync timer
  useEffect(() => {
    syncTimerRef.current = setInterval(() => {
      runSync('periodic');
    }, SYNC_INTERVAL_MS);
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [runSync]);

  // Initial sync on mount
  useEffect(() => {
    runSync('mount');
    setPendingCount(getPendingCount());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { runSync };
}

/** Lightweight hook for any component that needs sync state */
export function useSyncStatus() {
  const { status, pendingCount, lastSyncAt, lastError, lastResult } = useSyncStore();
  return { status, pendingCount, lastSyncAt, lastError, lastResult };
}
