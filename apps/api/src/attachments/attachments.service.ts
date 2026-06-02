import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService, private storageService: StorageService) {}

  async upload(userId: string, expenseId: string, file: Express.Multer.File) {
    const key = `attachments/${expenseId}/${Date.now()}-${file.originalname}`;
    const url = await this.storageService.uploadFile(key, file.buffer, file.mimetype);
    return this.prisma.attachment.create({
      data: { expenseId, uploadedById: userId, fileName: file.originalname, fileSize: file.size, mimeType: file.mimetype, storageKey: key, url },
    });
  }

  async delete(id: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.uploadedById !== userId) throw new ForbiddenException();
    await this.storageService.deleteFile(attachment.storageKey);
    await this.prisma.attachment.delete({ where: { id } });
    return { message: 'Attachment deleted' };
  }
}
