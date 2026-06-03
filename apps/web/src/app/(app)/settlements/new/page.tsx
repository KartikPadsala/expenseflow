'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateSettlement } from '@/hooks/use-settlements';
import { useGroups, useGroup } from '@/hooks/use-groups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useMemo } from 'react';

const schema = z.object({
  payeeId: z.string().min(1, 'Select a recipient'),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Enter a valid amount'),
  currency: z.string().length(3),
  method: z.string(),
  groupId: z.string().optional(),
  notes: z.string().max(300).optional(),
});
type FormData = z.infer<typeof schema>;

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'PAYPAL', 'WISE', 'INTERAC', 'OTHER'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];

export default function NewSettlementPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const createSettlement = useCreateSettlement();
  const { data: groups } = useGroups();

  const presetGroupId = sp.get('groupId') ?? '';

  const { data: friends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const { data } = await api.get('/friends');
      return (data.data?.friends ?? data.friends ?? []) as { id: string; displayName: string; email: string }[];
    },
  });

  // If a group is preset, fetch group data to include members as payee candidates
  const { data: groupData } = useGroup(presetGroupId);

  // Merge friends + group members (deduped)
  const payeeCandidates = useMemo(() => {
    const friendList = friends ?? [];
    if (!presetGroupId || !groupData?.members) return friendList;
    const idSet = new Set(friendList.map((f) => f.id));
    const fromGroup = (groupData.members as any[])
      .filter((m) => m.user && !idSet.has(m.user.id))
      .map((m) => ({ id: m.user.id, displayName: m.user.displayName, email: m.user.email ?? '' }));
    return [...friendList, ...fromGroup];
  }, [friends, groupData, presetGroupId]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      payeeId: sp.get('payeeId') ?? '',
      amount: sp.get('amount') ?? '',
      currency: sp.get('currency') ?? 'USD',
      method: 'CASH',
      groupId: presetGroupId,
      notes: '',
    },
  });

  const selectedMethod = watch('method');

  function onSubmit(data: FormData) {
    createSettlement.mutate({
      payeeId: data.payeeId,
      amount: parseFloat(data.amount),
      currency: data.currency,
      method: data.method,
      groupId: data.groupId || undefined,
      notes: data.notes || undefined,
    }, {
      onSuccess: (s) => router.push(`/settlements/${s.id}`),
    });
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Record Settlement</h1>
        <p className="text-muted-foreground mt-1">Log a payment you made to someone.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Recipient */}
        <div className="space-y-1.5">
          <Label>Paying to *</Label>
          <select {...register('payeeId')} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select a person...</option>
            {payeeCandidates.map((f) => (
              <option key={f.id} value={f.id}>{f.displayName} ({f.email})</option>
            ))}
          </select>
          {errors.payeeId && <p className="text-xs text-destructive">{errors.payeeId.message}</p>}
        </div>

        {/* Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Amount *</Label>
            <Input {...register('amount')} placeholder="0.00" type="number" step="0.01" min="0.01" />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <select {...register('currency')} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-1.5">
          <Label>Payment Method</Label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m} type="button"
                onClick={() => setValue('method', m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  selectedMethod === m
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Group (optional) */}
        <div className="space-y-1.5">
          <Label>Group (optional)</Label>
          <select {...register('groupId')} className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">No group</option>
            {groups?.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <textarea {...register('notes')} rows={3} placeholder="Add a note..." className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={createSettlement.isPending}>
            {createSettlement.isPending ? 'Recording...' : 'Record Settlement'}
          </Button>
        </div>
      </form>
    </div>
  );
}
