'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SpendingPieChartProps {
  data: Array<{ id: string; name: string; color: string; total: number }>;
}

export function SpendingPieChart({ data }: SpendingPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={100}
          dataKey="total"
          nameKey="name"
          label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
