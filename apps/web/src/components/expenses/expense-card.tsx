import { formatCurrency, formatRelativeTime } from '@expenseflow/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface ExpenseCardProps {
  expense: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    convertedAmount?: number | null;
    baseCurrency?: string | null;
    date: string;
    paidBy: { displayName: string };
    participants: { userId: string; owedAmount: number }[];
    category?: { name: string; icon: string; color: string } | null;
  };
  currentUserId?: string;
}

export function ExpenseCard({ expense, currentUserId }: ExpenseCardProps) {
  const myParticipation = expense.participants.find((p) => p.userId === currentUserId);
  const myShare = myParticipation ? Number(myParticipation.owedAmount) : 0;

  return (
    <Link href={`/expenses/${expense.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: (expense.category?.color || '#22c55e') + '20' }}
              >
                {expense.category?.icon || '💸'}
              </div>
              <div>
                <p className="font-medium">{expense.description}</p>
                <p className="text-sm text-muted-foreground">
                  Paid by {expense.paidBy?.displayName} · {formatRelativeTime(new Date(expense.date))}
                </p>
                {expense.category && (
                  <Badge variant="secondary" className="mt-1 text-xs">{expense.category.name}</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatCurrency(Number(expense.amount), expense.currency)}</p>
              {expense.convertedAmount != null && expense.baseCurrency && expense.baseCurrency !== expense.currency && (
                <span className="text-xs text-muted-foreground">
                  ≈ {formatCurrency(expense.convertedAmount, expense.baseCurrency)}
                </span>
              )}
              {myShare > 0 && (
                <p className="text-sm text-muted-foreground">
                  Your share: {formatCurrency(myShare, expense.currency)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
