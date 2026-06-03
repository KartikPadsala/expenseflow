import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationEvents,
  ExpenseCreatedEvent,
  ExpenseUpdatedEvent,
  ExpenseDeletedEvent,
  GroupInviteEvent,
  SettlementRequestedEvent,
  SettlementCompletedEvent,
} from './events/notification.events';
import type { PushJobData } from './push-delivery.processor';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('push-notifications') private readonly pushQueue: Queue,
  ) {}

  // ─── DB CRUD ──────────────────────────────────────────────────────────────

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data, total, unread, page, limit };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  async delete(id: string, userId: string) {
    await this.prisma.notification.deleteMany({ where: { id, userId } });
    return { message: 'Notification deleted' };
  }

  async registerPushToken(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { pushTokens: true } });
    const existing = user?.pushTokens ?? [];
    if (!existing.includes(token)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { pushTokens: { push: token } },
      });
    }
    return { message: 'Push token registered' };
  }

  async deregisterPushToken(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { pushTokens: true } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushTokens: { set: (user?.pushTokens ?? []).filter((t) => t !== token) } },
    });
    return { message: 'Push token removed' };
  }

  // ─── CORE: Create notification + enqueue push ─────────────────────────────

  async createAndPush(
    userIds: string[],
    type: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ): Promise<void> {
    if (userIds.length === 0) return;

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: type as any,
        title,
        body,
        data: data as any,
      })),
    });

    await this.pushQueue.add(
      'send',
      { userIds, title, body, data, notificationType: type } satisfies PushJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  }

  // ─── EVENT LISTENERS ──────────────────────────────────────────────────────

  @OnEvent(NotificationEvents.EXPENSE_CREATED)
  async onExpenseCreated(event: ExpenseCreatedEvent) {
    try {
      const recipients = event.participantIds.filter((id) => id !== event.paidById);
      if (recipients.length === 0) return;

      const payer = await this.prisma.user.findUnique({
        where: { id: event.paidById },
        select: { displayName: true },
      });

      await this.createAndPush(
        recipients,
        'EXPENSE_ADDED',
        'New expense added',
        `${payer?.displayName ?? 'Someone'} added "${event.description}" (${event.currency} ${event.amount.toFixed(2)})`,
        { expenseId: event.expenseId, groupId: event.groupId ?? '', screen: 'expense' },
      );
    } catch (err: any) {
      this.logger.error(`onExpenseCreated failed: ${err?.message}`);
    }
  }

  @OnEvent(NotificationEvents.EXPENSE_UPDATED)
  async onExpenseUpdated(event: ExpenseUpdatedEvent) {
    try {
      const recipients = event.participantIds.filter((id) => id !== event.updatedById);
      if (recipients.length === 0) return;

      const updater = await this.prisma.user.findUnique({
        where: { id: event.updatedById },
        select: { displayName: true },
      });

      await this.createAndPush(
        recipients,
        'EXPENSE_EDITED',
        'Expense updated',
        `${updater?.displayName ?? 'Someone'} updated "${event.description}"`,
        { expenseId: event.expenseId, groupId: event.groupId ?? '', screen: 'expense' },
      );
    } catch (err: any) {
      this.logger.error(`onExpenseUpdated failed: ${err?.message}`);
    }
  }

  @OnEvent(NotificationEvents.EXPENSE_DELETED)
  async onExpenseDeleted(event: ExpenseDeletedEvent) {
    try {
      const recipients = event.participantIds.filter((id) => id !== event.deletedById);
      if (recipients.length === 0) return;

      const deleter = await this.prisma.user.findUnique({
        where: { id: event.deletedById },
        select: { displayName: true },
      });

      await this.createAndPush(
        recipients,
        'EXPENSE_DELETED',
        'Expense deleted',
        `${deleter?.displayName ?? 'Someone'} deleted "${event.description}"`,
        { screen: 'expenses' },
      );
    } catch (err: any) {
      this.logger.error(`onExpenseDeleted failed: ${err?.message}`);
    }
  }

  @OnEvent(NotificationEvents.GROUP_INVITE)
  async onGroupInvite(event: GroupInviteEvent) {
    try {
      await this.createAndPush(
        [event.invitedUserId],
        'GROUP_INVITE',
        'Group invitation',
        `${event.invitedByName} invited you to join "${event.groupName}"`,
        { groupId: event.groupId, screen: 'group' },
      );
    } catch (err: any) {
      this.logger.error(`onGroupInvite failed: ${err?.message}`);
    }
  }

  @OnEvent(NotificationEvents.SETTLEMENT_REQUESTED)
  async onSettlementRequested(event: SettlementRequestedEvent) {
    try {
      await this.createAndPush(
        [event.payeeId],
        'SETTLEMENT_REQUEST',
        'Settlement request',
        `${event.payerName} sent you a settlement of ${event.currency} ${event.amount.toFixed(2)}`,
        { settlementId: event.settlementId, screen: 'settlement' },
      );
    } catch (err: any) {
      this.logger.error(`onSettlementRequested failed: ${err?.message}`);
    }
  }

  @OnEvent(NotificationEvents.SETTLEMENT_COMPLETED)
  async onSettlementCompleted(event: SettlementCompletedEvent) {
    try {
      await this.createAndPush(
        [event.payerId],
        'SETTLEMENT_COMPLETED',
        'Settlement completed',
        `${event.payeeName} confirmed your payment of ${event.currency} ${event.amount.toFixed(2)}`,
        { settlementId: event.settlementId, screen: 'settlement' },
      );
    } catch (err: any) {
      this.logger.error(`onSettlementCompleted failed: ${err?.message}`);
    }
  }
}
