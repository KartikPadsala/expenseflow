'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useCreateRecurring } from '@/hooks/use-recurring';
import { useGroups } from '@/hooks/use-groups';
import { useCurrentUser } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CURRENCIES } from '@expenseflow/shared';

const CURRENCY_CODES = Object.keys(CURRENCIES);

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily', desc: 'Every day' },
  { value: 'WEEKLY', label: 'Weekly', desc: 'Every week' },
  { value: 'MONTHLY', label: 'Monthly', desc: 'Every month' },
  { value: 'QUARTERLY', label: 'Quarterly', desc: 'Every 3 months' },
  { value: 'YEARLY', label: 'Yearly', desc: 'Every year' },
] as const;

const SPLIT_METHODS = ['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES'] as const;

function todayISO() { return new Date().toISOString().slice(0, 10); }

const schema = z.object({
  description: z.string().min(1, 'Required').max(120),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  currency: z.string().length(3),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  splitMethod: z.enum(['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().optional(),
  notes: z.string().max(300).optional(),
});
type FormValues = z.infer<typeof schema>;

interface Participant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export default function NewRecurringPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { mutate: create, isPending } = useCreateRecurring();
  const { data: groups } = useGroups();

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      amount: '',
      currency: (user as any)?.defaultCurrency ?? 'USD',
      frequency: 'MONTHLY',
      splitMethod: 'EQUAL',
      startDate: todayISO(),
      endDate: '',
      notes: '',
    },
  });

  // Populate participants from group selection
  function handleGroupChange(groupId: string) {
    setSelectedGroupId(groupId);
    const group = (groups ?? []).find((g: any) => g.id === groupId);
    if (group?.members) {
      setParticipants(group.members.map((m: any) => ({
        userId: m.user?.id ?? m.userId,
        displayName: m.user?.displayName ?? m.displayName ?? 'Member',
        avatarUrl: m.user?.avatarUrl,
      })));
    } else {
      setParticipants([]);
    }
  }

  function toggleParticipant(p: Participant) {
    setParticipants((prev) => {
      const exists = prev.some((x) => x.userId === p.userId);
      return exists ? prev.filter((x) => x.userId !== p.userId) : [...prev, p];
    });
  }

  function onSubmit(values: FormValues) {
    // Ensure current user is always included
    const selfParticipant: Participant = {
      userId: user?.id ?? '',
      displayName: user?.displayName ?? 'Me',
    };
    const finalParticipants = participants.length > 0
      ? participants
      : [selfParticipant];

    create({
      description: values.description,
      amount: Number(values.amount),
      currency: values.currency,
      frequency: values.frequency,
      splitMethod: values.splitMethod,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      groupId: selectedGroupId || undefined,
      notes: values.notes || undefined,
      participants: finalParticipants.map((p) => ({ userId: p.userId })),
    }, {
      onSuccess: (r) => router.push(`/recurring/${r.id}`),
      onError: (err: any) => alert(err?.response?.data?.message ?? 'Failed to create'),
    });
  }

  // Get group members for participant selection
  const selectedGroup = (groups ?? []).find((g: any) => g.id === selectedGroupId);
  const groupMembers: Participant[] = selectedGroup?.members
    ? selectedGroup.members.map((m: any) => ({
        userId: m.user?.id ?? m.userId,
        displayName: m.user?.displayName ?? 'Member',
        avatarUrl: m.user?.avatarUrl,
      }))
    : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">New Recurring Expense</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Expense Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Description *</Label>
              <Input {...register('description')} placeholder="e.g. Monthly Rent" className="mt-1" />
              {errors.description && <p className="text-destructive text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount *</Label>
                <Input {...register('amount')} type="number" step="0.01" placeholder="0.00" className="mt-1" />
                {errors.amount && <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>}
              </div>
              <div>
                <Label>Currency</Label>
                <Controller control={control} name="currency" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {CURRENCY_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {CURRENCIES[code]?.flag} {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Input {...register('notes')} placeholder="Any notes…" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Frequency</Label>
              <Controller control={control} name="frequency" render={({ field }) => (
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {FREQUENCIES.map((f) => (
                    <button
                      key={f.value} type="button"
                      onClick={() => field.onChange(f.value)}
                      className={`flex flex-col items-center p-3 rounded-lg border-2 text-xs transition-colors ${
                        field.value === f.value
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <span className="font-medium">{f.label}</span>
                      <span className="text-muted-foreground mt-0.5">{f.desc}</span>
                    </button>
                  ))}
                </div>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input {...register('startDate')} type="date" className="mt-1" />
                {errors.startDate && <p className="text-destructive text-xs mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input {...register('endDate')} type="date" className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Splitting</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Split Method</Label>
              <Controller control={control} name="splitMethod" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPLIT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>

            <div>
              <Label>Group (optional)</Label>
              <Select value={selectedGroupId} onValueChange={handleGroupChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="No group (personal)" />
                </SelectTrigger>
                <SelectContent>
                  {(groups ?? []).map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {groupMembers.length > 0 && (
              <div>
                <Label className="mb-2 block">Participants (click to toggle)</Label>
                <div className="flex flex-wrap gap-2">
                  {groupMembers.map((m) => {
                    const selected = participants.some((p) => p.userId === m.userId);
                    return (
                      <button
                        key={m.userId} type="button"
                        onClick={() => toggleParticipant(m)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                          selected ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-xs">{m.displayName[0]}</AvatarFallback>
                        </Avatar>
                        {m.displayName}
                      </button>
                    );
                  })}
                </div>
                {participants.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">{participants.length} participant{participants.length !== 1 ? 's' : ''} selected</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? 'Creating…' : 'Create Recurring Expense'}
          </Button>
        </div>
      </form>
    </div>
  );
}
