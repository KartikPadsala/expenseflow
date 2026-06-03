'use client';
import { useState } from 'react';
import { useGroupBalances } from '@/hooks/use-groups';
import { useBulkSettle } from '@/hooks/use-settlements';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HandCoins, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@expenseflow/shared';

interface Props {
  groupId: string;
  currency: string;
  currentUserId?: string;
}

export function SettleAllButton({ groupId, currency, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const { data: balances } = useGroupBalances(groupId);
  const bulkSettle = useBulkSettle();

  const simplified: any[] = balances?.simplified ?? [];
  // Only settlements where current user is the payer
  const myDebts = simplified.filter((s: any) => s.from === currentUserId);

  if (myDebts.length === 0) return null;

  function handleSettleAll() {
    bulkSettle.mutate(
      {
        groupId,
        settlements: myDebts.map((s: any) => ({
          payeeId: s.to,
          amount: s.amount,
          currency,
        })),
      },
      {
        onSuccess: () => {
          setOpen(false);
          alert('All settlements recorded!');
        },
        onError: (e: any) => alert(e?.response?.data?.message ?? 'Failed to settle'),
      },
    );
  }

  const total = myDebts.reduce((sum: number, s: any) => sum + s.amount, 0);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="flex items-center gap-2">
        <HandCoins className="h-4 w-4" />
        Settle All ({formatCurrency(total, currency)})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle All Your Debts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              This will create {myDebts.length} settlement{myDebts.length > 1 ? 's' : ''} totalling{' '}
              <span className="font-semibold text-foreground">{formatCurrency(total, currency)}</span>.
            </p>
            <div className="space-y-2">
              {myDebts.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted">
                  <span className="font-medium">You</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{s.toUser?.displayName ?? s.to}</span>
                  <span className="ml-auto font-semibold text-primary">{formatCurrency(s.amount, currency)}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSettleAll} disabled={bulkSettle.isPending}>
              {bulkSettle.isPending ? 'Settling...' : 'Confirm Settle All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
