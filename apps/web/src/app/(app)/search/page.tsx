'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, DollarSign, Users, Receipt, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearch } from '@/hooks/use-search';
import { formatDistanceToNow } from 'date-fns';

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function ExpenseCard({ expense }: { expense: any }) {
  return (
    <Link href={`/expenses/${expense.id}`} className="block">
      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium">{expense.description}</p>
            <p className="text-xs text-muted-foreground">
              Paid by {expense.paidBy?.displayName} · {formatDistanceToNow(new Date(expense.date), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{formatAmount(expense.amount, expense.currency)}</p>
          {expense.category && (
            <Badge variant="outline" className="text-xs">{expense.category.name}</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

function GroupCard({ group }: { group: any }) {
  return (
    <Link href={`/groups/${group.id}`} className="block">
      <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <Users className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-medium">{group.name}</p>
          <p className="text-xs text-muted-foreground">{group._count.members} members</p>
        </div>
      </div>
    </Link>
  );
}

function UserCard({ user }: { user: any }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.displayName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <span className="text-green-700 text-sm font-medium">{user.displayName?.[0]?.toUpperCase()}</span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{user.displayName}</p>
        <p className="text-xs text-muted-foreground">@{user.username}</p>
      </div>
    </div>
  );
}

function ResultSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');
  const [debouncedQ, setDebouncedQ] = useState(inputValue);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data, isLoading, isFetching } = useSearch(debouncedQ);

  const handleChange = (value: string) => {
    setInputValue(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('q', value); else params.delete('q');
    router.replace(`/search?${params.toString()}`);
  };

  const totalResults = data
    ? data.expenses.length + data.groups.length + data.users.length
    : 0;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-muted-foreground text-sm">Find expenses, groups, and people</p>
      </div>

      <div className="relative">
        {isLoading || isFetching ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <Input
          autoFocus
          placeholder="Search expenses, groups, people..."
          className="pl-10"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>

      {debouncedQ.trim().length >= 2 && isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      )}

      {data && totalResults === 0 && debouncedQ.trim().length >= 2 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No results for &ldquo;{debouncedQ}&rdquo;</p>
        </div>
      )}

      {data && totalResults > 0 && (
        <div className="space-y-6">
          <ResultSection title="Expenses" count={data.expenses.length}>
            {data.expenses.map((e) => <ExpenseCard key={e.id} expense={e} />)}
          </ResultSection>
          <ResultSection title="Groups" count={data.groups.length}>
            {data.groups.map((g) => <GroupCard key={g.id} group={g} />)}
          </ResultSection>
          <ResultSection title="People" count={data.users.length}>
            {data.users.map((u) => <UserCard key={u.id} user={u} />)}
          </ResultSection>
        </div>
      )}

      {debouncedQ.trim().length < 2 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Type at least 2 characters to search</p>
        </div>
      )}
    </div>
  );
}
