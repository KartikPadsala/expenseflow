'use client';
import { useCurrentUser } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@expenseflow/shared';

export default function ProfilePage() {
  const { data: user } = useCurrentUser();

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Profile</h1>
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
            { label: 'Default Currency', value: user.defaultCurrency },
            { label: 'Language', value: user.language },
            { label: 'Timezone', value: user.timezone },
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
    </div>
  );
}
