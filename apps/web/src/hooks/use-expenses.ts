import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ExpenseFilters {
  groupId?: string;
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  paidById?: string;
}

export function useExpenses(params?: ExpenseFilters) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const { data } = await api.get('/expenses', { params });
      return data.data as { data: any[]; total: number; page: number; limit: number; totalPages: number };
    },
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: async () => {
      const { data } = await api.get(`/expenses/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post('/expenses', body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Record<string, any>) => {
      const { data } = await api.patch(`/expenses/${id}`, body);
      return data.data;
    },
    onSuccess: (_d: any, { id }: { id: string }) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses', id] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useDuplicateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/expenses/${id}/duplicate`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
