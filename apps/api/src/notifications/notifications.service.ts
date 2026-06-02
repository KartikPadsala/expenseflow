import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

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

  async create(userId: string, type: string, title: string, body: string, data?: Record<string, unknown>) {
    return this.prisma.notification.create({
      data: { userId, type: type as any, title, body, ...(data ? { data: data as any } : {}) },
    });
  }

  async registerPushToken(userId: string, token: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushTokens: { push: token } },
    });
    return { message: 'Push token registered' };
  }
}
