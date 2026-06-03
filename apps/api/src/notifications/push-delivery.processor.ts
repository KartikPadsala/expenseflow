import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';

export interface PushJobData {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  notificationType: string;
}

@Processor('push-notifications')
export class PushDeliveryProcessor {
  private readonly logger = new Logger(PushDeliveryProcessor.name);
  private readonly expo = new Expo({ useFcmV1: false });

  constructor(private readonly prisma: PrismaService) {}

  @Process('send')
  async handleSend(job: Job<PushJobData>) {
    const { userIds, title, body, data = {} } = job.data;

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, pushTokens: true },
    });

    const messages: ExpoPushMessage[] = [];
    const tokenUserMap = new Map<string, string>();

    for (const user of users) {
      for (const token of user.pushTokens ?? []) {
        if (!Expo.isExpoPushToken(token)) {
          this.logger.warn(`Invalid push token for user ${user.id}: ${token}`);
          continue;
        }
        messages.push({ to: token, title, body, data, sound: 'default' });
        tokenUserMap.set(token, user.id);
      }
    }

    if (messages.length === 0) {
      this.logger.debug(`No valid push tokens for users: ${userIds.join(', ')}`);
      return;
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const invalidTokens: string[] = [];

    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] = await this.expo.sendPushNotificationsAsync(chunk);

        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          const token = typeof chunk[i].to === 'string' ? (chunk[i].to as string) : '';

          if (ticket.status === 'error') {
            this.logger.warn(`Push error for token ${token}: ${ticket.message}`);
            if ((ticket as any).details?.error === 'DeviceNotRegistered') {
              invalidTokens.push(token);
            }
          }
        }
      } catch (err: any) {
        this.logger.error(`Expo chunk send failed: ${err?.message}`);
        throw err;
      }
    }

    if (invalidTokens.length > 0) {
      for (const token of invalidTokens) {
        const userId = tokenUserMap.get(token);
        if (!userId) continue;
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { pushTokens: true } });
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            pushTokens: {
              set: user?.pushTokens?.filter((t) => t !== token) ?? [],
            },
          },
        });
        this.logger.log(`Removed invalid push token for user ${userId}`);
      }
    }

    this.logger.log(`Sent ${messages.length} push notifications`);
  }
}
