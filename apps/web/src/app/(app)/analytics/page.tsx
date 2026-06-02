'use client';
import { useState } from 'react';
import { useCategoryAnalytics, useSpendingAnalytics, useTrendsAnalytics } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SpendingPieChart } from '@/components/analytics/spending-pie-chart';
import { SpendingTrendChart } from '@/components/analytics/spending-trend-chart';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@expenseflow/shared';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const { data: spending } = useSpendingAnalytics(period);
  const { data: categories } = useCategoryAnalytics(period);
  const { data: trends } = useTrendsAnalytics(6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          <Button variant={period === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('month')}>This Month</Button>
          <Button variant={period === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('year')}>This Year</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Spending</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-primary">{formatCurrency(spending?.total || 0, 'USD')}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Expenses</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{spending?.expenseCount || 0}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
          <CardContent>{categories && <SpendingPieChart data={categories} />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
          <CardContent>{trends && <SpendingTrendChart data={trends} />}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories?.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className="text-sm font-semibold">{formatCurrency(cat.total, 'USD')}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (cat.total / (spending?.total || 1)) * 100)}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
