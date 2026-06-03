'use client';
import { useParams, useRouter } from 'next/navigation';
import { useExpense, useDeleteExpense, useDuplicateExpense } from '@/hooks/use-expenses';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Pencil, Trash2, Copy, Calendar, Users, Tag } from 'lucide-react';
import Link from 'next/link';

function formatCurrencyLocal(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: expense, isLoading } = useExpense(id);
  const deleteExpense = useDeleteExpense();
  const duplicateExpense = useDuplicateExpense();

  if (isLoading) return <div className="animate-pulse h-40 rounded-lg bg-muted" />;
  if (!expense) return <div className="text-muted-foreground">Expense not found.</div>;

  const isCreator = expense.createdById === user?.id;

  function handleDelete() {
    if (!confirm('Delete this expense?')) return;
    deleteExpense.mutate(id, { onSuccess: () => router.push('/expenses') });
  }

  function handleDuplicate() {
    duplicateExpense.mutate(id, { onSuccess: (dup: any) => router.push(`/expenses/${dup?.id ?? ''}`) });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold flex-1 truncate">{expense.description}</h1>
        {isCreator && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicateExpense.isPending}>
              <Copy className="h-3.5 w-3.5 mr-1" />Duplicate
            </Button>
            <Link href={`/expenses/${id}/edit`}>
              <Button variant="outline" size="sm"><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteExpense.isPending}
              className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-1">
              {formatCurrencyLocal(Number(expense.amount), expense.currency)}
            </div>
            <div className="text-muted-foreground text-sm">
              Paid by <span className="font-medium text-foreground">{expense.paidBy?.displayName ?? 'Unknown'}</span>
            </div>
          </div>
          <div className="border-t my-4" />
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-medium flex items-center justify-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-muted-foreground">Date</div>
            </div>
            <div>
              <div className="font-medium flex items-center justify-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {expense.category?.name ?? 'Uncategorized'}
              </div>
              <div className="text-muted-foreground">Category</div>
            </div>
            <div>
              <div className="font-medium">{expense.splitMethod?.replace(/_/g, ' ')}</div>
              <div className="text-muted-foreground">Split type</div>
            </div>
          </div>
          {expense.notes && (
            <>
              <div className="border-t my-4" />
              <p className="text-sm text-muted-foreground italic">{expense.notes}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Split Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {expense.participants?.map((p: any) => (
            <div key={p.userId} className="flex items-center gap-3 py-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{p.user?.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <span className="text-sm font-medium">{p.userId === user?.id ? 'You' : p.user?.displayName}</span>
                {p.userId === expense.paidById && (
                  <Badge variant="secondary" className="ml-2 text-xs">paid</Badge>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{formatCurrencyLocal(Number(p.owedAmount), expense.currency)}</div>
                {p.sharePercent && <div className="text-xs text-muted-foreground">{Number(p.sharePercent).toFixed(1)}%</div>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
