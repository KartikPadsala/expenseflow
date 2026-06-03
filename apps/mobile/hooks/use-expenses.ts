import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { SplitMethod } from '@expenseflow/shared';

export interface ExpenseParticipantInput {
  userId: string;
  owedAmount?: number;
  sharePercent?: number;
  shares?: number;
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  currency: string;
  date: string; // ISO date "YYYY-MM-DD"
  groupId?: string;
  categoryId?: string;
  splitMethod: SplitMethod;
  notes?: string;
  participants: ExpenseParticipantInput[];
}

interface ListExpensesParams {
  groupId?: string;
  search?: string;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export function useExpenses(params?: ListExpensesParams) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      const { data } = await api.get('/expenses', { params });
      return data.data as { data: any[]; total: number; page: number; limit: number; totalPages: number };
    },
    staleTime: 1000 * 60,
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
    mutationFn: async (body: CreateExpenseInput) => {
      const { data } = await api.post('/expenses', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & CreateExpenseInput) => {
      const { data } = await api.patch(`/expenses/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses', id] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
