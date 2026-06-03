'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data } = await api.post('/auth/login', { email, password });
      return data;
    },
    onSuccess: async (data) => {
      const { accessToken, refreshToken } = data.data;
      localStorage.setItem('accessToken', accessToken);
      const { data: userData } = await api.get('/users/me');
      setAuth(userData.data, accessToken, refreshToken);
      router.push('/dashboard');
    },
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (body: { email: string; username: string; displayName: string; password: string }) => {
      const { data } = await api.post('/auth/register', body);
      return data;
    },
    onSuccess: () => router.push('/auth/login?registered=true'),
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  return () => {
    logout();
    qc.clear();
    router.push('/auth/login');
  };
}

export function useCurrentUser() {
  const { user, isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data.data;
    },
    enabled: isAuthenticated(),
    initialData: user,
  });
}

export function useProfile() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data.data;
    },
    enabled: isAuthenticated(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { setAuth, user, accessToken, refreshToken } = useAuthStore();
  return useMutation({
    mutationFn: async (body: { displayName?: string; defaultCurrency?: string; language?: string; timezone?: string }) => {
      const { data } = await api.patch('/users/me', body);
      return data.data;
    },
    onSuccess: (updated) => {
      qc.setQueryData(['profile'], updated);
      qc.setQueryData(['me'], updated);
      if (user && accessToken && refreshToken) setAuth({ ...user, ...updated }, accessToken, refreshToken);
    },
  });
}
