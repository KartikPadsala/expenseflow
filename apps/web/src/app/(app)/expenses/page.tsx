'use client';
import { useState } from 'react';
import { useExpenses } from '@/hooks/use-expenses';
import { useAuthStore } from '@/store/auth.store';
import { ExpenseCard } from '@/components/expenses/expense-card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const { user } = useAuthStore();
  const { data, isLoading } = useExpenses({ search: search || undefined });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">All Expenses</h1>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.data.map((e: any) => (
            <ExpenseCard key={e.id} expense={e} currentUserId={user?.id} />
          ))}
          {data?.data.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">No expenses found.</div>
          )}
        </div>
      )}
    </div>
  );
}
