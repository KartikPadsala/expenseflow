import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';
import { CreateRecurringExpenseDto, UpdateRecurringExpenseDto } from './dto';
import { computeNextDate, isDue, isExpired, RecurringFrequency } from './recurring-date.utils';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private prisma: PrismaService,
    private expensesService: ExpensesService,
  ) {}

  async create(userId: string, dto: CreateRecurringExpenseDto) {
    const startDate = new Date(dto.startDate);
    startDate.setHours(0, 0, 0, 0);

    return this.prisma.recurringExpense.create({
      data: {
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency,
        frequency: dto.frequency as any,
        splitMethod: dto.splitMethod as any,
        nextDueDate: startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isActive: true,
        notes: dto.notes,
        participantsJson: dto.participants as any,
        createdById: userId,
        ...(dto.groupId ? { groupId: dto.groupId } : {}),
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        paidById: dto.paidById ?? userId,
      },
      include: this.includeFields(),
    });
  }

  async findAll(userId: string) {
    return this.prisma.recurringExpense.findMany({
      where: { createdById: userId },
      orderBy: { nextDueDate: 'asc' },
      include: this.includeFields(),
    });
  }

  async findOne(id: string, userId: string) {
    const r = await this.prisma.recurringExpense.findUnique({
      where: { id },
      include: { ...this.includeFields(), expenses: { orderBy: { date: 'desc' }, take: 10 } },
    });
    if (!r) throw new NotFoundException('Recurring expense not found');
    if (r.createdById !== userId) throw new ForbiddenException('Access denied');
    return r;
  }

  async update(id: string, userId: string, dto: UpdateRecurringExpenseDto) {
    await this.findOne(id, userId);
    return this.prisma.recurringExpense.update({
      where: { id },
      data: {
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.frequency !== undefined ? { frequency: dto.frequency as any } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.participants !== undefined ? { participantsJson: dto.participants as any } : {}),
      },
      include: this.includeFields(),
    });
  }

  async pause(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.recurringExpense.update({
      where: { id },
      data: { isActive: false },
      include: this.includeFields(),
    });
  }

  async resume(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.recurringExpense.update({
      where: { id },
      data: { isActive: true },
      include: this.includeFields(),
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.recurringExpense.delete({ where: { id } });
    return { message: 'Recurring expense deleted' };
  }

  /**
   * Called by the scheduler. Finds all active recurring expenses that are due,
   * creates an expense for each, then advances nextDueDate.
   */
  async processDueExpenses(): Promise<{ processed: number; errors: number }> {
    const due = await this.prisma.recurringExpense.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: new Date() },
      },
    });

    let processed = 0;
    let errors = 0;

    for (const recurring of due) {
      try {
        if (isExpired(recurring.endDate)) {
          await this.prisma.recurringExpense.update({
            where: { id: recurring.id },
            data: { isActive: false },
          });
          continue;
        }

        const rawParticipants = (recurring.participantsJson as any[]) ?? [];

        // Filter participants to current group members to avoid creating debts for removed members
        let participants = rawParticipants;
        if (recurring.groupId && rawParticipants.length > 0) {
          const currentMembers = await this.prisma.groupMember.findMany({
            where: { groupId: recurring.groupId },
            select: { userId: true },
          });
          const memberSet = new Set(currentMembers.map((m) => m.userId));
          participants = rawParticipants.filter((p: any) => memberSet.has(p.userId));
        }

        const payerId = recurring.paidById ?? recurring.createdById;
        // Ensure there is always at least the payer as participant
        if (participants.length === 0) {
          participants = [{ userId: payerId }];
        }

        await this.expensesService.create(payerId, {
          description: recurring.description,
          amount: Number(recurring.amount),
          currency: recurring.currency,
          date: recurring.nextDueDate.toISOString().slice(0, 10),
          splitMethod: recurring.splitMethod as any,
          notes: recurring.notes ?? undefined,
          groupId: recurring.groupId ?? undefined,
          categoryId: recurring.categoryId ?? undefined,
          participants: participants,
        });

        const next = computeNextDate(recurring.nextDueDate, recurring.frequency as RecurringFrequency);
        const shouldDeactivate = recurring.endDate != null && next > recurring.endDate;

        await this.prisma.recurringExpense.update({
          where: { id: recurring.id },
          data: {
            nextDueDate: next,
            ...(shouldDeactivate ? { isActive: false } : {}),
          },
        });

        processed++;
        this.logger.log(`Created recurring expense "${recurring.description}" (id: ${recurring.id})`);
      } catch (err: any) {
        errors++;
        this.logger.error(`Failed to process recurring expense ${recurring.id}: ${err?.message}`);
      }
    }

    return { processed, errors };
  }

  private includeFields() {
    return {
      group: { select: { id: true, name: true, currency: true } },
      category: { select: { id: true, name: true, icon: true, color: true } },
      createdBy: { select: { id: true, displayName: true, avatarUrl: true } },
    };
  }
}
