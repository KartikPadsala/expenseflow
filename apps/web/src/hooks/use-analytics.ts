import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useSpendingAnalytics(period: 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: ['analytics', 'spending', period],
    queryFn: async () => {
      const { data } = await api.get('/analytics/spending', { params: { period } });
      return data.data;
    },
  });
}

export function useCategoryAnalytics(period: 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: ['analytics', 'categories', period],
    queryFn: async () => {
      const { data } = await api.get('/analytics/categories', { params: { period } });
      return data.data as Array<{ id: string; name: string; icon: string; color: string; total: number }>;
    },
  });
}

export function useTrendsAnalytics(months = 6) {
  return useQuery({
    queryKey: ['analytics', 'trends', months],
    queryFn: async () => {
      const { data } = await api.get('/analytics/trends', { params: { months } });
      return data.data as Array<{ month: string; total: number; count: number }>;
    },
  });
}
