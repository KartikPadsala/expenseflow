'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Logs</h1>
      <Card>
        <CardHeader><CardTitle>System Activity</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Audit log viewer requires direct database access. Configure your database connection to view logs here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
