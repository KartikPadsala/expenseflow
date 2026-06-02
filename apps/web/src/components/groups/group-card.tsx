import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { GROUP_TYPES } from '@expenseflow/shared';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    type: string;
    currency: string;
    members: { id: string }[];
    _count?: { expenses: number };
  };
}

export function GroupCard({ group }: GroupCardProps) {
  const groupType = GROUP_TYPES.find((t) => t.value === group.type);
  return (
    <Link href={`/groups/${group.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl">{groupType?.icon || '👥'}</span>
            <Badge variant="secondary">{group.currency}</Badge>
          </div>
          <CardTitle className="text-lg">{group.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {group.members?.length || 0} members
            </span>
            <span>{group._count?.expenses || 0} expenses</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
