import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, ListExpensesDto } from './dto';
import { calculateSplit, validateSplit } from '@expenseflow/shared';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEvents, ExpenseCreatedEvent, ExpenseUpdatedEvent, ExpenseDeletedEvent } from '../notifications/events/notification.events';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private exchangeRatesService: ExchangeRatesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateExpenseDto) {
    const { participants, ...expenseData } = dto;

    const splitResults = calculateSplit({
      totalAmount: dto.amount,
      participantIds: participants.map((p) => p.userId),
      method: dto.splitMethod,
      customAmounts: dto.splitMethod !== 'EQUAL' && dto.splitMethod !== 'PERCENTAGE' && dto.splitMethod !== 'SHARES'
        ? Object.fromEntries(participants.map((p) => [p.userId, p.owedAmount || 0]))
        : undefined,
      percentages: dto.splitMethod === 'PERCENTAGE'
        ? Object.fromEntries(participants.map((p) => [p.userId, p.sharePercent || 0]))
        : undefined,
      shares: dto.splitMethod === 'SHARES'
        ? Object.fromEntries(participants.map((p) => [p.userId, p.shares || 1]))
        : undefined,
    });

    if (!validateSplit(splitResults, dto.amount)) {
      throw new BadRequestException(
        `Split amounts (${splitResults.reduce((s, r) => s + r.owedAmount, 0).toFixed(2)}) do not sum to the total expense amount (${dto.amount.toFixed(2)})`,
      );
    }

    // Look up the payer's base currency for conversion
    const payer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });
    const userBaseCurrency = payer?.defaultCurrency ?? 'USD';

    let convertedAmount: number | undefined;
    let exchangeRateValue: number | undefined;
    const expenseBaseCurrency = userBaseCurrency;

    if (expenseData.currency && expenseData.currency !== userBaseCurrency) {
      const result = await this.exchangeRatesService.convertAmount(
        expenseData.amount,
        expenseData.currency,
        userBaseCurrency,
        expenseData.date,
      );
      convertedAmount = result.convertedAmount;
      exchangeRateValue = result.rate;
    }

    const expense = await this.prisma.expense.create({
      data: {
        description: expenseData.description,
        amount: expenseData.amount,
        currency: expenseData.currency,
        date: new Date(dto.date),
        splitMethod: expenseData.splitMethod,
        notes: expenseData.notes,
        ...(expenseData.groupId ? { groupId: expenseData.groupId } : {}),
        ...(expenseData.categoryId ? { categoryId: expenseData.categoryId } : {}),
        ...(convertedAmount !== undefined ? {
          convertedAmount,
          baseCurrency: expenseBaseCurrency,
          exchangeRate: exchangeRateValue,
        } : {}),
        paidById: userId,
        createdById: userId,
        participants: {
          create: splitResults.map((r) => ({
            userId: r.participantId,
            owedAmount: r.owedAmount,
            paidAmount: r.participantId === userId ? r.owedAmount : 0,
            sharePercent: r.sharePercent,
            shares: r.shares,
          })),
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
        category: true,
        paidBy: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    this.eventEmitter.emit(
      NotificationEvents.EXPENSE_CREATED,
      new ExpenseCreatedEvent(
        expense.id,
        expense.groupId ?? null,
        expense.description,
        Number(expense.amount),
        expense.currency,
        expense.paidById,
        expense.participants.map((p: any) => p.userId),
        userId,
      ),
    );

    return expense;
  }

  async findAll(userId: string, query: ListExpensesDto) {
    const where: Record<string, unknown> = {
      isDeleted: false,
      OR: [{ paidById: userId }, { participants: { some: { userId } } }],
    };

    if (query.groupId) where.groupId = query.groupId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.search) where.description = { contains: query.search, mode: 'insensitive' };
    if (query.fromDate || query.toDate) {
      where.date = {
        ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
        ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
      };
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          participants: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
          category: true,
          paidBy: { select: { id: true, displayName: true, avatarUrl: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(expenseId: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        isDeleted: false,
        OR: [{ paidById: userId }, { participants: { some: { userId } } }],
      },
      include: {
        participants: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
        items: { include: { participants: true } },
        attachments: true,
        category: true,
        paidBy: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(expenseId: string, userId: string, dto: UpdateExpenseDto) {
    const expense = await this.findOne(expenseId, userId);
    if (expense.createdById !== userId) {
      throw new ForbiddenException('Only the creator can edit this expense');
    }

    const { participants, ...expenseData } = dto;

    const splitResults = calculateSplit({
      totalAmount: dto.amount,
      participantIds: participants.map((p) => p.userId),
      method: dto.splitMethod,
      customAmounts: dto.splitMethod !== 'EQUAL' && dto.splitMethod !== 'PERCENTAGE' && dto.splitMethod !== 'SHARES'
        ? Object.fromEntries(participants.map((p) => [p.userId, p.owedAmount || 0]))
        : undefined,
      percentages: dto.splitMethod === 'PERCENTAGE'
        ? Object.fromEntries(participants.map((p) => [p.userId, p.sharePercent || 0]))
        : undefined,
      shares: dto.splitMethod === 'SHARES'
        ? Object.fromEntries(participants.map((p) => [p.userId, p.shares || 1]))
        : undefined,
    });

    if (!validateSplit(splitResults, dto.amount)) {
      throw new BadRequestException(
        `Split amounts (${splitResults.reduce((s, r) => s + r.owedAmount, 0).toFixed(2)}) do not sum to the total expense amount (${dto.amount.toFixed(2)})`,
      );
    }

    // Preserve existing paidAmount so editing metadata doesn't erase payment history
    const existingParticipants = await this.prisma.expenseParticipant.findMany({
      where: { expenseId },
      select: { userId: true, paidAmount: true, isSettled: true },
    });
    const existingPaidMap = new Map(
      existingParticipants.map((p) => [p.userId, { paidAmount: Number(p.paidAmount), isSettled: p.isSettled }]),
    );

    const newPaidById = (expenseData as any).paidById ?? expense.paidById;

    // Re-compute conversion if currency or amount changed
    const payer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { defaultCurrency: true },
    });
    const userBaseCurrency = payer?.defaultCurrency ?? 'USD';

    let convertedAmount: number | undefined;
    let exchangeRateValue: number | undefined;

    if (expenseData.currency && expenseData.currency !== userBaseCurrency) {
      const result = await this.exchangeRatesService.convertAmount(
        expenseData.amount,
        expenseData.currency,
        userBaseCurrency,
        expenseData.date,
      );
      convertedAmount = result.convertedAmount;
      exchangeRateValue = result.rate;
    }

    await this.prisma.expenseParticipant.deleteMany({ where: { expenseId } });

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        description: expenseData.description,
        amount: expenseData.amount,
        currency: expenseData.currency,
        date: new Date(dto.date),
        splitMethod: expenseData.splitMethod,
        notes: expenseData.notes,
        ...(expenseData.groupId !== undefined ? { groupId: expenseData.groupId } : {}),
        ...(expenseData.categoryId !== undefined ? { categoryId: expenseData.categoryId } : {}),
        ...(convertedAmount !== undefined ? {
          convertedAmount,
          baseCurrency: userBaseCurrency,
          exchangeRate: exchangeRateValue,
        } : { convertedAmount: null, baseCurrency: null, exchangeRate: null }),
        participants: {
          create: splitResults.map((r) => ({
            userId: r.participantId,
            owedAmount: r.owedAmount,
            // Payer always gets paidAmount = owedAmount; preserve existing for others (capped at new owedAmount)
            paidAmount: r.participantId === newPaidById
              ? r.owedAmount
              : Math.min(existingPaidMap.get(r.participantId)?.paidAmount ?? 0, r.owedAmount),
            isSettled: r.participantId === newPaidById
              ? false
              : (existingPaidMap.get(r.participantId)?.isSettled ?? false),
            sharePercent: r.sharePercent,
          })),
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
        category: true,
        paidBy: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    this.eventEmitter.emit(
      NotificationEvents.EXPENSE_UPDATED,
      new ExpenseUpdatedEvent(
        updated.id,
        updated.groupId ?? null,
        updated.description,
        userId,
        updated.participants.map((p: any) => p.userId),
      ),
    );

    return updated;
  }

  async delete(expenseId: string, userId: string) {
    const expense = await this.findOne(expenseId, userId);
    if (expense.createdById !== userId) {
      throw new ForbiddenException('Only the creator can delete this expense');
    }
    await this.prisma.expense.update({ where: { id: expenseId }, data: { isDeleted: true } });

    this.eventEmitter.emit(
      NotificationEvents.EXPENSE_DELETED,
      new ExpenseDeletedEvent(
        expenseId,
        expense.description,
        userId,
        expense.participants?.map((p: any) => p.userId) ?? [],
      ),
    );

    return { message: 'Expense deleted' };
  }

  async duplicate(expenseId: string, userId: string) {
    const original = await this.findOne(expenseId, userId);
    return this.create(userId, {
      description: `${original.description} (copy)`,
      amount: Number(original.amount),
      currency: original.currency,
      date: new Date().toISOString(),
      groupId: original.groupId || undefined,
      categoryId: original.categoryId || undefined,
      splitMethod: original.splitMethod,
      notes: original.notes || undefined,
      participants: original.participants.map((p) => ({
        userId: p.userId,
        owedAmount: Number(p.owedAmount),
        sharePercent: p.sharePercent !== null ? Number(p.sharePercent) : undefined,
        shares: (p as any).shares !== null ? Number((p as any).shares) : undefined,
      })),
    });
  }
}
