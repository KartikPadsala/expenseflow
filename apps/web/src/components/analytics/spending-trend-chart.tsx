'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
  data: Array<{ month: string; total: number; count: number }>;
}

export function SpendingTrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spending']} />
        <Line type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
