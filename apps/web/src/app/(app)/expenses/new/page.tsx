'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateExpense } from '@/hooks/use-expenses';
import { useGroups, useGroup } from '@/hooks/use-groups';
import { useAuthStore } from '@/store/auth.store';
import { useScanReceipt } from '@/hooks/use-ocr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Calculator, ScanLine, Loader2 } from 'lucide-react';

const SPLIT_METHODS = ['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES'] as const;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'SGD', 'CHF', 'HKD'];

function todayISO() { return new Date().toISOString().slice(0, 10); }

const schema = z.object({
  description: z.string().min(1, 'Required').max(120),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  currency: z.string().length(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  splitMethod: z.enum(['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES']),
  notes: z.string().max(300).optional(),
});
type FormValues = z.infer<typeof schema>;

interface Participant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  customAmount?: number;
  sharePercent?: number;
  shares?: number;
}

function calculateSplitLocal(
  totalAmount: number,
  participants: Participant[],
  method: string,
): Array<{ participantId: string; owedAmount: number; sharePercent?: number; shares?: number }> {
  if (participants.length === 0 || totalAmount <= 0) return [];

  if (method === 'EQUAL') {
    const share = Math.round((totalAmount / participants.length) * 100) / 100;
    const remainder = Math.round((totalAmount - share * participants.length) * 100) / 100;
    return participants.map((p, i) => ({
      participantId: p.userId,
      owedAmount: i === 0 ? share + remainder : share,
      sharePercent: 100 / participants.length,
    }));
  }

  if (method === 'UNEQUAL') {
    return participants.map((p) => ({ participantId: p.userId, owedAmount: p.customAmount ?? 0 }));
  }

  if (method === 'PERCENTAGE') {
    return participants.map((p) => {
      const pct = p.sharePercent ?? (100 / participants.length);
      return {
        participantId: p.userId,
        owedAmount: Math.round((totalAmount * pct / 100) * 100) / 100,
        sharePercent: pct,
      };
    });
  }

  if (method === 'SHARES') {
    const totalShares = participants.reduce((s, p) => s + (p.shares ?? 1), 0);
    return participants.map((p) => ({
      participantId: p.userId,
      owedAmount: Math.round((totalAmount * (p.shares ?? 1) / totalShares) * 100) / 100,
      shares: p.shares ?? 1,
    }));
  }

  return [];
}

