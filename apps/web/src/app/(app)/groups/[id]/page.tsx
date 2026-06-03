'use client';
import { useGroup, useGroupBalances } from '@/hooks/use-groups';
import { useExpenses } from '@/hooks/use-expenses';
import { useSettlements } from '@/hooks/use-settlements';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpenseCard } from '@/components/expenses/expense-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SettleAllButton } from '@/components/settlements/settle-all-button';
import Link from 'next/link';
import { Plus, Users, ArrowRight, HandCoins, Pencil, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@expenseflow/shared';

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const { data: group } = useGroup(params.id);
  const { data: expenses } = useExpenses({ groupId: params.id });
  const { data: balances } = useGroupBalances(params.id);
  const { data: groupSettlements } = useSettlements({ groupId: params.id, status: 'COMPLETED' });

  if (!group) return <div className="text-muted-foreground animate-pulse">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground">{group.members?.length} members</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/expenses/new?groupId=${params.id}`}>
            <Button><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
          </Link>
          <Link href={`/settlements/new?groupId=${params.id}`}>
            <Button variant="outline" className="flex items-center gap-2">
              <HandCoins className="h-4 w-4" />Settle Up
            </Button>
          </Link>
          <SettleAllButton groupId={params.id} currency={group.currency ?? 'USD'} currentUserId={user?.id} />
          <Link href={`/groups/${params.id}/edit`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />Edit
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Members</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {group.members?.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 rounded-full border px-3 py-1.5">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                  {m.user?.displayName?.[0]}
                </div>
                <span className="text-sm">{m.user?.displayName}</span>
                {m.role === 'OWNER' && <Badge variant="secondary" className="text-xs">Owner</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {balances?.simplified?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Suggested Settlements {balances?.currency && <span className="text-sm font-normal text-muted-foreground ml-1">in {balances.currency}</span>}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {balances.simplified.map((s: any, i: number) => {
                const fromName = s.fromUser?.displayName ?? group.members?.find((m: any) => m.userId === s.from)?.user?.displayName ?? s.from;
                const toName = s.toUser?.displayName ?? group.members?.find((m: any) => m.userId === s.to)?.user?.displayName ?? s.to;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{fromName}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{toName}</span>
                    <span className="ml-auto text-primary font-semibold">{formatCurrency(s.amount, group.currency)}</span>
                    <Link href={`/settlements/new?payeeId=${s.to}&amount=${s.amount}&groupId=${params.id}&currency=${group.currency}`}>
                      <Button size="sm" variant="outline" className="text-xs h-7">Settle</Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Expenses ({expenses?.total || 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expenses?.data.map((e: any) => (
              <ExpenseCard key={e.id} expense={e} currentUserId={user?.id} />
            ))}
          </div>
        </CardContent>
      </Card>

      {groupSettlements && groupSettlements.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" />Settlement History ({groupSettlements.length})</CardTitle>
              <Link href={`/settlements?groupId=${params.id}&status=COMPLETED`}>
                <Button variant="ghost" size="sm" className="text-xs">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groupSettlements.slice(0, 5).map((s) => {
                const isPayer = s.payerId === user?.id;
                return (
                  <Link key={s.id} href={`/settlements/${s.id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${isPayer ? 'bg-red-500' : 'bg-green-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {isPayer ? `You paid ${s.payee?.displayName}` : `${s.payer?.displayName} paid you`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.settledAt ? new Date(s.settledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${isPayer ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(s.amount, s.currency)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
