'use client';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateGroup } from '@/hooks/use-groups';
import { GROUP_TYPES } from '@expenseflow/shared';

export default function NewGroupPage() {
  const { mutate: createGroup, isPending } = useCreateGroup();
  const router = useRouter();
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: { name: '', type: 'OTHER', currency: 'USD', description: '' },
  });
  const selectedType = watch('type');

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create Group</h1>
      <Card>
        <CardHeader><CardTitle>Group Details</CardTitle></CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((data) =>
              createGroup(data, { onSuccess: (g) => router.push(`/groups/${g.id}`) })
            )}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input placeholder="e.g. Europe Trip 2024" {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <div className="grid grid-cols-5 gap-2">
                {GROUP_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setValue('type', t.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${selectedType === t.value ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'}`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="text-xs">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Currency</label>
              <Input placeholder="USD" {...register('currency')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input placeholder="What's this group for?" {...register('description')} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
