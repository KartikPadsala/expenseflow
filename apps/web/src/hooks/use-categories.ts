import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data } = await api.get('/categories');
      return data.data ?? data;
    },
    staleTime: 5 * 60_000,
  });
}
