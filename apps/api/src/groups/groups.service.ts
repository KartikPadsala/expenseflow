import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto, AddMemberDto, UpdateMemberRoleDto } from './dto';
import { simplifyDebts, DebtTransaction } from '@expenseflow/shared';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.groupMember.create({
      data: { groupId, userId: dto.userId },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async removeMember(groupId: string, requesterId: string, memberId: string) {
    await this.requireAdminOrOwner(groupId, requesterId);
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
    await this.findOne(groupId, userId);
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
      for (const participant of expense.participants) {
        if (participant.userId === expense.paidById) continue;
        const owed = Number(participant.owedAmount) - Number(participant.paidAmount);
        if (owed > 0.01) {
          ensureEntry(participant.userId, expense.paidById);
          const current = balanceMap.get(participant.userId)!.get(expense.paidById)!;
          balanceMap.get(participant.userId)!.set(expense.paidById, current + owed);
        }
      }
    }

    const transactions: DebtTransaction[] = [];
    for (const [from, toMap] of balanceMap.entries()) {
      for (const [to, amount] of toMap.entries()) {
        if (amount > 0.01) transactions.push({ from, to, amount });
      }
    }

    return { transactions, simplified: simplifyDebts(transactions) };
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
