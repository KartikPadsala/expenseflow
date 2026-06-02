import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfMonth, endOfMonth } from '@expenseflow/shared';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSpending(userId: string, period: 'month' | 'year' = 'month', groupId?: string) {
    const start = period === 'month' ? startOfMonth() : new Date(new Date().getFullYear(), 0, 1);
    const end = period === 'month' ? endOfMonth() : new Date(new Date().getFullYear(), 11, 31);

    const where: Record<string, unknown> = {
      isDeleted: false,
      date: { gte: start, lte: end },
      participants: { some: { userId } },
    };
    if (groupId) where.groupId = groupId;

    const expenses = await this.prisma.expense.findMany({
      where,
      include: { participants: { where: { userId } }, category: true },
    });

    const total = expenses.reduce((sum, e) => {
      const participant = e.participants[0];
      return sum + (participant ? Number(participant.owedAmount) : 0);
    }, 0);

    return { total, period, expenseCount: expenses.length };
  }

  async getCategoryBreakdown(userId: string, period: 'month' | 'year' = 'month') {
    const start = period === 'month' ? startOfMonth() : new Date(new Date().getFullYear(), 0, 1);
    const end = period === 'month' ? endOfMonth() : new Date(new Date().getFullYear(), 11, 31);

    const expenses = await this.prisma.expense.findMany({
      where: { isDeleted: false, date: { gte: start, lte: end }, participants: { some: { userId } } },
      include: { participants: { where: { userId } }, category: true },
    });

    const categoryMap = new Map<string, { name: string; icon: string; color: string; total: number }>();
    for (const expense of expenses) {
      const amount = expense.participants[0] ? Number(expense.participants[0].owedAmount) : 0;
      const key = expense.categoryId || 'uncategorized';
      const existing = categoryMap.get(key) || {
        name: expense.category?.name || 'Other',
        icon: expense.category?.icon || '📦',
        color: expense.category?.color || '#6b7280',
        total: 0,
      };
      categoryMap.set(key, { ...existing, total: existing.total + amount });
    }

    return Array.from(categoryMap.entries()).map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total);
  }

  async getTrends(userId: string, months = 6) {
    const results: { month: string; total: number; count: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const expenses = await this.prisma.expense.findMany({
        where: { isDeleted: false, date: { gte: start, lte: end }, participants: { some: { userId } } },
        include: { participants: { where: { userId } } },
      });

      const total = expenses.reduce((s, e) => s + (e.participants[0] ? Number(e.participants[0].owedAmount) : 0), 0);
      results.push({ month: start.toISOString().slice(0, 7), total, count: expenses.length });
    }
    return results;
  }

  async getTopExpenses(userId: string, limit = 10) {
    return this.prisma.expense.findMany({
      where: { isDeleted: false, participants: { some: { userId } } },
      include: { category: true, paidBy: { select: { displayName: true } } },
      orderBy: { amount: 'desc' },
      take: limit,
    });
  }
}