export default function NewExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const createExpense = useCreateExpense();
  const scanReceipt = useScanReceipt();
  const { data: groups } = useGroups();

  const defaultGroupId = searchParams.get('groupId') ?? '';
  const [selectedGroupId, setSelectedGroupId] = useState(defaultGroupId);
  const { data: groupData } = useGroup(selectedGroupId);

  const [participants, setParticipants] = useState<Participant[]>([
    { userId: user?.id ?? '', displayName: user?.displayName ?? 'You' },
  ]);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: '', amount: '', currency: 'USD', date: todayISO(), splitMethod: 'EQUAL', notes: '' },
  });

  const splitMethod = watch('splitMethod');
  const amount = parseFloat(watch('amount')) || 0;
  const currency = watch('currency');

  useEffect(() => {
    if (groupData?.members) {
      setParticipants(
        groupData.members.map((m: any) => ({
          userId: m.user?.id ?? m.userId,
          displayName: m.user?.displayName ?? 'Member',
          avatarUrl: m.user?.avatarUrl,
          shares: 1,
        })),
      );
    }
  }, [groupData]);

  const splitPreview = calculateSplitLocal(amount, participants, splitMethod);
  const totalAllocated = splitPreview.reduce((s, r) => s + r.owedAmount, 0);
  const splitValid = participants.length === 0 || Math.abs(totalAllocated - amount) < 0.02 || amount === 0;

  function toggleParticipant(member: any) {
    const id = member.user?.id ?? member.userId;
    if (id === user?.id) return;
    setParticipants((prev) => {
      const exists = prev.find((p) => p.userId === id);
      if (exists) return prev.filter((p) => p.userId !== id);
      return [...prev, { userId: id, displayName: member.user?.displayName ?? 'Member', avatarUrl: member.user?.avatarUrl, shares: 1 }];
    });
  }

  function onSubmit(data: FormValues) {
    const participantsPayload = splitPreview.map((r) => ({
      userId: r.participantId,
      owedAmount: r.owedAmount,
      sharePercent: r.sharePercent,
      shares: r.shares,
    }));

    createExpense.mutate({
      description: data.description,
      amount: parseFloat(data.amount),
      currency: data.currency,
      date: data.date,
      splitMethod: data.splitMethod as any,
      notes: data.notes || undefined,
      groupId: selectedGroupId || undefined,
      participants: participantsPayload,
    } as any, {
      onSuccess: () => router.push(selectedGroupId ? `/groups/${selectedGroupId}` : '/expenses'),
      onError: (e: any) => alert(e?.response?.data?.message ?? 'Failed to create expense'),
    });
  }

  function handleReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrError(null);
    scanReceipt.mutate(file, {
      onSuccess: (result) => {
        if (result.merchant) setValue('description', result.merchant);
        if (result.total) setValue('amount', String(result.total));
        if (result.currency?.length === 3) setValue('currency', result.currency);
        if (result.date) setValue('date', result.date.slice(0, 10));
      },
      onError: (err) => setOcrError(err.message),
    });
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Add Expense</h1>
        <div className="ml-auto">
          <label htmlFor="receipt-upload" className="cursor-pointer">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={scanReceipt.isPending}
              asChild
            >
              <span>
                {scanReceipt.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Scanning…</>
                  : <><ScanLine className="h-4 w-4" /> Scan Receipt</>
                }
              </span>
            </Button>
            <input
              id="receipt-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              onChange={handleReceiptFile}
            />
          </label>
        </div>
      </div>
      {ocrError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-2 text-sm text-destructive">
          {ocrError}
        </div>
      )}
      {scanReceipt.isSuccess && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          Receipt scanned — fields pre-filled. Please review before saving.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Description *</Label>
              <Controller control={control} name="description" render={({ field }) => (
                <Input {...field} placeholder="e.g. Dinner at Mario's" className="mt-1" />
              )} />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount *</Label>
                <Controller control={control} name="amount" render={({ field }) => (
                  <Input {...field} type="number" step="0.01" placeholder="0.00" className="mt-1" />
                )} />
                {errors.amount && <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>}
              </div>
              <div>
                <Label>Currency</Label>
                <Controller control={control} name="currency" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Controller control={control} name="date" render={({ field }) => (
                  <Input {...field} type="date" className="mt-1" />
                )} />
              </div>
              <div>
                <Label>Group (optional)</Label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="No group" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No group</SelectItem>
                    {(groups ?? []).map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Controller control={control} name="notes" render={({ field }) => (
                <textarea {...field} rows={2} placeholder="Add a note..." className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
              )} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-4 w-4" />Split Method</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Controller control={control} name="splitMethod" render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {SPLIT_METHODS.map((m) => (
                  <button key={m} type="button"
                    onClick={() => field.onChange(m)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      field.value === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            )} />

            {selectedGroupId && groupData?.members && (
              <div>
                <Label className="mb-2 block">Participants</Label>
                <div className="space-y-2">
                  {groupData.members.map((m: any) => {
                    const memberId = m.user?.id ?? m.userId;
                    const isSelected = participants.some((p) => p.userId === memberId);
                    const participant = participants.find((p) => p.userId === memberId);
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg border">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleParticipant(m)}
                          disabled={memberId === user?.id} className="h-4 w-4 rounded" />
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{m.user?.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm">{memberId === user?.id ? 'You' : m.user?.displayName}</span>

                        {isSelected && splitMethod === 'UNEQUAL' && (
                          <Input type="number" step="0.01" placeholder="Amount" className="w-24 h-7 text-xs"
                            value={participant?.customAmount ?? ''}
                            onChange={(e) => setParticipants((prev) => prev.map((p) =>
                              p.userId === memberId ? { ...p, customAmount: parseFloat(e.target.value) || 0 } : p
                            ))}
                          />
                        )}
                        {isSelected && splitMethod === 'PERCENTAGE' && (
                          <Input type="number" step="1" placeholder="%" className="w-20 h-7 text-xs"
                            value={participant?.sharePercent ?? ''}
                            onChange={(e) => setParticipants((prev) => prev.map((p) =>
                              p.userId === memberId ? { ...p, sharePercent: parseFloat(e.target.value) || 0 } : p
                            ))}
                          />
                        )}
                        {isSelected && splitMethod === 'SHARES' && (
                          <Input type="number" step="1" placeholder="Shares" className="w-20 h-7 text-xs"
                            value={participant?.shares ?? 1}
                            onChange={(e) => setParticipants((prev) => prev.map((p) =>
                              p.userId === memberId ? { ...p, shares: parseInt(e.target.value) || 1 } : p
                            ))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {splitPreview.length > 0 && amount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Split Preview
                {!splitValid && (
                  <Badge variant="destructive" className="text-xs">
                    {Math.abs(totalAllocated - amount).toFixed(2)} {currency} unallocated
                  </Badge>
                )}
                {splitValid && <Badge variant="secondary" className="text-xs">✓ Balanced</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {splitPreview.map((r) => {
                const p = participants.find((x) => x.userId === r.participantId);
                const name = r.participantId === user?.id ? 'You' : (p?.displayName ?? r.participantId);
                return (
                  <div key={r.participantId} className="flex items-center justify-between text-sm py-0.5">
                    <span>{name}</span>
                    <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(r.owedAmount)}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full" disabled={createExpense.isPending}>
          {createExpense.isPending ? 'Saving...' : 'Add Expense'}
        </Button>
      </form>
    </div>
  );
}
