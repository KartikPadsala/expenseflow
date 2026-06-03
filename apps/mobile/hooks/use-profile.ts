import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { setAuth } = useAuthStore();
  return useMutation({
    mutationFn: async (body: { displayName?: string; defaultCurrency?: string; language?: string; timezone?: string }) => {
      const { data } = await api.patch('/users/me', body);
      return data.data;
    },
    onSuccess: async (updatedUser) => {
      qc.setQueryData(['profile'], updatedUser);
    },
  });
}
