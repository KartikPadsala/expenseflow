'use client';
import Link from 'next/link';
import { useGroups } from '@/hooks/use-groups';
import { GroupCard } from '@/components/groups/group-card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Groups</h1>
        <Link href="/groups/new">
          <Button><Plus className="h-4 w-4 mr-2" />New Group</Button>
        </Link>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : groups?.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">No groups yet.</p>
          <p className="mt-2">Create your first group to start splitting expenses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups?.map((g) => <GroupCard key={g.id} group={g} />)}
        </div>
      )}
    </div>
  );
}
