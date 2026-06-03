import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfMonth, endOfMonth } from '@expenseflow/shared';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private exchangeRatesService: ExchangeRatesService,
  ) {}

  async getSpending(userId: string, period: 'month' | 'year' = 'month', groupId?: string) {
    const start = period === 'month' ? startOfMonth() : new Date(new Date().getFullYear(), 0, 1);
    const end = period === 'month' ? endOfMonth() : new Date(new Date().getFullYear(), 11, 31);

    const where: Record<string, unknown> = {
      isDeleted: false,
      date: { gte: start, lte: end },
      participants: { some: { userId } },
    };
    if (groupId) where.groupId = groupId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });
    const userCurrency = user?.defaultCurrency ?? 'USD';

    const expenses = await this.prisma.expense.findMany({
      where,
      include: { participants: { where: { userId } }, category: true },
    });

    const amounts = await Promise.all(
      expenses.map(async (e) => {
        const participant = e.participants[0];
        if (!participant) return 0;
        return this.toUserCurrency(
          Number(participant.owedAmount),
          e.currency,
          userCurrency,
          { exchangeRate: (e as any).exchangeRate, baseCurrency: (e as any).baseCurrency, date: e.date },
        );
      }),
    );

    const total = amounts.reduce((sum, a) => sum + a, 0);
    return { total: Math.round(total * 100) / 100, period, expenseCount: expenses.length, currency: userCurrency };
  }

  async getCategoryBreakdown(userId: string, period: 'month' | 'year' = 'month') {
    const start = period === 'month' ? startOfMonth() : new Date(new Date().getFullYear(), 0, 1);
    const end = period === 'month' ? endOfMonth() : new Date(new Date().getFullYear(), 11, 31);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });
    const userCurrency = user?.defaultCurrency ?? 'USD';

    const expenses = await this.prisma.expense.findMany({
      where: { isDeleted: false, date: { gte: start, lte: end }, participants: { some: { userId } } },
      include: { participants: { where: { userId } }, category: true },
    });

    const categoryMap = new Map<string, { name: string; icon: string; color: string; total: number }>();

    await Promise.all(
      expenses.map(async (expense) => {
        const raw = expense.participants[0] ? Number(expense.participants[0].owedAmount) : 0;
        const amount = await this.toUserCurrency(raw, expense.currency, userCurrency, {
          exchangeRate: (expense as any).exchangeRate,
          baseCurrency: (expense as any).baseCurrency,
          date: expense.date,
        });
        const key = expense.categoryId || 'uncategorized';
        const existing = categoryMap.get(key) || {
          name: expense.category?.name || 'Other',
          icon: expense.category?.icon || '📦',
          color: expense.category?.color || '#6b7280',
          total: 0,
        };
        categoryMap.set(key, { ...existing, total: existing.total + amount });
      }),
    );

    return Array.from(categoryMap.entries())
      .map(([id, data]) => ({ id, ...data, total: Math.round(data.total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  }

  async getTrends(userId: string, months = 6) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });
    const userCurrency = user?.defaultCurrency ?? 'USD';

    const results: { month: string; total: number; count: number; currency: string }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const expenses = await this.prisma.expense.findMany({
        where: { isDeleted: false, date: { gte: start, lte: end }, participants: { some: { userId } } },
        include: { participants: { where: { userId } } },
      });

      const amounts = await Promise.all(
        expenses.map(async (e) => {
          const raw = e.participants[0] ? Number(e.participants[0].owedAmount) : 0;
          return this.toUserCurrency(raw, e.currency, userCurrency, {
            exchangeRate: (e as any).exchangeRate,
            baseCurrency: (e as any).baseCurrency,
            date: e.date,
          });
        }),
      );

      const total = amounts.reduce((s, a) => s + a, 0);
      results.push({ month: start.toISOString().slice(0, 7), total: Math.round(total * 100) / 100, count: expenses.length, currency: userCurrency });
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

  private async toUserCurrency(
    amount: number,
    expenseCurrency: string,
    userCurrency: string,
    expense: { exchangeRate: any; baseCurrency: string | null; date: Date },
  ): Promise<number> {
    if (expenseCurrency === userCurrency) return amount;

    // Use stored rate when it covers the right conversion
    if (expense.baseCurrency === userCurrency && expense.exchangeRate) {
      return Math.round(amount * Number(expense.exchangeRate) * 100) / 100;
    }

    // Otherwise fetch rate for expense date
    const { convertedAmount } = await this.exchangeRatesService.convertAmount(
      amount,
      expenseCurrency,
      userCurrency,
      expense.date.toISOString().slice(0, 10),
    );
    return convertedAmount;
  }
}
