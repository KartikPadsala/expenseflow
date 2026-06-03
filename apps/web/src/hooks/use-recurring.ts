import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

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
  expenses?: any[];
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

export type UpdateRecurringInput = Partial<Omit<CreateRecurringInput, 'startDate' | 'participants'>> & {
  participants?: RecurringParticipant[];
};

function unwrap(data: any): any {
  return data?.data ?? data;
}

export function useRecurringExpenses() {
  const { isAuthenticated } = useAuthStore();
  return useQuery<RecurringExpense[]>({
    queryKey: ['recurring'],
    queryFn: async () => {
      const { data } = await api.get('/recurring');
      return unwrap(data);
    },
    enabled: isAuthenticated(),
  });
}

export function useRecurringExpense(id: string | undefined) {
  return useQuery<RecurringExpense>({
    queryKey: ['recurring', id],
    queryFn: async () => {
      const { data } = await api.get(`/recurring/${id}`);
      return unwrap(data);
    },
    enabled: !!id,
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRecurringInput) => {
      const { data } = await api.post('/recurring', input);
      return unwrap(data) as RecurringExpense;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateRecurringInput & { id: string }) => {
      const { data } = await api.patch(`/recurring/${id}`, body);
      return unwrap(data) as RecurringExpense;
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
      return unwrap(data);
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['recurring', id] });
      qc.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

export function useResumeRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/recurring/${id}/resume`);
      return unwrap(data);
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['recurring', id] });
      qc.invalidateQueries({ queryKey: ['recurring'] });
    },
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
