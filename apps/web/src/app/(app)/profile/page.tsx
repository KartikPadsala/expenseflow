'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCurrentUser, useUpdateProfile } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate, CURRENCIES } from '@expenseflow/shared';
import { Pencil } from 'lucide-react';

const CURRENCY_CODES = Object.keys(CURRENCIES);
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'hi', label: 'Hindi' },
  { value: 'gu', label: 'Gujarati' },
];

const editSchema = z.object({
  displayName: z.string().min(2).max(50),
  defaultCurrency: z.string().length(3),
  language: z.string().min(2).max(5),
  timezone: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

export default function ProfilePage() {
  const { data: user, refetch } = useCurrentUser();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      displayName: '',
      defaultCurrency: 'USD',
      language: 'en',
      timezone: 'UTC',
    },
  });

  const openEdit = () => {
    if (!user) return;
    reset({
      displayName: user.displayName ?? '',
      defaultCurrency: user.defaultCurrency ?? 'USD',
      language: (user as any).language ?? 'en',
      timezone: (user as any).timezone ?? 'UTC',
    });
    setOpen(true);
  };

  const onSave = (data: EditForm) => {
    updateProfile(data, {
      onSuccess: () => { setOpen(false); refetch(); },
    });
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant="outline" size="sm" onClick={openEdit} className="gap-2">
          <Pencil className="h-4 w-4" /> Edit Profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
              {user.displayName?.[0]}
            </div>
            <div>
              <CardTitle>{user.displayName}</CardTitle>
              <p className="text-muted-foreground">@{user.username}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Email', value: user.email },
            { label: 'Default Currency', value: `${user.defaultCurrency} ${CURRENCIES[user.defaultCurrency]?.symbol ?? ''}`.trim() },
            { label: 'Language', value: LANGUAGES.find((l) => l.value === (user as any).language)?.label ?? (user as any).language ?? 'English' },
            { label: 'Timezone', value: (user as any).timezone ?? 'UTC' },
            { label: 'Member since', value: formatDate(new Date(user.createdAt)) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
          {user.isEmailVerified ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">✓ Email Verified</Badge>
          ) : (
            <Badge variant="destructive">Email Not Verified</Badge>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Display Name</Label>
              <Input {...register('displayName')} placeholder="Your name" />
              {errors.displayName && <p className="text-destructive text-xs">{errors.displayName.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Default Currency</Label>
              <Select value={watch('defaultCurrency')} onValueChange={(v) => setValue('defaultCurrency', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {CURRENCY_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {CURRENCIES[code]?.flag} {code} — {CURRENCIES[code]?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.defaultCurrency && <p className="text-destructive text-xs">{errors.defaultCurrency.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Language</Label>
              <Select value={watch('language')} onValueChange={(v) => setValue('language', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Timezone (optional)</Label>
              <Input {...register('timezone')} placeholder="e.g. America/New_York" />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
