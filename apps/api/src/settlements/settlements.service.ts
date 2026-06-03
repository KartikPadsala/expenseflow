import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettlementDto, BulkSettleDto } from './dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationEvents, SettlementRequestedEvent, SettlementCompletedEvent } from '../notifications/events/notification.events';

@Injectable()
export class SettlementsService {
  constructor(
    private prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async bulkCreate(payerId: string, dto: BulkSettleDto) {
    return this.prisma.$transaction(
      dto.settlements.map((s) =>
        this.prisma.settlement.create({
          data: {
            payerId,
            payeeId: s.payeeId,
            amount: s.amount,
            currency: s.currency,
            method: (s.method as any) || 'CASH',
            groupId: dto.groupId,
          },
          include: {
            payer: { select: { id: true, displayName: true, avatarUrl: true } },
            payee: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        }),
      ),
    );
  }

  async create(payerId: string, dto: CreateSettlementDto) {
    const settlement = await this.prisma.settlement.create({
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

    this.eventEmitter.emit(
      NotificationEvents.SETTLEMENT_REQUESTED,
      new SettlementRequestedEvent(
        settlement.id,
        Number(settlement.amount),
        settlement.currency,
        settlement.payerId,
        (settlement.payer as any)?.displayName ?? 'Someone',
        settlement.payeeId,
      ),
    );

    return settlement;
  }

  async findAll(userId: string, groupId?: string, status?: string) {
    const where: any = {
      OR: [{ payerId: userId }, { payeeId: userId }],
    };
    if (groupId) where.groupId = groupId;
    if (status) where.status = status;

    return this.prisma.settlement.findMany({
      where,
      include: {
        payer: { select: { id: true, displayName: true, avatarUrl: true } },
        payee: { select: { id: true, displayName: true, avatarUrl: true } },
        group: { select: { id: true, name: true, currency: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(settlementId: string, userId: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        payer: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
        payee: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
        group: { select: { id: true, name: true, currency: true } },
      },
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.payerId !== userId && settlement.payeeId !== userId) {
      throw new ForbiddenException('You are not a party to this settlement');
    }
    return settlement;
  }

  async complete(settlementId: string, userId: string) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.payeeId !== userId) throw new ForbiddenException('Only payee can mark as complete');

    const completed = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'COMPLETED', settledAt: new Date() },
    });

    const payee = await this.prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    this.eventEmitter.emit(
      NotificationEvents.SETTLEMENT_COMPLETED,
      new SettlementCompletedEvent(
        completed.id,
        Number(completed.amount),
        completed.currency,
        completed.payerId,
        completed.payeeId,
        payee?.displayName ?? 'Someone',
      ),
    );

    return completed;
  }

  async cancel(settlementId: string, userId: string) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.payerId !== userId && settlement.payeeId !== userId) throw new ForbiddenException();
    return this.prisma.settlement.update({ where: { id: settlementId }, data: { status: 'CANCELLED' } });
  }
}
