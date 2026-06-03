'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const defaultFlags = [
  { id: 'receipt_scanning', label: 'Receipt Scanning', description: 'Enable AI-powered receipt scanning', enabled: true },
  { id: 'multi_currency', label: 'Multi-Currency', description: 'Support multiple currencies', enabled: true },
  { id: 'recurring_expenses', label: 'Recurring Expenses', description: 'Automatic recurring expense creation', enabled: true },
  { id: 'google_oauth', label: 'Google Login', description: 'Allow Google OAuth sign-in', enabled: true },
  { id: 'push_notifications', label: 'Push Notifications', description: 'Send mobile push notifications', enabled: false },
];

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState(defaultFlags);
  const toggle = (id: string) => setFlags(flags.map((f) => f.id === id ? { ...f, enabled: !f.enabled } : f));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Feature Flags</h1>
      <div className="space-y-4">
        {flags.map((flag) => (
          <Card key={flag.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{flag.label}</p>
                <p className="text-sm text-muted-foreground">{flag.description}</p>
              </div>
              <button
                onClick={() => toggle(flag.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${flag.enabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${flag.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
