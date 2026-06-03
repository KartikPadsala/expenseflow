'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, UserX, UserCheck } from 'lucide-react';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      const { data } = await api.get(`/users/search?q=${search}`);
      return data.data as any[];
    },
    enabled: search.length >= 2,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search users by name, email, username..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardHeader><CardTitle>Users {users ? `(${users.length})` : ''}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users?.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                    {user.displayName?.[0]}
                  </div>
                  <div>
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.email} · @{user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.isEmailVerified && <Badge variant="secondary" className="text-xs">✓ Verified</Badge>}
                  {user.role === 'ADMIN' && <Badge className="text-xs">Admin</Badge>}
                </div>
              </div>
            ))}
            {search.length >= 2 && !users?.length && (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            )}
            {search.length < 2 && (
              <p className="text-center text-muted-foreground py-8">Type at least 2 characters to search users</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
