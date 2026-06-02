'use client';
import { useGroups } from '@/hooks/use-groups';
import { useExpenses } from '@/hooks/use-expenses';
import { useSpendingAnalytics, useTrendsAnalytics } from '@/hooks/use-analytics';
import { useAuthStore } from '@/store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GroupCard } from '@/components/groups/group-card';
import { ExpenseCard } from '@/components/expenses/expense-card';
import { SpendingTrendChart } from '@/components/analytics/spending-trend-chart';
import { formatCurrency } from '@expenseflow/shared';
import { TrendingUp, Users, Receipt, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: groups } = useGroups();
  const { data: expenses } = useExpenses({ limit: 5 });
  const { data: spending } = useSpendingAnalytics('month');
  const { data: trends } = useTrendsAnalytics(6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.displayName?.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your expenses.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'This Month', value: formatCurrency(spending?.total || 0, 'USD'), icon: DollarSign, desc: `${spending?.expenseCount || 0} expenses` },
          { title: 'Groups', value: String(groups?.length || 0), icon: Users, desc: 'Active groups' },
          { title: 'Expenses', value: String(expenses?.total || 0), icon: Receipt, desc: 'Total tracked' },
          { title: 'Trend', value: '+0%', icon: TrendingUp, desc: 'vs last month' },
        ].map(({ title, value, icon: Icon, desc }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Spending Trend</CardTitle></CardHeader>
          <CardContent>{trends && <SpendingTrendChart data={trends} />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Groups</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groups?.slice(0, 3).map((g) => (
                <GroupCard key={g.id} group={g} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Expenses</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expenses?.data.map((e: any) => (
              <ExpenseCard key={e.id} expense={e} currentUserId={user?.id} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
