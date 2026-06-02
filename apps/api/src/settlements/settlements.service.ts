import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettlementDto } from './dto';

@Injectable()
export class SettlementsService {
  constructor(private prisma: PrismaService) {}

  async create(payerId: string, dto: CreateSettlementDto) {
    return this.prisma.settlement.create({
      data: {
        payerId,
        payeeId: dto.payeeId,
        amount: dto.amount,
        currency: dto.currency,
        method: (dto.method as any) || 'CASH',
        groupId: dto.groupId,
        notes: dto.notes,
      },
      include: {
        payer: { select: { id: true, displayName: true, avatarUrl: true } },
        payee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.settlement.findMany({
      where: { OR: [{ payerId: userId }, { payeeId: userId }] },
      include: {
        payer: { select: { id: true, displayName: true, avatarUrl: true } },
        payee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async complete(settlementId: string, userId: string) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.payeeId !== userId) throw new ForbiddenException('Only payee can mark as complete');
    return this.prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'COMPLETED', settledAt: new Date() },
    });
  }

  async cancel(settlementId: string, userId: string) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.payerId !== userId && settlement.payeeId !== userId) throw new ForbiddenException();
    return this.prisma.settlement.update({ where: { id: settlementId }, data: { status: 'CANCELLED' } });
  }
}
