import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string> | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsPage {
  data: AppNotification[];
  total: number;
  unread: number;
  page: number;
  limit: number;
}

function unwrap(d: any) { return d?.data ?? d; }

export function useNotifications(page = 1) {
  const { isAuthenticated } = useAuthStore();
  return useQuery<NotificationsPage>({
    queryKey: ['notifications', page],
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params: { page, limit: 20 } });
      return unwrap(data);
    },
    enabled: isAuthenticated(),
    staleTime: 30_000,
  });
}

export function useUnreadCount() {
  const { isAuthenticated } = useAuthStore();
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return unwrap(data).count as number;
    },
    enabled: isAuthenticated(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
