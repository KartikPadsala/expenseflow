'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Pause, Play, Trash2, RefreshCw, Calendar, Users } from 'lucide-react';
import {
  useRecurringExpense, usePauseRecurring, useResumeRecurring, useDeleteRecurring,
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
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(nextDueDate: string): boolean {
  return new Date(nextDueDate) < new Date();
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-3 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function RecurringDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: r, isLoading, isError, refetch } = useRecurringExpense(id);
  const pause = usePauseRecurring();
  const resume = useResumeRecurring();
  const del = useDeleteRecurring();

  function handleDelete() {
    if (!r) return;
    if (confirm(`Delete "${r.description}"? Past expenses won't be affected.`)) {
      del.mutate(r.id, { onSuccess: () => router.push('/recurring') });
    }
  }

  function handleToggle() {
    if (!r) return;
    if (r.isActive) {
      pause.mutate(r.id);
    } else {
      resume.mutate(r.id);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !r) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-destructive font-medium">Could not load recurring expense.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const overdue = r.isActive && isOverdue(r.nextDueDate);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/recurring')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{r.description}</h1>
          <p className="text-muted-foreground text-sm">{FREQ_LABELS[r.frequency]} recurring expense</p>
        </div>
        <Link href={`/recurring/${r.id}/edit`}>
          <Button variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button>
        </Link>
      </div>

      {/* Hero card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold">{formatCurrency(Number(r.amount), r.currency)}</div>
              <div className="flex items-center gap-2 mt-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{FREQ_LABELS[r.frequency]}</span>
                <Badge
                  variant={r.isActive ? 'default' : 'secondary'}
                  className={r.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                >
                  {r.isActive ? 'Active' : 'Paused'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className={`font-medium ${overdue ? 'text-destructive' : 'text-foreground'}`}>
                  {overdue ? 'Overdue' : 'Next due'}
                </span>
              </div>
              <p className={`text-sm ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formatDateShort(r.nextDueDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <DetailRow label="Next Due Date" value={formatDate(r.nextDueDate)} />
          {r.endDate && <DetailRow label="Ends On" value={formatDate(r.endDate)} />}
          {r.group && (
            <DetailRow
              label="Group"
              value={<Link href={`/groups/${r.group.id}`} className="text-primary hover:underline">{r.group.name}</Link>}
            />
          )}
          {r.category && <DetailRow label="Category" value={`${r.category.icon} ${r.category.name}`} />}
          <DetailRow label="Split Method" value={r.splitMethod} />
          <DetailRow label="Currency" value={r.currency} />
          {r.notes && <DetailRow label="Notes" value={r.notes} />}
          {r.participantsJson?.length > 0 && (
            <DetailRow
              label="Participants"
              value={
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{r.participantsJson.length} participant{r.participantsJson.length !== 1 ? 's' : ''}</span>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Recent generated expenses */}
      {r.expenses && r.expenses.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Generated Expenses</CardTitle></CardHeader>
          <CardContent className="p-0">
            {r.expenses.map((e: any) => (
              <Link
                key={e.id}
                href={`/expenses/${e.id}`}
                className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{e.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDateShort(e.date)}</p>
                </div>
                <span className="font-semibold">{formatCurrency(Number(e.amount), e.currency)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={handleToggle}
          disabled={pause.isPending || resume.isPending}
        >
          {r.isActive ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Resume</>}
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleDelete}
          disabled={del.isPending}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>
    </div>
  );
}
