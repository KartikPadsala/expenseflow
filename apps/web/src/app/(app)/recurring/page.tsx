'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Pause, Play, Trash2, RefreshCw, Calendar } from 'lucide-react';
import {
  useRecurringExpenses, usePauseRecurring, useResumeRecurring, useDeleteRecurring,
  RecurringExpense,
} from '@/hooks/use-recurring';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly',
};

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(nextDueDate: string): boolean {
  return new Date(nextDueDate) < new Date();
}

function RecurringRow({ item, onToggle, onDelete, togglePending, deletePending }: {
  item: RecurringExpense;
  onToggle: () => void;
  onDelete: () => void;
  togglePending: boolean;
  deletePending: boolean;
}) {
  const overdue = item.isActive && isOverdue(item.nextDueDate);

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
      <Link href={`/recurring/${item.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{item.description}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-sm text-muted-foreground">{FREQ_LABELS[item.frequency]}</span>
            {item.group && <span className="text-xs text-muted-foreground">• {item.group.name}</span>}
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-4 ml-4 flex-shrink-0">
        <div className="text-right">
          <p className="font-semibold">{formatCurrency(Number(item.amount), item.currency)}</p>
          <div className="flex items-center gap-1 justify-end">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className={`text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {overdue ? 'Overdue · ' : 'Due · '}{formatDate(item.nextDueDate)}
            </span>
          </div>
        </div>

        <Badge variant={item.isActive ? 'default' : 'secondary'} className={item.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
          {item.isActive ? 'Active' : 'Paused'}
        </Badge>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon"
            onClick={(e) => { e.preventDefault(); onToggle(); }}
            disabled={togglePending}
            title={item.isActive ? 'Pause' : 'Resume'}
          >
            {item.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost" size="icon"
            className="text-destructive hover:text-destructive"
            onClick={(e) => { e.preventDefault(); onDelete(); }}
            disabled={deletePending}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RecurringPage() {
  const router = useRouter();
  const { data, isLoading } = useRecurringExpenses();
  const pause = usePauseRecurring();
  const resume = useResumeRecurring();
  const del = useDeleteRecurring();

  const items = data ?? [];
  const active = items.filter((r) => r.isActive);
  const paused = items.filter((r) => !r.isActive);

  function handleToggle(item: RecurringExpense) {
    if (item.isActive) {
      pause.mutate(item.id);
    } else {
      resume.mutate(item.id);
    }
  }

  function handleDelete(item: RecurringExpense) {
    if (confirm(`Delete "${item.description}"? Past expenses won't be affected.`)) {
      del.mutate(item.id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recurring Expenses</h1>
          <p className="text-muted-foreground mt-1">Automate repeated expenses like rent, subscriptions, or utilities.</p>
        </div>
        <Button onClick={() => router.push('/recurring/new')} className="gap-2">
          <Plus className="h-4 w-4" /> New Recurring
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{active.length}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">{paused.length}</div>
            <div className="text-sm text-muted-foreground">Paused</div>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="p-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && items.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No recurring expenses yet</h3>
            <p className="text-muted-foreground mt-1 mb-4">Set up automatic recurring expenses like rent or subscriptions.</p>
            <Button onClick={() => router.push('/recurring/new')}>
              <Plus className="h-4 w-4 mr-2" /> Create your first
            </Button>
          </CardContent>
        </Card>
      )}

      {active.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Active ({active.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {active.map((item) => (
              <RecurringRow
                key={item.id}
                item={item}
                onToggle={() => handleToggle(item)}
                onDelete={() => handleDelete(item)}
                togglePending={pause.isPending || resume.isPending}
                deletePending={del.isPending}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {paused.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-muted-foreground">Paused ({paused.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {paused.map((item) => (
              <RecurringRow
                key={item.id}
                item={item}
                onToggle={() => handleToggle(item)}
                onDelete={() => handleDelete(item)}
                togglePending={pause.isPending || resume.isPending}
                deletePending={del.isPending}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
