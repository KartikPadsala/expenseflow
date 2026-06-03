import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface SearchResults {
  query: string;
  expenses: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    paidBy: { id: string; displayName: string; avatarUrl: string | null };
    category: { id: string; name: string; color: string } | null;
  }>;
  groups: Array<{
    id: string;
    name: string;
    avatarUrl: string | null;
    _count: { members: number };
  }>;
  users: Array<{
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    email: string;
  }>;
}

export function useSearch(query: string, limit = 10) {
  return useQuery({
    queryKey: ['search', query, limit],
    queryFn: async (): Promise<SearchResults> => {
      const { data } = await api.get('/search', { params: { q: query, limit } });
      return data;
    },
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}
