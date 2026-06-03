'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useExpense, useUpdateExpense } from '@/hooks/use-expenses';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

const SPLIT_METHODS = ['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];

const schema = z.object({
  description: z.string().min(1).max(120),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0),
  currency: z.string().length(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  splitMethod: z.enum(['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES']),
  notes: z.string().max(300).optional(),
});
type FormValues = z.infer<typeof schema>;

export default function EditExpensePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: expense, isLoading } = useExpense(id);
  const updateExpense = useUpdateExpense();
  const [participants, setParticipants] = useState<Array<{ userId: string; displayName: string; shares?: number; sharePercent?: number; customAmount?: number }>>([]);

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: '', amount: '', currency: 'USD', date: '', splitMethod: 'EQUAL' },
  });

  const splitMethod = watch('splitMethod');
  const amount = parseFloat(watch('amount')) || 0;
  const currency = watch('currency');

  useEffect(() => {
    if (expense) {
      reset({
        description: expense.description,
        amount: String(expense.amount),
        currency: expense.currency,
        date: expense.date?.slice(0, 10) ?? '',
        splitMethod: expense.splitMethod as any,
        notes: expense.notes ?? '',
      });
      setParticipants(
        (expense.participants ?? []).map((p: any) => ({
          userId: p.userId,
          displayName: p.user?.displayName ?? p.userId,
          shares: p.shares,
          sharePercent: p.sharePercent,
          customAmount: Number(p.owedAmount),
        })),
      );
    }
  }, [expense]);

  let splitPreview: Array<{ participantId: string; owedAmount: number }> = [];
  if (amount > 0 && participants.length > 0) {
    if (splitMethod === 'EQUAL') {
      const share = Math.round((amount / participants.length) * 100) / 100;
      splitPreview = participants.map((p, i) => ({
        participantId: p.userId,
        owedAmount: i === 0 ? amount - share * (participants.length - 1) : share,
      }));
    } else if (splitMethod === 'UNEQUAL') {
      splitPreview = participants.map((p) => ({ participantId: p.userId, owedAmount: p.customAmount ?? 0 }));
    } else if (splitMethod === 'PERCENTAGE') {
      splitPreview = participants.map((p) => ({
        participantId: p.userId,
        owedAmount: Math.round((amount * (p.sharePercent ?? (100 / participants.length)) / 100) * 100) / 100,
      }));
    } else if (splitMethod === 'SHARES') {
      const totalShares = participants.reduce((s, p) => s + (p.shares ?? 1), 0);
      splitPreview = participants.map((p) => ({
        participantId: p.userId,
        owedAmount: Math.round((amount * (p.shares ?? 1) / totalShares) * 100) / 100,
      }));
    }
  }

  const totalAllocated = splitPreview.reduce((s, r) => s + r.owedAmount, 0);
  const splitValid = participants.length === 0 || Math.abs(totalAllocated - amount) < 0.02 || amount === 0;

  function onSubmit(data: FormValues) {
    updateExpense.mutate({
      id,
      description: data.description,
      amount: parseFloat(data.amount),
      currency: data.currency,
      date: data.date,
      splitMethod: data.splitMethod as any,
      notes: data.notes || undefined,
      participants: splitPreview.map((r) => ({ userId: r.participantId, owedAmount: r.owedAmount })),
    }, {
      onSuccess: () => { alert('Expense updated'); router.push(`/expenses/${id}`); },
      onError: (e: any) => alert(e?.response?.data?.message ?? 'Update failed'),
    });
  }

  if (isLoading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Edit Expense</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Description *</Label>
              <Controller control={control} name="description" render={({ field }) => (
                <Input {...field} className="mt-1" />
              )} />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount *</Label>
                <Controller control={control} name="amount" render={({ field }) => (
                  <Input {...field} type="number" step="0.01" className="mt-1" />
                )} />
              </div>
              <div>
                <Label>Currency</Label>
                <Controller control={control} name="currency" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
            </div>
            <div>
              <Label>Date *</Label>
              <Controller control={control} name="date" render={({ field }) => (
                <Input {...field} type="date" className="mt-1" />
              )} />
            </div>
            <div>
              <Label>Notes</Label>
              <Controller control={control} name="notes" render={({ field }) => (
                <textarea {...field} rows={2} className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none" />
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Split Method</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="splitMethod" render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {SPLIT_METHODS.map((m) => (
                  <button key={m} type="button" onClick={() => field.onChange(m)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                      field.value === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            )} />
          </CardContent>
        </Card>

        {splitPreview.length > 0 && amount > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Split Preview</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {splitPreview.map((r) => {
                const p = participants.find((x) => x.userId === r.participantId);
                return (
                  <div key={r.participantId} className="flex justify-between text-sm">
                    <span>{r.participantId === user?.id ? 'You' : (p?.displayName ?? r.participantId)}</span>
                    <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(r.owedAmount)}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full" disabled={updateExpense.isPending || !splitValid}>
          {updateExpense.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}
