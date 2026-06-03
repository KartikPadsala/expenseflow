import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  /**
   * Global search across expenses, groups, and users.
   * Returns up to `limit` results per category.
   */
  async globalSearch(userId: string, query: string, limit = 10) {
    if (!query || query.trim().length < 2) {
      return { expenses: [], groups: [], users: [] };
    }

    const q = query.trim();

    const [expenses, groups, users] = await Promise.all([
      this.searchExpenses(userId, q, limit),
      this.searchGroups(userId, q, limit),
      this.searchUsers(userId, q, limit),
    ]);

    return { expenses, groups, users, query: q };
  }

  private async searchExpenses(userId: string, q: string, limit: number) {
    return this.prisma.expense.findMany({
      where: {
        isDeleted: false,
        AND: [
          { OR: [{ paidById: userId }, { participants: { some: { userId } } }] },
          { OR: [
            { description: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
          ]},
        ],
      },
      include: {
        paidBy: { select: { id: true, displayName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, color: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  private async searchGroups(userId: string, q: string, limit: number) {
    return this.prisma.group.findMany({
      where: {
        isArchived: false,
        members: { some: { userId } },
        name: { contains: q, mode: 'insensitive' },
      },
      include: {
        members: {
          take: 4,
          include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
        },
        _count: { select: { members: true } },
      },
      take: limit,
    });
  }

  private async searchUsers(userId: string, q: string, limit: number) {
    return this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          { isActive: true },
          { OR: [
            { displayName: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ]},
        ],
      },
      select: { id: true, displayName: true, username: true, avatarUrl: true, email: true },
      take: limit,
    });
  }
}
