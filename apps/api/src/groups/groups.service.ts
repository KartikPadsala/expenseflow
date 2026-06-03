import {
  Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto, AddMemberDto, UpdateMemberRoleDto } from './dto';
import { simplifyDebts, DebtTransaction } from '@expenseflow/shared';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEvents, GroupInviteEvent } from '../notifications/events/notification.events';

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private exchangeRatesService: ExchangeRatesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateGroupDto) {
    return this.prisma.group.create({
      data: {
        ...dto,
        createdById: userId,
        members: { create: { userId, role: 'OWNER' } },
      },
      include: { members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } } },
    });
  }

  async findAll(userId: string) {
    return this.prisma.group.findMany({
      where: { members: { some: { userId } }, isArchived: false },
      include: {
        members: { include: { user: { select: { id: true, displayName: true, avatarUrl: true } } } },
        _count: { select: { expenses: { where: { isDeleted: false } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
        _count: { select: { expenses: { where: { isDeleted: false } } } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    this.requireMembership(group, userId);
    return group;
  }

  async update(groupId: string, userId: string, dto: UpdateGroupDto) {
    await this.requireAdminOrOwner(groupId, userId);
    return this.prisma.group.update({ where: { id: groupId }, data: dto });
  }

  async archive(groupId: string, userId: string) {
    await this.requireAdminOrOwner(groupId, userId);
    return this.prisma.group.update({ where: { id: groupId }, data: { isArchived: true } });
  }

  async delete(groupId: string, userId: string) {
    await this.requireOwner(groupId, userId);
    await this.prisma.group.delete({ where: { id: groupId } });
    return { message: 'Group deleted' };
  }

  async addMember(groupId: string, requesterId: string, dto: AddMemberDto) {
    await this.requireAdminOrOwner(groupId, requesterId);
    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: dto.userId } },
    });
    if (existing) throw new ConflictException('User is already a member');

    const [group, requester, newMember] = await Promise.all([
      this.prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
      this.prisma.user.findUnique({ where: { id: requesterId }, select: { displayName: true } }),
      this.prisma.groupMember.create({
        data: { groupId, userId: dto.userId },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      }),
    ]);

    this.eventEmitter.emit(
      NotificationEvents.GROUP_INVITE,
      new GroupInviteEvent(
        groupId,
        group?.name ?? '',
        dto.userId,
        requester?.displayName ?? 'Someone',
      ),
    );

    return newMember;
  }

  async removeMember(groupId: string, requesterId: string, memberId: string) {
    await this.requireAdminOrOwner(groupId, requesterId);

    // Block removal if member has outstanding balance
    const { balances, currency } = await this.getBalances(groupId, requesterId);
    const memberBalance = balances.find((b) => b.userId === memberId);
    if (memberBalance && Math.abs(memberBalance.amount) > 0.01) {
      throw new BadRequestException(
        `Member has an outstanding balance of ${memberBalance.amount} ${currency}. Settle all debts before removing.`,
      );
    }

    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: memberId } },
    });
    return { message: 'Member removed' };
  }

  async updateMemberRole(groupId: string, requesterId: string, memberId: string, dto: UpdateMemberRoleDto) {
    await this.requireOwner(groupId, requesterId);
    return this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: memberId } },
      data: { role: dto.role },
    });
  }

  async getBalances(groupId: string, userId: string) {
    const group = await this.findOne(groupId, userId);
    const groupCurrency = (group as any).currency ?? 'USD';

    const expenses = await this.prisma.expense.findMany({
      where: { groupId, isDeleted: false },
      include: { participants: true },
    });

    const balanceMap = new Map<string, Map<string, number>>();
    const ensureEntry = (from: string, to: string) => {
      if (!balanceMap.has(from)) balanceMap.set(from, new Map());
      if (!balanceMap.get(from)!.has(to)) balanceMap.get(from)!.set(to, 0);
    };

    for (const expense of expenses) {
      const expenseCurrency = expense.currency;

      for (const participant of expense.participants) {
        if (participant.userId === expense.paidById) continue;

        let owed = Number(participant.owedAmount) - Number(participant.paidAmount);
        if (owed <= 0.01) continue;

        // Convert to group currency if different
        if (expenseCurrency !== groupCurrency) {
          if ((expense as any).exchangeRate && (expense as any).baseCurrency) {
            // expense.exchangeRate is expenseCurrency→baseCurrency
            if ((expense as any).baseCurrency === groupCurrency) {
              owed = Math.round(owed * Number((expense as any).exchangeRate) * 100) / 100;
            } else {
              const { convertedAmount } = await this.exchangeRatesService.convertAmount(
                owed, expenseCurrency, groupCurrency,
                expense.date.toISOString().slice(0, 10),
              );
              owed = convertedAmount;
            }
          } else {
            const { convertedAmount } = await this.exchangeRatesService.convertAmount(
              owed, expenseCurrency, groupCurrency,
              expense.date.toISOString().slice(0, 10),
            );
            owed = convertedAmount;
          }
        }

        ensureEntry(participant.userId, expense.paidById);
        const current = balanceMap.get(participant.userId)!.get(expense.paidById)!;
        balanceMap.get(participant.userId)!.set(expense.paidById, current + owed);
      }
    }

    // Collect all member IDs so we can also find group-less settlements between members
    const groupMembers = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    const memberIds = groupMembers.map((m) => m.userId);

    // Subtract completed settlements from the debt graph so balances reflect actual payments.
    // Include settlements that reference this group directly OR settlements between any two group
    // members that have no groupId (personal payments that still clear group debts).
    const completedSettlements = await this.prisma.settlement.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { groupId },
          {
            groupId: null,
            payerId: { in: memberIds },
            payeeId: { in: memberIds },
          },
        ],
      },
    });

    for (const s of completedSettlements) {
      let paid = Number(s.amount);

      // Convert settlement currency to group currency if needed
      if (s.currency !== groupCurrency) {
        const refDate = (s.settledAt ?? s.createdAt).toISOString().slice(0, 10);
        const { convertedAmount } = await this.exchangeRatesService.convertAmount(
          paid, s.currency, groupCurrency, refDate,
        );
        paid = convertedAmount;
      }

      // Reduce payer→payee debt first
      const directDebt = balanceMap.get(s.payerId)?.get(s.payeeId) ?? 0;
      if (directDebt > 0) {
        const absorbed = Math.min(directDebt, paid);
        balanceMap.get(s.payerId)!.set(s.payeeId, directDebt - absorbed);
        paid = paid - absorbed;
      }

      // Any remaining reduces the reverse debt (payee owed payer)
      if (paid > 0.01) {
        const reverseDebt = balanceMap.get(s.payeeId)?.get(s.payerId) ?? 0;
        if (reverseDebt > 0) {
          const absorbed = Math.min(reverseDebt, paid);
          ensureEntry(s.payeeId, s.payerId);
          balanceMap.get(s.payeeId)!.set(s.payerId, reverseDebt - absorbed);
          paid = paid - absorbed;
        }
      }

      // True overpayment: payer is now owed money — create a credit in reverse direction
      if (paid > 0.01) {
        ensureEntry(s.payeeId, s.payerId);
        const existingCredit = balanceMap.get(s.payeeId)!.get(s.payerId)!;
        balanceMap.get(s.payeeId)!.set(s.payerId, existingCredit + paid);
      }
    }

    const transactions: DebtTransaction[] = [];
    for (const [from, toMap] of balanceMap.entries()) {
      for (const [to, amount] of toMap.entries()) {
        if (amount > 0.01) {
          transactions.push({ from, to, amount: Math.round(amount * 100) / 100 });
        }
      }
    }

    const simplified = simplifyDebts(transactions);

    const userIds = new Set<string>();
    for (const tx of simplified) { userIds.add(tx.from); userIds.add(tx.to); }
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const enrichedSimplified = simplified.map((tx) => ({
      ...tx,
      fromUser: userMap.get(tx.from),
      toUser: userMap.get(tx.to),
    }));

    const memberNetMap = new Map<string, number>();
    for (const tx of transactions) {
      memberNetMap.set(tx.from, (memberNetMap.get(tx.from) ?? 0) - tx.amount);
      memberNetMap.set(tx.to, (memberNetMap.get(tx.to) ?? 0) + tx.amount);
    }

    // groupMembers was already fetched above — reuse it here
    const balances = groupMembers.map((m) => ({
      userId: m.userId,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
      amount: Math.round((memberNetMap.get(m.userId) ?? 0) * 100) / 100,
    }));

    return { transactions, simplified: enrichedSimplified, currency: groupCurrency, balances };
  }

  private requireMembership(group: { members: { userId: string }[] }, userId: string) {
    if (!group.members.some((m) => m.userId === userId)) {
      throw new ForbiddenException('You are not a member of this group');
    }
  }

  private async requireAdminOrOwner(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private async requireOwner(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member || member.role !== 'OWNER') {
      throw new ForbiddenException('Only group owner can perform this action');
    }
  }
}
