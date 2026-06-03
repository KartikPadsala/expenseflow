'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">System Settings</h1>
      <Card>
        <CardHeader><CardTitle>OCR Provider</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Provider</label>
            <Input defaultValue="openai" placeholder="openai | google | azure" />
          </div>
          <Button size="sm">Update</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Email Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {['SMTP Host', 'SMTP Port', 'From Email'].map((label) => (
            <div key={label} className="space-y-2">
              <label className="text-sm font-medium">{label}</label>
              <Input placeholder={label} />
            </div>
          ))}
          <Button size="sm">Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
