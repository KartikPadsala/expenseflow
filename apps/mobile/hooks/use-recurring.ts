import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface RecurringParticipant {
  userId: string;
  owedAmount?: number;
  sharePercent?: number;
  shares?: number;
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  splitMethod: string;
  nextDueDate: string;
  endDate?: string | null;
  isActive: boolean;
  notes?: string | null;
  groupId?: string | null;
  categoryId?: string | null;
  paidById?: string | null;
  participantsJson: RecurringParticipant[];
  group?: { id: string; name: string; currency: string } | null;
  category?: { id: string; name: string; icon: string; color: string } | null;
  createdBy?: { id: string; displayName: string; avatarUrl?: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringInput {
  description: string;
  amount: number;
  currency: string;
  frequency: string;
  splitMethod: string;
  startDate: string;
  endDate?: string;
  groupId?: string;
  categoryId?: string;
  paidById?: string;
  notes?: string;
  participants: RecurringParticipant[];
}

export function useRecurringExpenses() {
  return useQuery<RecurringExpense[]>({
    queryKey: ['recurring'],
    queryFn: async () => {
      const { data } = await api.get('/recurring');
      return data.data ?? data;
    },
  });
}

export function useRecurringExpense(id: string | undefined) {
  return useQuery<RecurringExpense>({
    queryKey: ['recurring', id],
    queryFn: async () => {
      const { data } = await api.get(`/recurring/${id}`);
      return data.data ?? data;
    },
    enabled: !!id,
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRecurringInput) => {
      const { data } = await api.post('/recurring', input);
      return (data.data ?? data) as RecurringExpense;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<CreateRecurringInput> & { id: string }) => {
      const { data } = await api.patch(`/recurring/${id}`, body);
      return (data.data ?? data) as RecurringExpense;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['recurring', vars.id] });
      qc.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

export function usePauseRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/recurring/${id}/pause`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useResumeRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/recurring/${id}/resume`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recurring/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}
