import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await api.get('/groups');
      return data.data as any[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useGroupBalances(id: string) {
  return useQuery({
    queryKey: ['groups', id, 'balances'],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${id}/balances`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; type?: string; currency?: string; description?: string }) => {
      const { data } = await api.post('/groups', body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; description?: string; currency?: string }) => {
      const { data } = await api.patch(`/groups/${id}`, body);
      return data.data;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['groups', id] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { data } = await api.post(`/groups/${groupId}/members`, { userId });
      return data.data;
    },
    onSuccess: (_d, { groupId }) => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, memberId }: { groupId: string; memberId: string }) => {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
    },
    onSuccess: (_d: any, { groupId }: { groupId: string }) => qc.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}

export function useArchiveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.post(`/groups/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}
