'use client';
import { useSettlement, useCompleteSettlement, useCancelSettlement } from '@/hooks/use-settlements';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@expenseflow/shared';
import { ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

function StatusIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <CheckCircle className="h-5 w-5 text-green-600" />;
  if (status === 'CANCELLED') return <XCircle className="h-5 w-5 text-red-600" />;
  return <Clock className="h-5 w-5 text-amber-600" />;
}

function UserAvatar({ name, avatarUrl }: { name?: string; avatarUrl?: string }) {
  if (avatarUrl) return <img src={avatarUrl} alt={name} className="h-10 w-10 rounded-full object-cover" />;
  return (
    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-primary">
      {name?.[0] ?? '?'}
    </div>
  );
}

function TimelineEvent({ label, date, color, isLast }: { label: string; date: string; color: string; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full mt-1 ${color}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-1" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {' at '}
          {new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

export default function SettlementDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: s, isLoading } = useSettlement(params.id);
  const complete = useCompleteSettlement();
  const cancel = useCancelSettlement();

  if (isLoading) return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  if (!s) return <div className="text-center py-20 text-muted-foreground">Settlement not found.</div>;

  const isPayer = s.payerId === user?.id;
  const isPayee = s.payeeId === user?.id;
  const isPending = s.status === 'PENDING';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground transition-colors">← Back</button>
        <h1 className="text-2xl font-bold">Settlement Details</h1>
      </div>

      {/* Amount hero */}
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">{isPayer ? 'You sent' : 'You received'}</p>
          <p className={`text-4xl font-extrabold mb-3 ${isPayer ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(s.amount, s.currency)}
          </p>
          <div className="flex items-center justify-center gap-2">
            <StatusIcon status={s.status} />
            <span className={`text-sm font-semibold ${s.status === 'COMPLETED' ? 'text-green-600' : s.status === 'CANCELLED' ? 'text-red-600' : 'text-amber-600'}`}>
              {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Parties */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Parties</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-around">
            <div className="text-center space-y-2">
              <UserAvatar name={s.payer?.displayName} avatarUrl={s.payer?.avatarUrl} />
              <p className="text-sm font-semibold">{s.payer?.displayName}</p>
              <p className="text-xs text-muted-foreground">Payer</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className="text-center space-y-2">
              <UserAvatar name={s.payee?.displayName} avatarUrl={s.payee?.avatarUrl} />
              <p className="text-sm font-semibold">{s.payee?.displayName}</p>
              <p className="text-xs text-muted-foreground">Payee</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
        <CardContent className="divide-y">
          <div className="flex justify-between py-3">
            <span className="text-sm text-muted-foreground">Method</span>
            <span className="text-sm font-medium">{s.method.replace('_', ' ')}</span>
          </div>
          {s.group && (
            <div className="flex justify-between py-3">
              <span className="text-sm text-muted-foreground">Group</span>
              <span className="text-sm font-medium">{s.group.name}</span>
            </div>
          )}
          {s.notes && (
            <div className="flex justify-between py-3">
              <span className="text-sm text-muted-foreground">Notes</span>
              <span className="text-sm font-medium text-right max-w-48">{s.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
        <CardContent>
          <TimelineEvent label="Settlement created" date={s.createdAt} color="bg-primary" isLast={!s.settledAt && s.status !== 'CANCELLED'} />
          {s.settledAt && (
            <TimelineEvent label="Marked as completed" date={s.settledAt} color="bg-green-500" isLast />
          )}
          {s.status === 'CANCELLED' && (
            <TimelineEvent label="Settlement cancelled" date={s.createdAt} color="bg-red-500" isLast />
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {isPending && (
        <div className="flex gap-3">
          {isPayee && (
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={complete.isPending}
              onClick={() => complete.mutate(s.id)}
            >
              {complete.isPending ? 'Confirming...' : '✓ Mark as Completed'}
            </Button>
          )}
          {(isPayer || isPayee) && (
            <Button
              variant="outline"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(s.id, { onSuccess: () => router.push('/settlements') })}
            >
              {cancel.isPending ? 'Cancelling...' : 'Cancel Settlement'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
