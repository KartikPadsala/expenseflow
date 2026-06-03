import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useRouter } from 'expo-router';

export function useLogin() {
  const { setAuth } = useAuthStore();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data: loginData } = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken } = loginData.data;
      const { data: userData } = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { user: userData.data, accessToken, refreshToken };
    },
    onSuccess: async ({ user, accessToken, refreshToken }) => {
      await setAuth(user, accessToken, refreshToken);
      router.replace('/(tabs)/dashboard');
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
    onSuccess: () => router.replace('/(auth)/login'),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post('/auth/forgot-password', { email });
      return data;
    },
  });
}
