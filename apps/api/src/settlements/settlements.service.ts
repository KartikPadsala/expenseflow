import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
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
    // Guard: no self-settlement
    if (dto.settlements.some((s) => s.payeeId === payerId)) {
      throw new BadRequestException('Cannot create a settlement with yourself');
    }

    // Guard: no duplicate PENDING settlements for the same payer/payee/group
    const existingPending = await this.prisma.settlement.findMany({
      where: {
        payerId,
        payeeId: { in: dto.settlements.map((s) => s.payeeId) },
        ...(dto.groupId ? { groupId: dto.groupId } : {}),
        status: 'PENDING',
      },
      select: { payeeId: true },
    });
    if (existingPending.length > 0) {
      throw new ConflictException(
        `Pending settlements already exist for ${existingPending.length} recipient(s). Cancel them before creating new ones.`,
      );
    }

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
    if (dto.payeeId === payerId) {
      throw new BadRequestException('Cannot create a settlement with yourself');
    }

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
    if (settlement.status === 'COMPLETED') throw new ConflictException('Settlement is already completed');
    if (settlement.status === 'CANCELLED') throw new ConflictException('Cannot complete a cancelled settlement');

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
    if (settlement.status === 'CANCELLED') throw new ConflictException('Settlement is already cancelled');
    if (settlement.status === 'COMPLETED') throw new ConflictException('Cannot cancel a completed settlement');
    return this.prisma.settlement.update({ where: { id: settlementId }, data: { status: 'CANCELLED' } });
  }
}
