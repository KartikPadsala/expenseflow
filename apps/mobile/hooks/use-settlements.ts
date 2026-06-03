import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface SettlementUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
}

export interface SettlementGroup {
  id: string;
  name: string;
  currency: string;
}

export interface Settlement {
  id: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  method: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  groupId?: string | null;
  createdAt: string;
  settledAt?: string | null;
  payer?: SettlementUser;
  payee?: SettlementUser;
  group?: SettlementGroup;
}

export interface CreateSettlementInput {
  payeeId: string;
  amount: number;
  currency: string;
  method?: string;
  groupId?: string;
  notes?: string;
}

export function useSettlements(params?: { groupId?: string; status?: string }) {
  return useQuery<Settlement[]>({
    queryKey: ['settlements', params],
    queryFn: async () => {
      const { data } = await api.get('/settlements', { params });
      return data.data ?? data;
    },
  });
}

export function useSettlement(id: string | undefined) {
  return useQuery<Settlement>({
    queryKey: ['settlements', id],
    queryFn: async () => {
      const { data } = await api.get(`/settlements/${id}`);
      return data.data ?? data;
    },
    enabled: !!id,
  });
}

export function useCreateSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSettlementInput) => {
      const { data } = await api.post('/settlements', input);
      return (data.data ?? data) as Settlement;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useCompleteSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/settlements/${id}/complete`);
      return (data.data ?? data) as Settlement;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['settlements', id] });
      qc.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}

export function useCancelSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/settlements/${id}/cancel`);
      return (data.data ?? data) as Settlement;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['settlements', id] });
      qc.invalidateQueries({ queryKey: ['settlements'] });
    },
  });
}

export function useBulkSettle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { groupId: string; settlements: Array<{ payeeId: string; amount: number; currency: string }> }) => {
      const { data } = await api.post('/settlements/bulk', body);
      return (data.data ?? data) as Settlement[];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
