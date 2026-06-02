import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: { OR: [{ isDefault: true }, { userId }] },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async create(userId: string, data: { name: string; icon: string; color: string }) {
    return this.prisma.category.create({ data: { ...data, userId } });
  }

  async update(id: string, userId: string, data: Partial<{ name: string; icon: string; color: string }>) {
    return this.prisma.category.updateMany({ where: { id, userId }, data });
  }

  async delete(id: string, userId: string) {
    await this.prisma.category.deleteMany({ where: { id, userId, isDefault: false } });
    return { message: 'Category deleted' };
  }
}
