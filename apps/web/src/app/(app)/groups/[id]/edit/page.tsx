'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGroup, useUpdateGroup, useArchiveGroup } from '@/hooks/use-groups';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];
const schema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  currency: z.string().length(3),
});
type FormValues = z.infer<typeof schema>;

export default function EditGroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: group } = useGroup(id);
  const updateGroup = useUpdateGroup();
  const archiveGroup = useArchiveGroup();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', currency: 'USD' },
  });

  useEffect(() => {
    if (group) reset({ name: group.name, description: group.description ?? '', currency: group.currency ?? 'USD' });
  }, [group]);

  function onSubmit(data: FormValues) {
    updateGroup.mutate({ id, ...data }, {
      onSuccess: () => { alert('Group updated'); router.push(`/groups/${id}`); },
      onError: (e: any) => alert(e?.response?.data?.message ?? 'Update failed'),
    });
  }

  function handleArchive() {
    if (!confirm('Archive this group?')) return;
    archiveGroup.mutate(id, { onSuccess: () => { alert('Group archived'); router.push('/groups'); } });
  }

  if (!group) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  const isOwner = group.members?.find((m: any) => m.userId === user?.id)?.role === 'OWNER';

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Edit Group</h1>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Group Name *</Label>
              <Controller control={control} name="name" render={({ field }) => (
                <Input {...field} className="mt-1" />
              )} />
              {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Description</Label>
              <Controller control={control} name="description" render={({ field }) => (
                <textarea {...field} rows={2} className="mt-1 w-full rounded-md border px-3 py-2 text-sm resize-none" />
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
          </CardContent>
        </Card>
        <Button type="submit" className="w-full" disabled={updateGroup.isPending}>
          {updateGroup.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>

      {isOwner && (
        <Card className="border-destructive/30">
          <CardContent className="pt-6 space-y-3">
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
            <Button variant="outline" className="w-full border-amber-200 text-amber-700" onClick={handleArchive} disabled={archiveGroup.isPending}>
              Archive Group
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
