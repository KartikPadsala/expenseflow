'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useRecurringExpense, useUpdateRecurring } from '@/hooks/use-recurring';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CURRENCIES } from '@expenseflow/shared';

const CURRENCY_CODES = Object.keys(CURRENCIES);

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
] as const;

const schema = z.object({
  description: z.string().min(1, 'Required').max(120),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Enter a valid amount'),
  currency: z.string().length(3),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  endDate: z.string().optional(),
  notes: z.string().max(300).optional(),
});
type FormValues = z.infer<typeof schema>;

export default function EditRecurringPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: r, isLoading } = useRecurringExpense(id);
  const { mutate: update, isPending } = useUpdateRecurring();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      amount: '',
      currency: 'USD',
      frequency: 'MONTHLY',
      endDate: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (r) {
      reset({
        description: r.description,
        amount: String(r.amount),
        currency: r.currency,
        frequency: r.frequency as any,
        endDate: r.endDate ? r.endDate.slice(0, 10) : '',
        notes: r.notes ?? '',
      });
    }
  }, [r, reset]);

  function onSubmit(values: FormValues) {
    update({
      id,
      description: values.description,
      amount: Number(values.amount),
      currency: values.currency,
      frequency: values.frequency,
      endDate: values.endDate || undefined,
      notes: values.notes || undefined,
    }, {
      onSuccess: () => router.push(`/recurring/${id}`),
      onError: (err: any) => alert(err?.response?.data?.message ?? 'Failed to update'),
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!r) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-destructive">Recurring expense not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/recurring')}>Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/recurring/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Edit Recurring Expense</h1>
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
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        field.value === f.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )} />
            </div>

            <div>
              <Label>End Date (optional)</Label>
              <Input {...register('endDate')} type="date" className="mt-1 max-w-xs" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.push(`/recurring/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
