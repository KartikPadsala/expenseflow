import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react-native';
import { initializeDatabase } from '../lib/database';
import { useSyncManager, useSyncStatus } from '../hooks/use-sync';

function SyncStatusBar() {
  const { status, pendingCount } = useSyncStatus();

  if (status === 'offline') {
    return (
      <View style={[styles.bar, styles.offline]}>
        <WifiOff size={12} color="#ffffff" />
        <Text style={styles.barText}>
          Offline{pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
        </Text>
      </View>
    );
  }

  if (status === 'syncing') {
    return (
      <View style={[styles.bar, styles.syncing]}>
        <RefreshCw size={12} color="#ffffff" />
        <Text style={styles.barText}>Syncing…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.bar, styles.error]}>
        <AlertCircle size={12} color="#ffffff" />
        <Text style={styles.barText}>Sync error · will retry</Text>
      </View>
    );
  }

  return null;
}

interface SyncProviderProps {
  children: React.ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  // Initialize DB once on mount
  useEffect(() => {
    initializeDatabase().catch((err) => {
      console.error('[SyncProvider] DB init failed:', err);
    });
  }, []);

  // Start sync manager
  useSyncManager();

  return (
    <View style={styles.container}>
      <SyncStatusBar />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  offline: { backgroundColor: '#6b7280' },
  syncing: { backgroundColor: '#3b82f6' },
  error: { backgroundColor: '#ef4444' },
  barText: { fontSize: 11, color: '#ffffff', fontWeight: '500' },
});
