import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, ListExpensesDto } from './dto';
import { calculateSplit } from '@expenseflow/shared';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.expense.create({
      data: {
        description: expenseData.description,
        amount: expenseData.amount,
        currency: expenseData.currency,
        date: new Date(dto.date),
        splitMethod: expenseData.splitMethod,
        notes: expenseData.notes,
        ...(expenseData.groupId ? { groupId: expenseData.groupId } : {}),
        ...(expenseData.categoryId ? { categoryId: expenseData.categoryId } : {}),
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
    });

    await this.prisma.expenseParticipant.deleteMany({ where: { expenseId } });

    return this.prisma.expense.update({
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
        participants: {
          create: splitResults.map((r) => ({
            userId: r.participantId,
            owedAmount: r.owedAmount,
            paidAmount: 0,
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
  }

  async delete(expenseId: string, userId: string) {
    const expense = await this.findOne(expenseId, userId);
    if (expense.createdById !== userId) {
      throw new ForbiddenException('Only the creator can delete this expense');
    }
    await this.prisma.expense.update({ where: { id: expenseId }, data: { isDeleted: true } });
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
      })),
    });
  }
}
