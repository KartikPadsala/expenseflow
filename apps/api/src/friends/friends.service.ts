import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FriendsService {
  constructor(private prisma: PrismaService, private mailService: MailService) {}

  async sendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) throw new ConflictException('Cannot add yourself');
    const existing = await this.prisma.friendship.findFirst({
      where: { OR: [{ requesterId, addresseeId }, { requesterId: addresseeId, addresseeId: requesterId }] },
    });
    if (existing) throw new ConflictException('Friend request already exists');
    return this.prisma.friendship.create({
      data: { requesterId, addresseeId },
      include: { addressee: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
  }

  async accept(friendshipId: string, userId: string) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) throw new NotFoundException('Friend request not found');
    if (friendship.addresseeId !== userId) throw new ForbiddenException('Not authorized');
    return this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
    });
  }

  async decline(friendshipId: string, userId: string) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship) throw new NotFoundException('Friend request not found');
    if (friendship.addresseeId !== userId) throw new ForbiddenException('Not authorized');
    await this.prisma.friendship.delete({ where: { id: friendshipId } });
    return { message: 'Friend request declined' };
  }

  async remove(friendshipId: string, userId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: { id: friendshipId, OR: [{ requesterId: userId }, { addresseeId: userId }] },
    });
    if (!friendship) throw new NotFoundException('Friendship not found');
    await this.prisma.friendship.delete({ where: { id: friendshipId } });
    return { message: 'Friend removed' };
  }

  async block(friendshipId: string, userId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: { id: friendshipId, OR: [{ requesterId: userId }, { addresseeId: userId }] },
    });
    if (!friendship) throw new NotFoundException('Friendship not found');
    return this.prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'BLOCKED' } });
  }

  async getFriends(userId: string) {
    return this.prisma.friendship.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
        addressee: { select: { id: true, displayName: true, avatarUrl: true, email: true } },
      },
    });
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      include: { requester: { select: { id: true, displayName: true, avatarUrl: true, email: true } } },
    });
  }

  async inviteByEmail(userId: string, email: string) {
    const inviter = await this.prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    const token = uuidv4();
    await this.mailService.sendGroupInviteEmail(email, inviter?.displayName || 'Someone', 'ExpenseFlow', token);
    return { message: 'Invitation sent' };
  }
}
