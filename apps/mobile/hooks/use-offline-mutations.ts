/**
 * Offline-aware mutation hooks.
 * When online: execute immediately via API (existing behavior).
 * When offline: optimistically update local state and enqueue for later sync.
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import {
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  type CreateExpenseInput,
} from './use-expenses';
import { useCreateGroup, useUpdateGroup, useDeleteGroup } from './use-groups';
import { enqueue } from '../lib/sync-queue';
import {
  upsertLocalExpense,
  markLocalExpenseDeleted,
  upsertLocalGroup,
  markLocalGroupDeleted,
} from '../lib/database';
import { getPendingCount } from '../lib/sync-queue';
import { useSyncStore } from '../store/sync.store';

function generateLocalId(prefix: string): string {
  return `${prefix}_local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

// ── Expense Offline Hooks ──────────────────────────────────────────

export function useOfflineCreateExpense() {
  const onlineMutation = useCreateExpense();
  const qc = useQueryClient();
  const { setPendingCount } = useSyncStore();

  const mutate = useCallback(
    async (
      input: CreateExpenseInput,
      callbacks?: { onSuccess?: (data: any) => void; onError?: (err: any) => void },
    ) => {
      const online = await isOnline();

      if (online) {
        onlineMutation.mutate(input, {
          onSuccess: callbacks?.onSuccess,
          onError: callbacks?.onError,
        });
        return;
      }

      // Offline path: create optimistic local record
      const localId = generateLocalId('expense');
      const localData = {
        ...input,
        id: localId,
        _isOptimistic: true,
        _localId: localId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      upsertLocalExpense(localId, localData, { isDirty: true });
      enqueue('CREATE_EXPENSE', 'expense', localId, { ...input, _localId: localId });
      setPendingCount(getPendingCount());

      // Optimistically update TanStack Query cache
      qc.setQueryData(['expenses', { page: 1, limit: 20 }], (old: any) => {
        if (!old) return old;
        return { ...old, data: [localData, ...(old.data ?? [])] };
      });

      callbacks?.onSuccess?.(localData);
    },
    [onlineMutation, qc, setPendingCount],
  );

  return { mutate, isPending: onlineMutation.isPending };
}

export function useOfflineUpdateExpense() {
  const onlineMutation = useUpdateExpense();
  const qc = useQueryClient();
  const { setPendingCount } = useSyncStore();

  const mutate = useCallback(
    async (
      input: { id: string } & CreateExpenseInput,
      callbacks?: { onSuccess?: (data: any) => void; onError?: (err: any) => void },
    ) => {
      const online = await isOnline();

      if (online) {
        onlineMutation.mutate(input, {
          onSuccess: callbacks?.onSuccess,
          onError: callbacks?.onError,
        });
        return;
      }

      // Offline: update local cache + enqueue
      const localData = {
        ...input,
        updatedAt: new Date().toISOString(),
        _isOptimistic: true,
      };
      upsertLocalExpense(input.id, localData, { isDirty: true });
      enqueue('UPDATE_EXPENSE', 'expense', input.id, input);
      setPendingCount(getPendingCount());

      // Update cache
      qc.setQueryData(['expenses', input.id], (old: any) => (old ? { ...old, ...localData } : old));
      qc.invalidateQueries({ queryKey: ['expenses'] });

      callbacks?.onSuccess?.(localData);
    },
    [onlineMutation, qc, setPendingCount],
  );

  return { mutate, isPending: onlineMutation.isPending };
}

export function useOfflineDeleteExpense() {
  const onlineMutation = useDeleteExpense();
  const qc = useQueryClient();
  const { setPendingCount } = useSyncStore();

  const mutate = useCallback(
    async (
      id: string,
      callbacks?: { onSuccess?: () => void; onError?: (err: any) => void },
    ) => {
      const online = await isOnline();

      if (online) {
        onlineMutation.mutate(id, {
          onSuccess: callbacks?.onSuccess,
          onError: callbacks?.onError,
        });
        return;
      }

      markLocalExpenseDeleted(id);
      enqueue('DELETE_EXPENSE', 'expense', id, { id });
      setPendingCount(getPendingCount());

      qc.invalidateQueries({ queryKey: ['expenses'] });
      callbacks?.onSuccess?.();
    },
    [onlineMutation, qc, setPendingCount],
  );

  return { mutate, isPending: onlineMutation.isPending };
}

// ── Group Offline Hooks ────────────────────────────────────────────

export function useOfflineCreateGroup() {
  const onlineMutation = useCreateGroup();
  const qc = useQueryClient();
  const { setPendingCount } = useSyncStore();

  const mutate = useCallback(
    async (
      input: { name: string; type?: string; currency?: string; description?: string },
      callbacks?: { onSuccess?: (data: any) => void; onError?: (err: any) => void },
    ) => {
      const online = await isOnline();

      if (online) {
        onlineMutation.mutate(input, {
          onSuccess: callbacks?.onSuccess,
          onError: callbacks?.onError,
        });
        return;
      }

      const localId = generateLocalId('group');
      const localData = {
        ...input,
        id: localId,
        _isOptimistic: true,
        _localId: localId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        memberCount: 1,
        expenseCount: 0,
      };
      upsertLocalGroup(localId, localData, { isDirty: true });
      enqueue('CREATE_GROUP', 'group', localId, { ...input, _localId: localId });
      setPendingCount(getPendingCount());

      qc.setQueryData(['groups'], (old: any[]) => [localData, ...(old ?? [])]);
      callbacks?.onSuccess?.(localData);
    },
    [onlineMutation, qc, setPendingCount],
  );

  return { mutate, isPending: onlineMutation.isPending };
}

export function useOfflineUpdateGroup() {
  const onlineMutation = useUpdateGroup();
  const qc = useQueryClient();
  const { setPendingCount } = useSyncStore();

  const mutate = useCallback(
    async (
      input: { id: string; name?: string; description?: string; currency?: string },
      callbacks?: { onSuccess?: (data: any) => void; onError?: (err: any) => void },
    ) => {
      const online = await isOnline();

      if (online) {
        onlineMutation.mutate(input, {
          onSuccess: callbacks?.onSuccess,
          onError: callbacks?.onError,
        });
        return;
      }

      const localData = { ...input, updatedAt: new Date().toISOString(), _isOptimistic: true };
      upsertLocalGroup(input.id, localData, { isDirty: true });
      enqueue('UPDATE_GROUP', 'group', input.id, input);
      setPendingCount(getPendingCount());

      qc.setQueryData(['groups', input.id], (old: any) => (old ? { ...old, ...localData } : old));
      qc.invalidateQueries({ queryKey: ['groups'] });
      callbacks?.onSuccess?.(localData);
    },
    [onlineMutation, qc, setPendingCount],
  );

  return { mutate, isPending: onlineMutation.isPending };
}
