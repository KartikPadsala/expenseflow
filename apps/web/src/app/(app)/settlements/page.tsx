'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSettlements } from '@/hooks/use-settlements';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@expenseflow/shared';
import { Plus, ArrowUpRight, ArrowDownLeft, CheckCircle, Clock, XCircle } from 'lucide-react';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED') return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
  if (status === 'CANCELLED') return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
}

export default function SettlementsPage() {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const { data: settlements, isLoading } = useSettlements(statusFilter ? { status: statusFilter } : undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settlements</h1>
          <p className="text-muted-foreground mt-1">Track payments between you and others</p>
        </div>
        <Link href="/settlements/new">
          <Button><Plus className="h-4 w-4 mr-2" />Record Settlement</Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 border-b">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === f.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : !settlements?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">💸</div>
          <p className="text-lg font-medium">No settlements yet</p>
          <p className="text-sm mt-1">Record a payment when you settle up with someone.</p>
          <Link href="/settlements/new" className="mt-4 inline-block">
            <Button variant="outline" className="mt-4">Record Your First Settlement</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {settlements.map((s) => {
            const isPayer = s.payerId === user?.id;
            return (
              <Link key={s.id} href={`/settlements/${s.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isPayer ? 'bg-red-50' : 'bg-green-50'}`}>
                        {isPayer
                          ? <ArrowUpRight className="h-5 w-5 text-red-600" />
                          : <ArrowDownLeft className="h-5 w-5 text-green-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {isPayer ? `You paid ${s.payee?.displayName}` : `${s.payer?.displayName} paid you`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.group ? `${s.group.name} · ` : ''}
                          {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className={`text-base font-bold ${isPayer ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(s.amount, s.currency)}
                        </span>
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
