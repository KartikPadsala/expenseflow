import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, displayName: true,
        avatarUrl: true, role: true, isEmailVerified: true,
        defaultCurrency: true, language: true, timezone: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, email: true, username: true, displayName: true,
        avatarUrl: true, defaultCurrency: true, language: true, timezone: true,
      },
    });
  }

  async deleteMe(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    return { message: 'Account deactivated' };
  }

  async search(query: string, currentUserId: string) {
    if (!query || query.length < 2) return [];
    return this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { isActive: true },
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true, email: true },
      take: 20,
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const key = `avatars/${userId}/${Date.now()}-${file.originalname}`;
    const url = await this.storageService.uploadFile(key, file.buffer, file.mimetype);
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } });
    return { avatarUrl: url };
  }
}
